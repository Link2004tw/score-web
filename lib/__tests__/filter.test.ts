import { describe, it, expect } from "vitest";
import { filterStudents } from "../filter";
import type { StoredChild } from "../store";

const students: StoredChild[] = [
  {
    id: "1",
    name: "Alice Smith",
    grade: "5 primary",
    gender: "female",
    score: 95,
    createdAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "2",
    name: "Bob Jones",
    grade: "3 primary",
    gender: "male",
    score: 82,
    createdAt: "2025-01-02T00:00:00Z",
  },
  {
    id: "3",
    name: "Charlie Brown",
    grade: "5 primary",
    gender: "male",
    score: 78,
    createdAt: "2025-01-03T00:00:00Z",
  },
  {
    id: "4",
    name: "Diana Prince",
    grade: "kg2",
    gender: "female",
    score: 100,
    createdAt: "2025-01-04T00:00:00Z",
  },
  {
    id: "5",
    name: "Edward Norton",
    grade: "1 primary",
    gender: "male",
    score: 88,
    createdAt: "2025-01-05T00:00:00Z",
  },
];

describe("filterStudents", () => {
  it("returns all students when no filters are applied", () => {
    const result = filterStudents(students, {});
    expect(result).toHaveLength(5);
    expect(result).toEqual(students);
  });

  describe("search filter", () => {
    it("filters by name (case-insensitive)", () => {
      const result = filterStudents(students, { search: "alice" });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Alice Smith");
    });

    it("filters by partial name match", () => {
      const result = filterStudents(students, { search: "b" });
      expect(result).toHaveLength(2);
      expect(result.map((s) => s.name).sort()).toEqual([
        "Bob Jones",
        "Charlie Brown",
      ]);
    });

    it("is case-insensitive", () => {
      const result = filterStudents(students, { search: "ALICE" });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Alice Smith");
    });

    it("returns empty array when no name matches", () => {
      const result = filterStudents(students, { search: "xyzzy" });
      expect(result).toHaveLength(0);
    });

    it("returns all students when search is empty string", () => {
      const result = filterStudents(students, { search: "" });
      expect(result).toHaveLength(5);
    });
  });

  describe("gender filter", () => {
    it("filters by male", () => {
      const result = filterStudents(students, { gender: "male" });
      expect(result).toHaveLength(3);
      expect(result.every((s) => s.gender === "male")).toBe(true);
    });

    it("filters by female", () => {
      const result = filterStudents(students, { gender: "female" });
      expect(result).toHaveLength(2);
      expect(result.every((s) => s.gender === "female")).toBe(true);
    });
  });

  describe("grade filter", () => {
    it("filters by grade", () => {
      const result = filterStudents(students, { grade: "5 primary" });
      expect(result).toHaveLength(2);
      expect(result.every((s) => s.grade === "5 primary")).toBe(true);
    });

    it("returns empty for non-existent grade", () => {
      const result = filterStudents(students, { grade: "6 primary" });
      expect(result).toHaveLength(0);
    });
  });

  describe("combined filters", () => {
    it("combines search + gender + grade", () => {
      const result = filterStudents(students, {
        search: "b",
        gender: "male",
        grade: "5 primary",
      });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Charlie Brown");
    });

    it("returns empty when filters contradict", () => {
      const result = filterStudents(students, {
        search: "Alice",
        gender: "male",
      });
      expect(result).toHaveLength(0);
    });
  });

  describe("edge cases", () => {
    it("handles empty array", () => {
      const result = filterStudents([], { search: "Alice" });
      expect(result).toHaveLength(0);
    });

    it("handles undefined filter values", () => {
      const result = filterStudents(students, {
        search: undefined,
        gender: undefined,
        grade: undefined,
      });
      expect(result).toHaveLength(5);
    });

    it("gracefully handles null search (short-circuits, returns all)", () => {
      // @ts-expect-error - testing runtime behavior
      const result = filterStudents(students, { search: null });
      // null is falsy so the search check short-circuits, all students pass through
      expect(result).toHaveLength(5);
    });
  });
});
