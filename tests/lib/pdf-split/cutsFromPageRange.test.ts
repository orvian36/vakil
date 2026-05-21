import { describe, it, expect } from "vitest";
import { applyPageRangeEdit } from "@/lib/pdf-split/cutsFromPageRange";
import type { Segment } from "@/components/pdf-split/types";

function seg(id: string, fromPage: number, toPage: number, extras: Partial<Segment> = {}): Segment {
  return { id, fromPage, toPage, name: "", category: "", ...extras };
}

describe("applyPageRangeEdit", () => {
  const totalPages = 10;

  it("edits the 'to' page and shifts the next segment's 'from'", () => {
    const segments: Segment[] = [seg("a", 1, 3), seg("b", 4, 7), seg("c", 8, 10)];
    const cuts = new Set<number>([3, 7]);
    const result = applyPageRangeEdit(segments, cuts, "a", 1, 5, totalPages);
    expect(result.error).toBeUndefined();
    expect(Array.from(result.cuts).sort((x, y) => x - y)).toEqual([5, 7]);
    expect(result.segments).toEqual([
      expect.objectContaining({ id: "a", fromPage: 1, toPage: 5 }),
      expect.objectContaining({ fromPage: 6, toPage: 7 }),
      expect.objectContaining({ fromPage: 8, toPage: 10 }),
    ]);
  });

  it("edits the 'from' page and shifts the prior segment's 'to'", () => {
    const segments: Segment[] = [seg("a", 1, 3), seg("b", 4, 7), seg("c", 8, 10)];
    const cuts = new Set<number>([3, 7]);
    const result = applyPageRangeEdit(segments, cuts, "b", 5, 7, totalPages);
    expect(result.error).toBeUndefined();
    expect(Array.from(result.cuts).sort((x, y) => x - y)).toEqual([4, 7]);
  });

  it("rejects from > to", () => {
    const segments: Segment[] = [seg("a", 1, 10)];
    const cuts = new Set<number>();
    const result = applyPageRangeEdit(segments, cuts, "a", 5, 3, totalPages);
    expect(result.error).toMatch(/from.*greater.*to/i);
    expect(Array.from(result.cuts)).toEqual([]);
  });

  it("rejects from < 1", () => {
    const segments: Segment[] = [seg("a", 1, 10)];
    const cuts = new Set<number>();
    const result = applyPageRangeEdit(segments, cuts, "a", 0, 10, totalPages);
    expect(result.error).toMatch(/at least 1/i);
  });

  it("rejects to > totalPages", () => {
    const segments: Segment[] = [seg("a", 1, 10)];
    const cuts = new Set<number>();
    const result = applyPageRangeEdit(segments, cuts, "a", 1, 11, totalPages);
    expect(result.error).toMatch(/exceed.*10/i);
  });

  it("rejects collision with prior segment", () => {
    // Editing 'b' from=4→3 would collide with 'a' which already ends at 3
    const segments: Segment[] = [seg("a", 1, 3), seg("b", 4, 7)];
    const cuts = new Set<number>([3]);
    const result = applyPageRangeEdit(segments, cuts, "b", 3, 7, totalPages);
    expect(result.error).toMatch(/overlap|prior|previous/i);
  });

  it("preserves names + categories on adjacent segments", () => {
    const segments: Segment[] = [
      seg("a", 1, 3, { name: "Cover", category: "k1" }),
      seg("b", 4, 7, { name: "Body",  category: "k2" }),
    ];
    const cuts = new Set<number>([3]);
    const result = applyPageRangeEdit(segments, cuts, "a", 1, 5, totalPages);
    expect(result.error).toBeUndefined();
    expect(result.segments[0].name).toBe("Cover");
    expect(result.segments[0].category).toBe("k1");
    expect(result.segments[1].name).toBe("Body");
    expect(result.segments[1].category).toBe("k2");
  });
});
