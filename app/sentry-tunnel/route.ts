import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "development") {
    return NextResponse.json({ ok: true });
  }

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("o");
  const projectId = searchParams.get("p");
  const region = searchParams.get("r");

  if (!orgId || !projectId) {
    return NextResponse.json({ error: "missing orgId or projectId" }, { status: 400 });
  }

  const host = region ? `o${orgId}.ingest.${region}.sentry.io` : `o${orgId}.ingest.sentry.io`;

  const upstream = await fetch(`https://${host}/api/${projectId}/envelope/`, {
    method: "POST",
    body: await request.arrayBuffer(),
    headers: {
      "Content-Type": request.headers.get("Content-Type") || "application/x-sentry-envelope",
    },
  });

  return new NextResponse(upstream.body, { status: upstream.status });
}
