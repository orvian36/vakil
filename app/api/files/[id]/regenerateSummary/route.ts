import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { files } from '@/db/schema';
import { eq } from 'drizzle-orm';
import PDFAnalysisService from '@/services/pdfAnalysisService';
import { getDownloadUrl } from '@/lib/storage/urls';
import { cookies } from 'next/headers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fileId } = await params;
    
    if (!fileId) {
      return NextResponse.json(
        { success: false, error: 'File ID is required' },
        { status: 400 }
      );
    }

    // Get access token from cookies
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;
    
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'No access token found. Please log in again.' },
        { status: 401 }
      );
    }

    // Get the file from database
    const file = await db
      .select()
      .from(files)
      .where(eq(files.id, fileId))
      .limit(1);

    if (file.length === 0) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }

    const fileRecord = file[0];

    // Get the PDF download URL directly using the storage service
    const downloadUrl = await getDownloadUrl(fileRecord.fileKey);
    
    if (!downloadUrl) {
      return NextResponse.json(
        { success: false, error: 'Failed to get PDF download URL' },
        { status: 500 }
      );
    }

    // Parse request body for custom instructions
    const body = await request.json();
    const customInstructions = body.instructions || '';

    // Create analysis service instance
    const pdfAnalysisService = new PDFAnalysisService();

    // Analyze the PDF with custom instructions
    const analysisResult = await pdfAnalysisService.analyzePDF(downloadUrl, customInstructions, accessToken);

    if (!analysisResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: analysisResult.error || 'Failed to analyze PDF' 
        },
        { status: 500 }
      );
    }
    //console.log('Analysis result:', analysisResult);
    //console.log("custom instructions:", customInstructions);

    const summary = analysisResult.summary;

    // Update the file summary in database
    await db
      .update(files)
      .set({
        summary: summary,
        updatedAt: new Date().toISOString()
      })
      .where(eq(files.id, fileId));

    return NextResponse.json({
      success: true,
      summary: summary,
      message: 'Summary regenerated successfully'
    });

  } catch (error) {
    console.error('Error regenerating summary:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}