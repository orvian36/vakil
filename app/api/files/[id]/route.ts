import { NextRequest, NextResponse } from "next/server";
import { FileService } from "@/services/fileService";
import { prisma } from "@/lib/db";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await FileService.deleteFile(id);
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { summary } = body;

    if (summary === undefined) {
      return NextResponse.json({ error: "Summary is required" }, { status: 400 });
    }

    await prisma.file.update({ where: { id }, data: { summary } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating file summary:", error);
    return NextResponse.json({ error: "Failed to update file summary" }, { status: 500 });
  }
}
