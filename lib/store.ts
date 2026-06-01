import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  getDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Child, gradeValues } from "./schemas";

const COLLECTION = "children";

export interface StoredChild extends Child {
  id: string;
  createdAt: string;
}

export function fromFirestore(data: Record<string, unknown>, id: string): StoredChild {
  return {
    id,
    name: data.name as string,
    grade: data.grade as (typeof gradeValues)[number],
    gender: data.gender as "male" | "female",
    score: Number(data.score) || 0,
    createdAt: (data.createdAt as string) ?? new Date().toISOString(),
  };
}

export async function addChild(child: Child): Promise<StoredChild> {
  const data = {
    ...child,
    createdAt: new Date().toISOString(),
  };
  const ref = await addDoc(collection(db, COLLECTION), data);
  return fromFirestore({ ...data, id: ref.id }, ref.id);
}

export async function getChildren(): Promise<StoredChild[]> {
  const q = query(collection(db, COLLECTION), orderBy("score", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => fromFirestore(d.data(), d.id));
}

export async function getChildById(id: string): Promise<StoredChild | undefined> {
  const ref = doc(db, COLLECTION, id);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return undefined;
  return fromFirestore(snapshot.data(), snapshot.id);
}

export async function updateChild(id: string, updates: Partial<Child>): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, updates);
}

export async function deleteChild(id: string): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await deleteDoc(ref);
}
