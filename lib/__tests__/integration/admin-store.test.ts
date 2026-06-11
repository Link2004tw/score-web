import { describe, it, expect, beforeEach } from "vitest";
import { adminDb } from "@/lib/firebase-admin";
import {
  addChild,
  getChildById,
  getChildren,
  updateChild,
  deleteChild,
  getAttendanceSession,
} from "@/lib/admin-store";
import type { Child } from "@/lib/schemas";

async function wipeCollections() {
  for (const col of ["children", "attendance-sessions"]) {
    const snapshot = await adminDb.collection(col).get();
    if (snapshot.size > 0) {
      const batch = adminDb.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
  }
}

const validChild: Child = {
  name: "Test Student",
  grade: "kg1",
  gender: "male",
  score: 0,
};

describe("admin-store — emulator integration", () => {
  beforeEach(async () => {
    await wipeCollections();
  });

  it("addChild + getChildById — round-trip", async () => {
    const created = await addChild(validChild);

    expect(created.id).toBeTruthy();
    expect(created.name).toBe("Test Student");
    expect(created.grade).toBe("kg1");
    expect(created.gender).toBe("male");
    expect(created.score).toBe(0);
    expect(created.createdAt).toBeTruthy();
    expect(typeof created.createdAt).toBe("string");
    expect(created.normalAttendance).toBe(0);
    expect(created.choirAttendance).toBe(0);
    expect(created.choirMisses).toBe(0);
    expect(created.choirStatus).toBe("active");

    const readBack = await getChildById(created.id);
    expect(readBack).toBeDefined();
    expect(readBack!.id).toBe(created.id);
    expect(readBack!.name).toBe("Test Student");
  });

  it("getChildById — returns undefined for missing doc", async () => {
    const result = await getChildById("non-existent-id");
    expect(result).toBeUndefined();
  });

  it("getChildren — returns empty when no children exist", async () => {
    const result = await getChildren();
    expect(result.children).toEqual([]);
    expect(result.hasMore).toBe(false);
  });

  it("getChildren — returns children sorted by score descending", async () => {
    await addChild({ ...validChild, name: "Low", score: 5 });
    await addChild({ ...validChild, name: "Mid", score: 50 });
    await addChild({ ...validChild, name: "High", score: 100 });

    const result = await getChildren();
    expect(result.children).toHaveLength(3);
    expect(result.children[0].name).toBe("High");
    expect(result.children[0].score).toBe(100);
    expect(result.children[1].name).toBe("Mid");
    expect(result.children[1].score).toBe(50);
    expect(result.children[2].name).toBe("Low");
    expect(result.children[2].score).toBe(5);
    expect(result.hasMore).toBe(false);
  });

  it("getChildren — pagination with limit and startAfter", async () => {
    for (let i = 1; i <= 5; i++) {
      await addChild({ ...validChild, name: `Student ${i}`, score: i * 10 });
    }

    const page1 = await getChildren({ limit: 2 });
    expect(page1.children).toHaveLength(2);
    expect(page1.hasMore).toBe(true);
    expect(page1.children[0].score).toBe(50);
    expect(page1.children[1].score).toBe(40);

    const last = page1.children[page1.children.length - 1];
    const page2 = await getChildren({
      limit: 2,
      startAfterScore: last.score,
      startAfterId: last.id,
    });
    expect(page2.children).toHaveLength(2);
    expect(page2.hasMore).toBe(true);
    expect(page2.children[0].score).toBe(30);

    const last2 = page2.children[page2.children.length - 1];
    const page3 = await getChildren({
      limit: 2,
      startAfterScore: last2.score,
      startAfterId: last2.id,
    });
    expect(page3.children).toHaveLength(1);
    expect(page3.hasMore).toBe(false);
    expect(page3.children[0].score).toBe(10);
  });

  it("updateChild — persists changes", async () => {
    const created = await addChild(validChild);

    await updateChild(created.id, { score: 99, name: "Updated Name" });

    const updated = await getChildById(created.id);
    expect(updated).toBeDefined();
    expect(updated!.score).toBe(99);
    expect(updated!.name).toBe("Updated Name");
    expect(updated!.createdAt).toBe(created.createdAt);
  });

  it("deleteChild — removes document", async () => {
    const created = await addChild(validChild);

    await deleteChild(created.id);

    const deleted = await getChildById(created.id);
    expect(deleted).toBeUndefined();
  });

  it("getAttendanceSession — returns null for missing session", async () => {
    const result = await getAttendanceSession("2099-01-01", "normal");
    expect(result).toBeNull();
  });
});
