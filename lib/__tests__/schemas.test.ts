import { describe, it, expect } from "vitest";
import { childSchema } from "../schemas";

describe("childSchema", () => {
  it("accepts valid input", () => {
    const result = childSchema.safeParse({
      name: "Alice",
      grade: "5 primary",
      gender: "female",
      score: 95,
    });
    expect(result.success).toBe(true);
  });

  it("accepts score of 0", () => {
    const result = childSchema.safeParse({
      name: "Bob",
      grade: "kg1",
      gender: "male",
      score: 0,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = childSchema.safeParse({
      name: "",
      grade: "1 primary",
      gender: "male",
      score: 50,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative score", () => {
    const result = childSchema.safeParse({
      name: "Charlie",
      grade: "3 primary",
      gender: "female",
      score: -5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid grade", () => {
    const result = childSchema.safeParse({
      name: "Diana",
      grade: "college",
      gender: "female",
      score: 80,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid gender", () => {
    const result = childSchema.safeParse({
      name: "Eve",
      grade: "2 primary",
      gender: "other",
      score: 70,
    });
    expect(result.success).toBe(false);
  });

  it("coerces string score to number", () => {
    const result = childSchema.safeParse({
      name: "Frank",
      grade: "6 primary",
      gender: "male",
      score: "75",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.score).toBe(75);
    }
  });
});
