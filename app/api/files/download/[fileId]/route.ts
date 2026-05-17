import { NextRequest, NextResponse } from "next/server";
import { getDownloadUrl } from "@/lib/storage/urls";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  try {
    const { fileId } = await params;

    if (!fileId) {
      return NextResponse.json({ success: false, error: "File ID is required" }, { status: 400 });
    }

    const file = await prisma.file.findUnique({ where: { id: fileId } });

    if (!file) {
      return NextResponse.json({ success: false, error: "File not found" }, { status: 404 });
    }

    const url = await getDownloadUrl(file.fileKey);
    return NextResponse.json({ success: true, url });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
