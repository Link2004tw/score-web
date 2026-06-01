import { NextResponse } from "next/server";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET() {
  try {
    const q = query(collection(db, "children"), orderBy("score", "desc"));
    const snapshot = await getDocs(q);
    const children = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json(children);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch children" }, { status: 500 });
  }
}
