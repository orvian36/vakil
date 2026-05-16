import { NextResponse } from "next/server";
import { getUploadUrl } from "@/lib/storage";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  const url = await getUploadUrl(key, 60 * 5); // valid 5 minutes
  return NextResponse.json({ url });
}
