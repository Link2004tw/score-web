import "server-only";
import { adminRtdb } from "./firebase-admin";

interface LogEntry {
  action: string;
  targetId?: string;
  /** Who performed the action (display name/email/etc) */
  actorDisplayName?: string;
  detail?: string;
  timestamp?: string;
}

export function writeLog(entry: LogEntry) {
  if (!adminRtdb) return;
  const ref = adminRtdb.ref("logs").push();
  ref
    .set({
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString(),
    })
    .catch((err: Error) => {
      console.error("[RTDB] Failed to write log:", err.message);
    });
}
