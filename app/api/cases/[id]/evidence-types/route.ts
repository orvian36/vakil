import { NextRequest, NextResponse } from "next/server";
import { EvidenceTypeService } from "@/services/evidenceTypeService";

// GET - Fetch evidence types for a case
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;
    
    const evidenceTypes = await EvidenceTypeService.getEvidenceTypesByCase(caseId);
    
    return NextResponse.json({
      success: true,
      data: evidenceTypes,
    });
  } catch (err: any) {
    console.error('Error fetching evidence types:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch evidence types' },
      { status: 500 }
    );
  }
}

// POST - Add a custom evidence type
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;
    const { title, description } = await req.json();
    
    if (!title || title.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }
    
    const newEvidenceType = await EvidenceTypeService.addCustomEvidenceType(
      caseId,
      title,
      description
    );
    
    return NextResponse.json({
      success: true,
      data: newEvidenceType,
    });
  } catch (err: any) {
    console.error('Error adding custom evidence type:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to add custom evidence type' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a custom evidence type
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const evidenceTypeId = searchParams.get('evidenceTypeId');
    
    if (!evidenceTypeId) {
      return NextResponse.json(
        { success: false, error: 'Evidence type ID is required' },
        { status: 400 }
      );
    }
    
    await EvidenceTypeService.deleteCustomEvidenceType(evidenceTypeId);
    
    return NextResponse.json({
      success: true,
      message: 'Evidence type deleted successfully',
    });
  } catch (err: any) {
    console.error('Error deleting evidence type:', err);
    
    // Check if it's a validation error (trying to delete default type)
    if (err.message.includes('Cannot delete default')) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to delete evidence type' },
      { status: 500 }
    );
  }
}

// PATCH - Update a custom evidence type
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params; // params must be awaited (required by Next.js 15)
    const { evidenceTypeId, title, description } = await req.json();
    
    if (!evidenceTypeId) {
      return NextResponse.json(
        { success: false, error: 'Evidence type ID is required' },
        { status: 400 }
      );
    }
    
    if (!title || title.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }
    
    const updatedEvidenceType = await EvidenceTypeService.updateCustomEvidenceType(
      evidenceTypeId,
      title,
      description
    );
    
    return NextResponse.json({
      success: true,
      data: updatedEvidenceType,
    });
  } catch (err: any) {
    console.error('Error updating evidence type:', err);
    
    // Check if it's a validation error (trying to update default type)
    if (err.message.includes('Cannot update default')) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update evidence type' },
      { status: 500 }
    );
  }
}

