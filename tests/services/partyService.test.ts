import { describe, it, expect } from "vitest";
import { testPrisma } from "../helpers/testDb";
import { PartyService } from "@/services/partyService";

async function makeCase() {
  return testPrisma.case.create({ data: { userId: "u1", title: "T", caseType: "SOC" } });
}

describe("PartyService", () => {
  it("adds, lists, updates, removes a party", async () => {
    const c = await makeCase();
    const p = await PartyService.addParty(c.id, "Alice", "plaintiff");
    expect(p.role).toBe("plaintiff");

    const all = await PartyService.listParties(c.id);
    expect(all).toHaveLength(1);

    const plaintiffs = await PartyService.listParties(c.id, "plaintiff");
    expect(plaintiffs).toHaveLength(1);
    const defendants = await PartyService.listParties(c.id, "defendant");
    expect(defendants).toHaveLength(0);

    const updated = await PartyService.updateParty(p.id, { name: "Alice II" });
    expect(updated.name).toBe("Alice II");

    await PartyService.removeParty(p.id);
    expect(await PartyService.listParties(c.id)).toHaveLength(0);
  });
});
