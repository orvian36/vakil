import { NextRequest, NextResponse } from 'next/server';
import { SocService } from '@/services/socService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { caseId, chronologyData } = body;

    if (!caseId) {
      return NextResponse.json(
        { error: 'Case ID is required' },
        { status: 400 }
      );
    }

    if (!chronologyData) {
      return NextResponse.json(
        { error: 'Chronology data is required' },
        { status: 400 }
      );
    }

    // Update the SOC analysis with chronology data using caseId directly
    const updatedSocAnalysis = await SocService.upsertSocAnalysis(caseId, { chronologyMarkdown: chronologyData });

    return NextResponse.json({
      success: true,
      message: 'Chronology saved successfully',
      data: {
        caseId: caseId,
        chronologyData: updatedSocAnalysis.chronologyMarkdown
      }
    });

  } catch (error) {
    console.error('Error saving chronology:', error);
    return NextResponse.json(
      { 
        error: 'Failed to save chronology',
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
    const socAnalysis = await SocService.getSocAnalysis(caseId);

    if (!socAnalysis) {
      return NextResponse.json(
        { error: 'No SOC analysis found for this case' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        chronologyData: socAnalysis.chronologyMarkdown || null
      }
    });

  } catch (error) {
    console.error('Error fetching chronology:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch chronology',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}