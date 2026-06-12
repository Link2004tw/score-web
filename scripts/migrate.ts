/**
 * Migration script: Excel (.xlsx) → Firebase Firestore + RTDB
 *
 * Reads a multi-sheet Excel workbook where each sheet contains:
 *   Col A: Grade (e.g. "1/B", "KG2/G")
 *   Col B: Name (student name)
 *   Col C+: Dates as "day/Month" headers (e.g. "5/1" = 5 Jan 2026), scores in cells
 *
 * Usage:
 *   npx tsx scripts/migrate.ts <path-to-xlsx-file>
 *
 * Loads FIREBASE_ADMIN_* variables from .env (fallback to .env.local).
 * Runs idempotently: skips children already in Firestore (matched by name+grade).
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import * as XLSX from "xlsx";
import admin from "firebase-admin";

// ─── Env loader ────────────────────────────────────────────────────────────────

function loadEnv(): void {
  const paths = [resolve(process.cwd(), ".env"), resolve(process.cwd(), ".env.local")];
  const envPath = paths.find(existsSync);
  if (!envPath) {
    console.warn("⚠  No .env or .env.local found at project root");
    return;
  }
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnv();

// ─── Grade/gender mapping ──────────────────────────────────────────────────────

const GRADE_MAP: Record<string, string> = {
  KG1: "kg1",
  KG2: "kg2",
  "1": "1 primary",
  "2": "2 primary",
  "3": "3 primary",
  "4": "4 primary",
  "5": "5 primary",
  "6": "6 primary",
  "4Y": "4 years",
  "5Y": "5 years",
  "4 YEARS": "4 years",
  "5 YEARS": "5 years",
};

function inferGenderFromSheet(sheetName: string): "male" | "female" | undefined {
  const m = sheetName.match(/[BG]$/i);
  if (!m) return undefined;
  return m[0].toUpperCase() === "B" ? "male" : "female";
}

function parseGradeGender(
  value: string,
  sheetName?: string,
): { grade: string; gender?: "male" | "female" } | null {
  const cleaned = String(value).trim();
  if (!cleaned) return null;

  // Try with /B or /G suffix (e.g. "1/B", "Kg1/G")
  const withSuffix = cleaned.match(/^(.+?)\s*\/\s*([BG])$/i);
  if (withSuffix) {
    const key = withSuffix[1].trim().toUpperCase();
    const grade = GRADE_MAP[key];
    if (!grade) return null;
    return {
      grade,
      gender: withSuffix[2].toUpperCase() === "B" ? "male" : "female",
    };
  }

  // Try without suffix — just the grade key
  const key = cleaned.toUpperCase();
  const grade = GRADE_MAP[key];
  if (!grade) return null;

  // Try to infer gender from sheet name (e.g. "1B", "KG1G")
  if (sheetName) {
    const gender = inferGenderFromSheet(sheetName);
    if (gender) return { grade, gender };
  }

  // Gender unknown — import without gender, user will fill in later
  console.warn(`   ⚠  No gender for grade "${cleaned}" — importing with empty gender (edit later)`);
  return { grade };
}

// ─── Date parsing ──────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateHeader(header: unknown): string | null {
  if (header == null) return null;

  if (header instanceof Date) {
    return formatDate(header);
  }

  if (typeof header === "number") {
    const date = new Date((header - 25569) * 86_400 * 1_000);
    return formatDate(date);
  }

  const str = String(header).trim();
  const match = str.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const date = new Date(2026, month, day);
  if (date.getDate() !== day || date.getMonth() !== month) return null;
  return formatDate(date);
}

// ─── Firebase Admin init ───────────────────────────────────────────────────────

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in .env.local`);
  return value;
}

const serviceAccount = {
  type: "service_account" as const,
  project_id: required("FIREBASE_ADMIN_PROJECT_ID"),
  private_key_id: process.env.FIREBASE_ADMIN_PRIVATE_KEY_ID ?? "",
  private_key: required("FIREBASE_ADMIN_PRIVATE_KEY").replace(/\\n/g, "\n"),
  client_email: required("FIREBASE_ADMIN_CLIENT_EMAIL"),
  client_id: process.env.FIREBASE_ADMIN_CLIENT_ID ?? "",
  auth_uri: process.env.FIREBASE_ADMIN_AUTH_URI ?? "https://accounts.google.com/o/oauth2/auth",
  token_uri: process.env.FIREBASE_ADMIN_TOKEN_URI ?? "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url:
    process.env.FIREBASE_ADMIN_AUTH_PROVIDER_X509_CERT_URL ??
    "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_ADMIN_CLIENT_X509_CERT_URL ?? "",
  universe_domain: process.env.FIREBASE_ADMIN_UNIVERSE_DOMAIN || "googleapis.com",
};

const databaseUrl = process.env.FIREBASE_ADMIN_DATABASE_URL || undefined;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    databaseURL: databaseUrl,
  });
}

const db = admin.firestore();
const rtdb = databaseUrl ? admin.database() : null;

// ─── Main ──────────────────────────────────────────────────────────────────────

type ChildData = Record<string, unknown>;

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: npx tsx scripts/migrate.ts <path-to-xlsx-file>");
    process.exit(1);
  }

  const filePath = resolve(process.cwd(), args[0]);
  console.log(`📂 Reading: ${filePath}\n`);

  // 1. Load workbook (raw: true for raw scores, date headers come as numbers)
  const workbook = XLSX.readFile(filePath);

  // 2. Fetch existing children for idempotency
  console.log("🔍 Fetching existing children…");
  const existingSnapshot = await db.collection("children").get();
  const existingKeys = new Set<string>();
  existingSnapshot.docs.forEach((doc) => {
    const d = doc.data();
    existingKeys.add(`${d.name}|${d.grade}`);
  });
  console.log(`   ${existingSnapshot.size} existing children found\n`);

  // 3. Process each sheet
  let totalImported = 0;
  let totalSkipped = 0;
  const allDateAttendees: Record<string, Record<string, string>> = {};

  for (const sheetName of workbook.SheetNames) {
    console.log(`📋 Sheet: "${sheetName}"`);
    const sheet = workbook.Sheets[sheetName];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: undefined,
    });

    if (rows.length < 2) {
      console.log("   ⚠  No data rows, skipping\n");
      continue;
    }

    const headerRow = rows[0];
    if (!headerRow || headerRow.length < 2) {
      console.log("   ⚠  No header row, skipping\n");
      continue;
    }

    const gradeColIdx = headerRow.findIndex(
      (h) =>
        String(h ?? "")
          .trim()
          .toLowerCase() === "grade",
    );
    const nameColIdx = headerRow.findIndex(
      (h) =>
        String(h ?? "")
          .trim()
          .toLowerCase() === "name",
    );

    if (gradeColIdx === -1 || nameColIdx === -1) {
      console.log("   ⚠  Could not find Grade/Name columns, skipping\n");
      continue;
    }

    const dateCols: Array<{ index: number; dateStr: string }> = [];
    for (let i = 0; i < headerRow.length; i++) {
      if (i === gradeColIdx || i === nameColIdx) continue;
      const dateStr = parseDateHeader(headerRow[i]);
      if (dateStr) {
        dateCols.push({ index: i, dateStr });
      }
    }

    console.log(
      `   Columns: Grade(col ${gradeColIdx}), Name(col ${nameColIdx}), ${dateCols.length} date columns`,
    );

    let sheetImported = 0;
    let sheetSkipped = 0;
    const batch = db.batch();
    let batchOps = 0;
    const CHUNK_SIZE = 400;

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length < 2) continue;

      const gradeRaw = String(row[gradeColIdx] ?? "").trim();
      const name = String(row[nameColIdx] ?? "").trim();

      if (!name || !gradeRaw) {
        sheetSkipped++;
        continue;
      }

      const parsed = parseGradeGender(gradeRaw, sheetName);
      if (!parsed) {
        console.warn(`   ⚠  Unrecognized grade "${gradeRaw}" for "${name}", skipping`);
        sheetSkipped++;
        continue;
      }

      const key = `${name}|${parsed.grade}`;
      if (existingKeys.has(key)) {
        sheetSkipped++;
        continue;
      }

      // Calculate total score and count attendance from date columns
      const isBooleanGrade = ["kg1", "kg2", "4 years", "5 years"].includes(parsed.grade);
      let score = 0;
      let normalAttendance = 0;
      let latestDate: string | undefined;

      for (const dc of dateCols) {
        const cellVal = row[dc.index];

        // Blank cell = absent, skip
        if (cellVal === undefined || cellVal === null || cellVal === "") continue;

        if (isBooleanGrade) {
          // Boolean-grade cells: TRUE/1/Y = present, anything else = absent
          const val = String(cellVal).trim().toUpperCase();
          if (val === "TRUE" || val === "1" || val === "YES") {
            normalAttendance++;
            latestDate = dc.dateStr;
          }
        } else {
          // Numeric-grade cells: a value (including 0) means present + score
          normalAttendance++;
          const numVal = Number(cellVal);
          if (!isNaN(numVal)) {
            score += numVal;
          } else {
            console.warn(
              `   ⚠  Non-numeric score "${String(cellVal)}" for "${name}" on ${dc.dateStr}, treating as 0`,
            );
          }
          latestDate = dc.dateStr;
        }
      }

      const childData: Record<string, unknown> = {
        name,
        grade: parsed.grade,
        gender: parsed.gender ?? "",
        score,
        normalAttendance,
        choirAttendance: 0,
        choirMisses: 0,
        choirStatus: "active",
        ...(latestDate && { lastNormalDate: latestDate }),
        createdAt: new Date().toISOString(),
      };

      const childRef = db.collection("children").doc();
      batch.set(childRef, childData);
      batchOps++;

      // Add child to date attendee maps for later session writes
      for (const dc of dateCols) {
        const cellVal = row[dc.index];
        if (cellVal === undefined || cellVal === null || cellVal === "") continue;

        if (isBooleanGrade) {
          const val = String(cellVal).trim().toUpperCase();
          if (val !== "TRUE" && val !== "1" && val !== "YES") continue;
        }

        if (!allDateAttendees[dc.dateStr]) {
          allDateAttendees[dc.dateStr] = {};
        }
        allDateAttendees[dc.dateStr][childRef.id] = name;
      }

      sheetImported++;

      if (batchOps >= CHUNK_SIZE) {
        await batch.commit();
        batchOps = 0;
        console.log(`   … ${sheetImported} processed in this sheet`);
      }
    }

    // Flush remaining child writes
    if (batchOps > 0) {
      await batch.commit();
    }

    console.log(`   ✅ ${sheetImported} imported, ${sheetSkipped} skipped\n`);
    totalImported += sheetImported;
    totalSkipped += sheetSkipped;
  }

  // 4. Write attendance-session documents
  console.log("📅 Writing attendance sessions…");
  const dateKeys = Object.keys(allDateAttendees);
  let sessionCount = 0;
  const sessionBatch = db.batch();
  let sessionBatchOps = 0;

  for (const dateStr of dateKeys) {
    const attendees = allDateAttendees[dateStr];
    const sessionRef = db.collection("attendance-sessions").doc(`${dateStr}_normal`);
    sessionBatch.set(
      sessionRef,
      {
        date: dateStr,
        type: "normal",
        attendees,
        count: Object.keys(attendees).length,
      },
      { merge: true },
    );
    sessionBatchOps++;
    sessionCount++;

    if (sessionBatchOps >= 500) {
      await sessionBatch.commit();
      sessionBatchOps = 0;
      console.log(`   … ${sessionCount} sessions written`);
    }
  }

  if (sessionBatchOps > 0) {
    await sessionBatch.commit();
  }

  console.log(`   ✅ ${sessionCount} attendance sessions written\n`);

  // 5. Log migration to RTDB
  if (rtdb) {
    console.log("📝 Writing migration log to RTDB…");
    const logRef = rtdb.ref("logs").push();
    await logRef.set({
      action: "migration",
      detail: `${totalImported} children imported, ${sessionCount} dates processed, ${totalSkipped} skipped`,
      timestamp: new Date().toISOString(),
    });
    console.log("   ✅ Log written\n");
  }

  // 6. Summary
  console.log("═══════════════════════════════════════");
  console.log("  Migration complete!");
  console.log(`  ✅  ${totalImported} children imported`);
  console.log(`  ⏭  ${totalSkipped} skipped (existing or invalid)`);
  console.log(`  📅 ${sessionCount} attendance dates processed`);
  if (rtdb) console.log("  📝 Migration logged to RTDB");
  console.log("═══════════════════════════════════════");
}

main().catch((err) => {
  console.error("\n❌ Migration failed:", err);
  process.exit(1);
});
