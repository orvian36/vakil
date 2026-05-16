import { NextRequest, NextResponse } from 'next/server';
import { getDownloadUrl } from '@/lib/storage/urls';
import { db } from '@/db';
import { files } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  try {
    const { fileId } = await params;

    if (!fileId) {
      return NextResponse.json({ success: false, error: 'File ID is required' }, { status: 400 });
    }

    console.log('File ID:', fileId);

    const file = await db.query.files.findFirst({
      where: eq(files.id, fileId),
    });

    console.log('File:', file);

    if (!file) {
      return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
    }

    const url = await getDownloadUrl(file.fileKey);
    console.log('Response:', url);

    return NextResponse.json({ success: true, url });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
