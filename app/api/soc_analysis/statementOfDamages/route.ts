import { NextRequest, NextResponse } from 'next/server';
import { SocService } from '@/services/socService';
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

    

    // Return the statement of damages data if it exists
    if (socAnalysis.statementOfDamages) {
      return NextResponse.json({
        success: true,
        data: {
          statementOfDamages: socAnalysis.statementOfDamages,
        }
      });
    }

    // Return empty response if no statement of damages data exists
    return NextResponse.json({
      success: true,
      data: null
    });

  } catch (error) {
    console.error('Error fetching statement of damages data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statement of damages data' },
      { status: 500 }
    );
  }
}

