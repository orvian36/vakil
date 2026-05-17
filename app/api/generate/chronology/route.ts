import { NextRequest, NextResponse } from "next/server";
import { chronologyGraph } from "@/lib/graph/graphs/chronology";
import { getCurrentUser } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { caseId, ocrText, userComment } = await req.json();
  if (!caseId || !ocrText) {
    return NextResponse.json({ error: "caseId and ocrText required" }, { status: 400 });
  }

  const final = await chronologyGraph.invoke({
    caseId,
    userId: user.id,
    ocrText,
    userComment,
    attempts: 0,
    valid: false,
    content: null,
  });

  if (!final.valid || !final.content) {
    return NextResponse.json(
      { error: "failed to generate valid chronology" },
      { status: 500 },
    );
  }
  return NextResponse.json({ content: final.content });
}
