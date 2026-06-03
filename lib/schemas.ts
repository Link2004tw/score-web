import { z } from "zod";

export const gradeValues = [
  "kg1",
  "kg2",
  "1 primary",
  "2 primary",
  "3 primary",
  "4 primary",
  "5 primary",
  "6 primary",
] as const;

export const childSchema = z.object({
  name: z.string().min(1, "Name is required"),
  grade: z.enum(gradeValues),
  gender: z.enum(["male", "female"]),
  score: z.coerce.number().min(0, "Score must be 0 or higher"),
});

export type Child = z.infer<typeof childSchema>;

export interface StoredChild extends Child {
  id: string;
  createdAt: string;
  normalAttendance: number;
  choirAttendance: number;
  choirMisses: number;
  choirStatus: "active" | "out";
  lastNormalDate?: string;
  lastChoirDate?: string;
}

export type AttendanceType = "normal" | "choir";

export interface AttendanceSession {
  date: string;
  type: AttendanceType;
  attendees: Record<string, string>;
  count: number;
}
