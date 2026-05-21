import { NextRequest, NextResponse } from "next/server";
import { chronologyGraph } from "@/lib/graph/graphs/chronology";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { caseId, ocrText: providedOcrText, userComment } = await req.json();
  if (!caseId) {
    return NextResponse.json({ error: "caseId required" }, { status: 400 });
  }

  let ocrText = providedOcrText;
  if (!ocrText) {
    const files = await prisma.file.findMany({
      where: { caseId },
      select: { ocrData: true },
    });
    ocrText = files.map(f => f.ocrData).filter(Boolean).join("\n\n");
  }

  if (!ocrText) {
    return NextResponse.json({ error: "ocrText could not be resolved from case files" }, { status: 400 });
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
