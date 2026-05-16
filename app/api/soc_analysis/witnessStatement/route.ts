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
        { error: 'No SOC analysis found for this case for witness statement' },
        { status: 404 }
      );
    }

    

    // Return the witness statement data if it exists
    if (socAnalysis.witnessStatement) {
      return NextResponse.json({
        success: true,
        data: {
          witnessStatement: socAnalysis.witnessStatement
        }
      });
    }

    // Return empty response if no witness statement data exists
    return NextResponse.json({
      success: true,
      data: null
    });

  } catch (error) {
    console.error('Error fetching witness statement data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch witness statement data' },
      { status: 500 }
    );
  }
}

