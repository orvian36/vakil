import type { Segment } from "@/components/pdf-split/types";

export interface PageRangeEditResult {
  cuts: Set<number>;
  segments: Segment[];
  error?: string;
}

/**
 * Apply an edit to a segment's from/to page range, returning a new cuts set and
 * recomputed segments. Returns an error string if the edit is invalid; the
 * original cuts/segments are returned unchanged in that case.
 */
export function applyPageRangeEdit(
  segments: Segment[],
  cuts: Set<number>,
  segmentId: string,
  newFromPage: number,
  newToPage: number,
  totalPages: number,
): PageRangeEditResult {
  if (!Number.isInteger(newFromPage) || !Number.isInteger(newToPage)) {
    return { cuts, segments, error: "Page numbers must be whole numbers." };
  }
  if (newFromPage < 1) {
    return { cuts, segments, error: "Page must be at least 1." };
  }
  if (newToPage > totalPages) {
    return { cuts, segments, error: `Page cannot exceed ${totalPages}.` };
  }
  if (newFromPage > newToPage) {
    return { cuts, segments, error: "'From' page cannot be greater than 'To' page." };
  }

  const index = segments.findIndex((s) => s.id === segmentId);
  if (index < 0) return { cuts, segments, error: "Segment not found." };

  const target = segments[index];
  const prior = index > 0 ? segments[index - 1] : null;
  const next = index < segments.length - 1 ? segments[index + 1] : null;

  if (prior && newFromPage <= prior.fromPage) {
    return {
      cuts,
      segments,
      error: "Range would overlap the previous segment.",
    };
  }
  if (next && newToPage >= next.toPage) {
    return {
      cuts,
      segments,
      error: "Range would overlap the next segment.",
    };
  }

  // Compute the new cut set.
  // A segment spans (cuts[i-1] + 1) .. cuts[i]. Editing fromPage replaces
  // cuts[i-1] with newFromPage - 1; editing toPage replaces cuts[i] with newToPage.
  const nextCuts = new Set(cuts);
  if (prior) {
    nextCuts.delete(prior.toPage);
    nextCuts.add(newFromPage - 1);
  }
  if (next) {
    nextCuts.delete(target.toPage);
    nextCuts.add(newToPage);
  }

  // Recompute segments from cuts, preserving carry-over metadata by id where the range matches.
  const sortedCuts = Array.from(nextCuts).sort((a, b) => a - b);
  const boundaries = [0, ...sortedCuts, totalPages];
  const out: Segment[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const fromPage = boundaries[i] + 1;
    const toPage = boundaries[i + 1];
    if (fromPage > toPage) continue;
    // Match by overlap with prior segments to preserve name/category/aiConfidence.
    const carry =
      segments.find((s) => s.fromPage <= fromPage && s.toPage >= toPage) ??
      segments.find((s) => s.fromPage === fromPage) ??
      null;
    out.push({
      id: carry?.id ?? `seg-${fromPage}-${toPage}`,
      fromPage,
      toPage,
      name: carry?.name ?? "",
      category: carry?.category ?? "",
      aiConfidence: carry?.aiConfidence,
    });
  }
  return { cuts: nextCuts, segments: out };
}
