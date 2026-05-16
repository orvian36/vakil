import { NextRequest, NextResponse } from 'next/server';
//import { SocService } from '@/services/socService';
import { db } from '@/db';
import { socAnalyses } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

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

    // First, find the case analysis record for this case
    const socAnalysise = await db.query.socAnalyses.findFirst({
      where: and(
        eq(socAnalyses.caseAnalysisId, caseId),
      ),
    }); 

    if (!socAnalysise) {
      return NextResponse.json(
        { error: 'No SOC analysis found for this case' },
        { status: 404 }
      );
    }


    // Return the pre-action letter data if it exists
    if (socAnalysise.preActionLetter) {
      return NextResponse.json({
        success: true,
        data: {
          preActionLetter: socAnalysise.preActionLetter,
        }
      });
    }

    // Return empty response if no pre-action letter data exists
    return NextResponse.json({
      success: true,
      data: null
    });

  } catch (error) {
    console.error('Error fetching pre-action letter data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pre-action letter data' },
      { status: 500 }
    );
  }
}

