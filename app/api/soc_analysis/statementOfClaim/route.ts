import { NextRequest, NextResponse } from 'next/server';
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
    const socAnalysis = await db.query.socAnalyses.findFirst({
      where: and(
        eq(socAnalyses.caseAnalysisId, caseId),
      ),
    });

    if (!socAnalysis) {
      return NextResponse.json(
        { error: 'No SOC analysis found for this case' },
        { status: 404 }
      );
    }

    

    // Return the summary data if it exists
    if (socAnalysis.statementOfClaim) {
      return NextResponse.json({
        success: true,
        data: {
          statementOfClaim: socAnalysis.statementOfClaim,
        }
      });
    }

    // Return empty response if no statement of claim data exists
    return NextResponse.json({
      success: true,
      data: null
    });

  } catch (error) {
    console.error('Error fetching statement of claim data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statement of claim data' },
      { status: 500 }
    );
  }
}

