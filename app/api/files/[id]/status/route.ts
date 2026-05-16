import { NextRequest, NextResponse } from "next/server";
import { FileService, getFileById } from "@/services/fileService";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const file = await getFileById(id);

  if (!file) {
    return new NextResponse(JSON.stringify({ error: "File not found" }), { status: 404 });
  }

  if (file.ocrData) {
    return NextResponse.json({
      ocr: true,
      documentDate: file.documentDate,
      entities: file.entities,
      status: file.processingStatus,
      error_message: file.errorMessage,
    });
  } else {
    return NextResponse.json({
      ocr: false,
      documentDate: file.documentDate,
      entities: file.entities,
      status: file.processingStatus,
      error_message: file.errorMessage,
    });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { status, errorMessage } = await req.json();
  const { id } = await params;
  const updated = await FileService.updateFileStatus(id, status, errorMessage);
  return NextResponse.json(updated);
}
