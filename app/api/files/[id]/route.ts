import { NextRequest, NextResponse } from "next/server";
import { FileService } from "@/services/fileService";
import { db } from "@/db";
import { files } from "@/db/schema";
import { eq } from "drizzle-orm";

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

    // Update the file summary in the database
    await db.update(files)
      .set({ 
        summary: summary,
        updatedAt: new Date().toISOString()
      })
      .where(eq(files.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating file summary:', error);
    return NextResponse.json({ error: "Failed to update file summary" }, { status: 500 });
  }
}
