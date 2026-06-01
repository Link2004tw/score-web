import "server-only";
import { writeLog } from "./realtime-log";

interface AuditEntry {
  action: string;
  targetId?: string;
  detail?: string;
  timestamp?: string;
}

export function auditLog(entry: AuditEntry) {
  const log = {
    ...entry,
    timestamp: entry.timestamp || new Date().toISOString(),
  };

  writeLog(log);

  if (process.env.NODE_ENV === "production") {
    console.log(JSON.stringify({ type: "audit", ...log }));
  } else {
    console.log(
      `[AUDIT] ${log.action}${log.targetId ? ` ${log.targetId}` : ""}${log.detail ? ` — ${log.detail}` : ""}`,
    );
  }
}
