import { NextRequest, NextResponse } from 'next/server';
import { SocService } from '@/services/socService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { caseId, particularsData } = body;

    if (!caseId) {
      return NextResponse.json(
        { error: 'Case ID is required' },
        { status: 400 }
      );
    }

    if (!particularsData) {
      return NextResponse.json(
        { error: 'Particulars data is required' },
        { status: 400 }
      );
    }

    // Update the SOC analysis with particulars data using caseId directly
    const updatedSocAnalysis = await SocService.upsertByCaseId(caseId, { particularsMarkdown: particularsData });

    return NextResponse.json({
      success: true,
      message: 'Particulars saved successfully',
      data: {
        caseId: caseId,
        particularsData: updatedSocAnalysis.particularsMarkdown
      }
    });

  } catch (error) {
    console.error('Error saving particulars:', error);
    return NextResponse.json(
      { 
        error: 'Failed to save particulars',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');

    if (!caseId) {
      return NextResponse.json(
        { error: 'Case ID is required' },
        { status: 400 }
      );
    }

    // Get the SOC analysis details using caseId directly
    const socAnalysis = await SocService.getByCaseId(caseId);

    if (!socAnalysis) {
      return NextResponse.json(
        { error: 'No SOC analysis found for this case' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        particularsData: socAnalysis.particularsMarkdown || null
      }
    });

  } catch (error) {
    console.error('Error fetching particulars:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch particulars',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

