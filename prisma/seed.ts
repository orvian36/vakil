import { prisma } from "@/lib/db";

async function main() {
  const c = await prisma.case.create({
    data: {
      userId: "smoke-user",
      title: "Smoke test case",
      caseType: "SOC",
      parties: { create: [{ name: "Plaintiff", role: "plaintiff", type: "person" }] },
    },
    include: { parties: true },
  });
  console.log("Seeded case:", c.id, "with", c.parties.length, "party");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    return prisma.$disconnect().then(() => process.exit(1));
  });
