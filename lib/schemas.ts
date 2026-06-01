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
  score: z.string().min(1, "Score is required"),
});

export type Child = z.infer<typeof childSchema>;
