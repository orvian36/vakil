import { NextRequest, NextResponse } from "next/server";
import PDFAnalysisService from "@/services/pdfAnalysisService";

export async function POST(request: NextRequest) {
  try {
    const { pdfUrl } = await request.json();

    if (!pdfUrl) {
      return NextResponse.json({ 
        error: "PDF URL is required" 
      }, { status: 400 });
    }

    console.log(`[API] Starting PDF analysis for: ${pdfUrl}`);

    const pdfAnalysisService = new PDFAnalysisService();
    const result = await pdfAnalysisService.analyzePDF(pdfUrl);

    if (result.success) {
      console.log(`[API] PDF analysis completed successfully`);
      
      return NextResponse.json({
        success: true,
        summary: result.summary
      });
    } else {
      console.error(`[API] PDF analysis failed:`, result.error);
      
      return NextResponse.json({
        success: false,
        error: result.error || 'PDF analysis failed'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[API] Error in PDF analysis endpoint:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: "PDF Analysis API",
    endpoints: {
      "POST /api/analyze-pdf": {
        description: "Analyze a PDF from a download URL and generate a summary",
        body: {
          pdfUrl: "string (required) - URL to the PDF file"
        }
      }
    }
  });
}
