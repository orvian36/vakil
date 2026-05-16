import { db } from "@/db"; // your drizzle db instance
import { cases, caseParties } from "@/db/schema";
import { sql } from "drizzle-orm";

const USER_ID = "d245c47a-6a46-4928-80e8-76608888485c";

function splitName(input: string): { english: string; chinese?: string } {
  const match = input.match(/^(.*?)\s*\((.*?)\)$/);
  if (match) {
    return { english: match[1].trim(), chinese: match[2].trim() };
  }
  return { english: input.trim() };
}

async function main() {
  for (let i = 1; i <= 10; i++) {
    // create case
    const [newCase] = await db
      .insert(cases)
      .values({
        userId: USER_ID,
        title: `Personal Injury Case ${i}`,
        caseType: "SOC",
        summary: `Background summary for case ${i}`,
      })
      .returning();

    // plaintiff
    const plaintiffName = splitName(`Plaintiff ${i} (原告${i})`);
    await db.insert(caseParties).values({
      caseId: newCase.id,
      name: plaintiffName.english,
      chineseName: plaintiffName.chinese,
      role: "plaintiff",
    });

    // defendants (at least 2 per case)
    for (let d = 1; d <= 2; d++) {
      const defName = splitName(`Defendant ${i}-${d} (被告${i}-${d})`);
      await db.insert(caseParties).values({
        caseId: newCase.id,
        name: defName.english,
        chineseName: defName.chinese,
        role: "defendant",
      });
    }
  }

  console.log("✅ Seed data inserted successfully");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
