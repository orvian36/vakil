import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";

// ----------------------------------------------------------------------------
// Fixtures: deliberately plausible legal text, not authentic court documents.
// Edit freely — the seed is idempotent for the demo user.
// ----------------------------------------------------------------------------

const ocrMedical = `==== PAGE 1 ====
**Saint Joseph Memorial Hospital — Discharge Summary**

Patient: Aarav Khan (DOB 1992-04-11)
MRN: 8211-4470
Admission: 14 August 2025, 09:12
Discharge: 17 August 2025, 14:30

**Mechanism of Injury:** Crush injury to right lower limb following a workplace
forklift incident at Pacific Logistics warehouse (Tsuen Wan).

**Diagnosis:** Comminuted fracture of right tibia and fibula; soft tissue contusion;
moderate concussion.

**Treatment:** Open reduction internal fixation 14 August 2025 (Dr S. Lee).
IV antibiotics x 48h. Physiotherapy initiated on day 2.

**Discharge plan:** Non-weight-bearing for 6 weeks. Follow-up at orthopaedic clinic
in 14 days. Outpatient physiotherapy 3x/week for 8 weeks. Estimated total recovery
12–16 weeks.`;

const ocrPolice = `==== PAGE 1 ====
**Incident Report — Tsuen Wan District Office**

Report No.: TWD/2025/INC-0814-22
Date / Time of Incident: 14 August 2025, 08:55 HKT
Location: Loading bay 3, Pacific Logistics Ltd warehouse, 12 Tai Lin Pai Road.

Reporting Officer: PC 47281 (M. Chan)
Witnesses interviewed: 2 (R. Singh — co-worker; J. Lai — supervisor)

**Summary:** Plaintiff was loading pallets when a forklift operated by an employee
of Pacific Logistics Ltd reversed without warning, pinning plaintiff's right leg
against a stationary pallet. Ambulance dispatched at 09:01, on scene at 09:08.
Site secured pending HSE inquiry.`;

const ocrEmployer = `==== PAGE 1 ====
**HR Letter — Pacific Logistics Ltd**

To Whom It May Concern,

This letter confirms that Mr Aarav Khan has been employed by Pacific Logistics Ltd
as a Warehouse Operative since 4 January 2023 on a full-time contract (44 hours/
week) at a base salary of HK$22,400 per month.

Mr Khan has been certified medically unfit for work from 14 August 2025 through
to the present date. He has used 12 sick-leave days; the remainder of his absence
is unpaid pending the outcome of the workplace-injury claim.

Estimated loss of earnings to 31 October 2025: HK$56,000 (gross).

Yours faithfully,
J. Wong, HR Manager`;

const particularsMarkdown = `# Particulars of Claim

## 1. Background
The Plaintiff was at all material times employed by the Defendant as a Warehouse
Operative at the Defendant's premises at 12 Tai Lin Pai Road, Tsuen Wan.

## 2. The Incident
On 14 August 2025, at approximately 08:55, the Plaintiff sustained serious injury
when a forklift truck owned and operated by the Defendant reversed into him
without warning, pinning his right lower limb against a stationary pallet.

## 3. Injuries
- Comminuted fracture of the right tibia and fibula requiring open reduction and
  internal fixation.
- Moderate concussion with associated post-concussive symptoms.
- Soft-tissue contusion to the right thigh and hip.

## 4. Treatment and Prognosis
The Plaintiff was admitted to Saint Joseph Memorial Hospital from 14 August to
17 August 2025. He remains non-weight-bearing and requires ongoing outpatient
physiotherapy three times per week. Estimated total recovery period: 12–16 weeks.

## 5. Loss of Earnings
The Plaintiff's gross monthly salary at the time of the incident was HK$22,400.
He has been certified medically unfit for work from 14 August 2025 to date, and
estimated loss of earnings to 31 October 2025 is HK$56,000.

## 6. Future Treatment
Outpatient physiotherapy is anticipated for a further 8 weeks at an estimated
total cost of HK$24,000.`;

const chronologyMarkdown = `# Chronology of Events

| Date | Event | Source |
|---|---|---|
| 2023-01-04 | Plaintiff commences employment with Defendant as Warehouse Operative | Employer letter |
| 2025-08-14, 08:55 | Forklift incident at loading bay 3, Tsuen Wan warehouse | Police report TWD/2025/INC-0814-22 |
| 2025-08-14, 09:08 | Ambulance arrives on scene | Police report |
| 2025-08-14, 09:12 | Plaintiff admitted to Saint Joseph Memorial Hospital | Discharge summary MRN 8211-4470 |
| 2025-08-14 (PM) | Open reduction internal fixation, right tibia/fibula | Discharge summary |
| 2025-08-17, 14:30 | Plaintiff discharged from hospital, non-weight-bearing for 6 weeks | Discharge summary |
| 2025-08-18 onwards | Outpatient physiotherapy commences (3x weekly) | Discharge plan |
| 2025-08-14 to date | Plaintiff certified medically unfit for work | Employer HR letter |`;

const writOfSummons = `# Writ of Summons

**IN THE HIGH COURT OF HONG KONG**
**HCPI-2025-1842**

BETWEEN:

\tAARAV KHAN ............................................................. Plaintiff

\t— and —

\tPACIFIC LOGISTICS LIMITED ........................................... Defendant

---

**TO:** The Defendant, Pacific Logistics Limited, of 12 Tai Lin Pai Road, Tsuen Wan,
New Territories.

WE COMMAND YOU that within 14 days after the service of this Writ on you, inclusive
of the day of such service, you do cause an Appearance to be entered for you in an
action at the suit of Aarav Khan.

AND TAKE NOTICE that in default of your so doing the Plaintiff may proceed therein
and judgment may be given in your absence.

The Plaintiff's claim is for damages for personal injury sustained on 14 August 2025
arising out of the negligence and/or breach of statutory duty of the Defendant, its
servants or agents, particulars of which are set out in the Statement of Claim
endorsed hereon.

Dated this ___ day of ____________ 2026.`;

const statementOfClaim = `# Statement of Claim

1. The Plaintiff was at all material times employed by the Defendant as a
   Warehouse Operative at the Defendant's premises.

2. On 14 August 2025 at approximately 08:55, the Plaintiff was working at
   loading bay 3 when a forklift truck owned and operated by the Defendant,
   driven by another employee in the course of his employment, reversed into
   the Plaintiff without warning, pinning the Plaintiff's right lower limb
   against a stationary pallet.

3. The said incident was caused by the negligence and/or breach of statutory
   duty of the Defendant, its servants or agents.

   **Particulars of Negligence:**
   - Failing to ensure that the forklift was operated with reasonable care;
   - Failing to maintain adequate audible warning devices on the forklift;
   - Failing to enforce a safe system of work for loading-bay operations;
   - Failing to provide adequate supervision of forklift operations.

4. As a result of the incident, the Plaintiff suffered the injuries set out
   in the Particulars of Injury annexed hereto, and has suffered loss and
   damage as set out in the Statement of Damages.

5. The Plaintiff claims:
   - General damages for pain, suffering, and loss of amenities;
   - Special damages for loss of earnings and medical expenses;
   - Interest pursuant to section 49 of the High Court Ordinance;
   - Costs.`;

const statementOfDamages = `# Statement of Damages

| # | Head of Loss | Amount (HK$) |
|---|---|---|
| 1 | Pain, suffering, and loss of amenities (general) | 320,000 |
| 2 | Loss of earnings to date (14 Aug — 31 Oct 2025) | 56,000 |
| 3 | Future loss of earnings (estimated, 8 weeks) | 44,800 |
| 4 | Medical and hospital expenses to date | 18,500 |
| 5 | Future physiotherapy (8 weeks × 3 sessions) | 24,000 |
| 6 | Transportation costs to/from medical appointments | 4,200 |
| 7 | Damaged personal items (safety boots, mobile phone) | 3,800 |
| **Subtotal** | | **471,300** |
| **Plus interest** under s. 49 HCO | | TBA |

**Total claim:** HK$471,300 plus interest and costs.`;

const preActionLetter = `# Pre-Action Letter

Date: 1 March 2026

To the Insurer of:
Pacific Logistics Limited
12 Tai Lin Pai Road, Tsuen Wan, New Territories

Dear Sirs,

**Re: Aarav Khan — Workplace Injury, 14 August 2025**

We act for Mr Aarav Khan in connection with personal injury sustained whilst in
the course of his employment with your insured at the above address.

The incident occurred at approximately 08:55 on 14 August 2025 at loading bay 3,
when a forklift operated by your insured's employee reversed into our client
without warning. Our client sustained a comminuted fracture of the right tibia
and fibula and moderate concussion, requiring surgery and a hospital admission
of 4 days.

Liability appears to rest on your insured pursuant to the Employees' Compensation
Ordinance and at common law for negligence and breach of statutory duty. Particulars
of negligence include failure to maintain adequate audible warning devices on the
forklift and failure to enforce a safe system of work for loading-bay operations.

We invite you to:
1. Acknowledge receipt of this letter within 14 days.
2. Confirm whether liability is admitted within 21 days thereafter.
3. Make an interim payment of HK$80,000 on account of general and special damages
   pending finalisation of the medical evidence.

In the absence of a substantive response within 35 days from the date of this
letter, we are instructed to issue proceedings without further notice.

Yours faithfully,
[Firm Name]`;

const witnessStatement = `# Witness Statement

I, Aarav Khan, of Flat 12B, 88 Kwai Yi Road, Kwai Chung, New Territories, will say
as follows:

1. I am the Plaintiff in this action. I make this statement from my own personal
   knowledge unless otherwise stated.

2. I have been employed by Pacific Logistics Limited as a Warehouse Operative
   since 4 January 2023. My usual duties involved loading and unloading
   pallets at the company's warehouse at 12 Tai Lin Pai Road, Tsuen Wan.

3. On the morning of 14 August 2025, I reported to work at 08:30 as usual. I was
   assigned to loading bay 3 and began checking off pallets against the delivery
   manifest for the 09:00 outbound truck.

4. At approximately 08:55, I was standing immediately behind a stationary pallet,
   facing away from the bay, marking the inventory sheet on a clipboard. I heard
   no reverse beeper and saw no warning lights.

5. Without warning, a forklift driven by another colleague reversed at speed and
   collided with the back of the pallet, pinning my right leg between the pallet
   and a steel upright. I felt immediate and severe pain in my lower leg and lost
   my footing.

6. I called out and my supervisor, Mr J. Lai, attended within seconds and called
   for medical assistance. An ambulance arrived at around 09:08. I was taken to
   Saint Joseph Memorial Hospital where I underwent surgery later that day.

7. Since the incident I have been unable to return to work. I have attended
   physiotherapy three times per week and continue to experience pain when bearing
   weight on the affected leg.

8. I confirm that the contents of this statement are true to the best of my
   knowledge and belief.

Signed: _______________________
Aarav Khan
Dated this ___ day of ____________ 2026.`;

const witnessStatementBengali = `# সাক্ষীর বিবৃতি

আমি, আরভ খান, ফ্ল্যাট ১২বি, ৮৮ কোয়াই ই রোড, কোয়াই চুং, নিউ টেরিটোরিজ-এর
বাসিন্দা, নিম্নলিখিতভাবে বিবৃতি প্রদান করছি:

১। আমি এই মামলার বাদী। যদি অন্যথা উল্লেখ না করা হয়, তবে এই বিবৃতি আমার
নিজস্ব ব্যক্তিগত জ্ঞান থেকে প্রদত্ত।

২। আমি ৪ জানুয়ারি ২০২৩ থেকে Pacific Logistics Limited-এ একজন গুদাম শ্রমিক
(Warehouse Operative) হিসেবে কর্মরত ছিলাম। আমার সাধারণ দায়িত্ব ছিল ১২ Tai
Lin Pai Road, Tsuen Wan-এ অবস্থিত কোম্পানির গুদামে প্যালেট লোড ও আনলোড করা।

৩। ১৪ আগস্ট ২০২৫ সকালে আমি যথারীতি ৮:৩০-এ কাজে যোগ দিই। আমাকে লোডিং বে ৩-এ
নিয়োজিত করা হয় এবং আমি ৯:০০-এর আউটবাউন্ড ট্রাকের জন্য ডেলিভারি ম্যানিফেস্টের
বিপরীতে প্যালেট মিলিয়ে দেখা শুরু করি।

৪। আনুমানিক ৮:৫৫-তে, আমি একটি স্থির প্যালেটের ঠিক পিছনে দাঁড়িয়ে ছিলাম, বে
থেকে মুখ ফিরিয়ে, একটি ক্লিপবোর্ডে ইনভেন্টরি শিট চিহ্নিত করছিলাম। আমি কোনো
রিভার্স বিপার শুনতে পাইনি এবং কোনো সতর্কতামূলক আলো দেখিনি।

৫। কোনো সতর্কতা ছাড়াই, একজন সহকর্মীর চালানো একটি ফর্কলিফট দ্রুতগতিতে পিছিয়ে
আসে এবং প্যালেটের পিছনের অংশে ধাক্কা মারে, এতে আমার ডান পা প্যালেট ও একটি
ইস্পাত উল্লম্বের মাঝে আটকে যায়। আমি আমার পায়ের নিচের অংশে তাৎক্ষণিক ও তীব্র
ব্যথা অনুভব করি এবং পড়ে যাই।

৬। আমি চিৎকার করি এবং আমার সুপারভাইজার, মি. জে. লাই, কয়েক সেকেন্ডের মধ্যে
উপস্থিত হন এবং চিকিৎসা সহায়তার জন্য ফোন করেন। প্রায় ৯:০৮-এ অ্যাম্বুলেন্স
এসে পৌঁছায়। আমাকে Saint Joseph Memorial Hospital-এ নিয়ে যাওয়া হয় যেখানে
সেদিনই পরে আমার অস্ত্রোপচার হয়।

৭। দুর্ঘটনার পর থেকে আমি কাজে ফিরতে পারিনি। আমি সপ্তাহে তিনবার ফিজিওথেরাপি
নিচ্ছি এবং আক্রান্ত পায়ে ভর দেওয়ার সময় এখনও ব্যথা অনুভব করি।

৮। আমার জ্ঞান ও বিশ্বাস অনুযায়ী, এই বিবৃতির বিষয়বস্তু সঠিক বলে আমি নিশ্চিত
করছি।

স্বাক্ষর: _______________________
আরভ খান
এই ___ দিন ____________ ২০২৬।`;

function defaultEvidenceTypes() {
  return [
    { key: "writ_of_summons_supporting", title: "Writ of Summons Supporting documents", description: "Supporting documents for the writ of summons", isDefault: true, displayOrder: 1 },
    { key: "medical_records",            title: "Medical Records & Reports",            description: "Hospital/clinic records, doctor's certificates",     isDefault: true, displayOrder: 2 },
    { key: "medical_bills",              title: "Medical Bills & Receipts",             description: "Consultations, medication, rehabilitation",          isDefault: true, displayOrder: 3 },
    { key: "police_reports",             title: "Police / Incident Reports",            description: "Management or police incident reports",              isDefault: true, displayOrder: 4 },
    { key: "witness_statements",         title: "Witness Statements",                   description: "Written accounts from people who saw the incident",  isDefault: true, displayOrder: 5 },
    { key: "employment_income",          title: "Employment & Income Proof",            description: "Payslips, employer's letter",                        isDefault: true, displayOrder: 6 },
    { key: "transportation_receipts",    title: "Transportation Receipts",              description: "Travel to/from medical appointments",                isDefault: true, displayOrder: 7 },
    { key: "damaged_property",           title: "Damaged Property Evidence",            description: "Photos and receipts for damaged personal items",     isDefault: true, displayOrder: 8 },
    { key: "future_treatment",           title: "Future Treatment Estimates",           description: "Medical quotes for future treatment",                isDefault: true, displayOrder: 9 },
    { key: "correspondence",             title: "Correspondence",                       description: "Letters, emails, messages with the other party",     isDefault: true, displayOrder: 10 },
  ];
}

async function main() {
  // 1. Demo user (upsert is idempotent)
  const email = "demo@vakil.app";
  const passwordHash = await hashPassword("demo1234");

  const user = await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash, name: "Demo Lawyer" },
    update: { passwordHash, name: "Demo Lawyer" },
  });

  // 2. Wipe the demo user's existing cases so seeding is idempotent
  const oldCases = await prisma.case.findMany({
    where: { userId: user.id },
    select: { id: true },
  });
  if (oldCases.length) {
    await prisma.case.deleteMany({ where: { id: { in: oldCases.map((c) => c.id) } } });
  }

  // 3. Demo case
  const demoCase = await prisma.case.create({
    data: {
      userId: user.id,
      title: "Khan v. Pacific Logistics Ltd.",
      summary:
        "Personal injury claim arising from a workplace forklift incident on 14 August 2025.",
      caseType: "SOC",
      court: "High Court",
      caseNumber: "HCPI-2025-1842",
      parties: {
        create: [
          { name: "Aarav Khan", bengaliName: "আরভ খান", role: "plaintiff", type: "person" },
          { name: "Pacific Logistics Ltd.", bengaliName: null, role: "defendant", type: "company" },
        ],
      },
      evidenceTypes: { create: defaultEvidenceTypes() },
    },
  });

  // 4. Evidence files with OCR pre-populated
  const files = [
    { id: "demo-file-medical", fileName: "medical_report.pdf", type: "medical_records", ocr: ocrMedical },
    { id: "demo-file-police", fileName: "police_report.pdf", type: "police_reports", ocr: ocrPolice },
    { id: "demo-file-employer", fileName: "employer_letter.pdf", type: "employment_income", ocr: ocrEmployer },
  ];
  for (const f of files) {
    await prisma.file.create({
      data: {
        id: f.id,
        caseId: demoCase.id,
        type: f.type,
        fileName: f.fileName,
        fileKey: `demo/${f.id}.pdf`,
        processingStatus: "completed",
        ocrData: f.ocr,
        summary: f.ocr.split("\n").slice(1, 3).join(" ").slice(0, 200),
      },
    });
  }

  // 5. SOC analysis row with every generated document populated
  const ca = await prisma.caseAnalysis.create({
    data: { caseId: demoCase.id, analysisType: "soc", analysisStatus: "completed" },
  });

  await prisma.socAnalysis.create({
    data: {
      caseAnalysisId: ca.id,
      allFileOcr: files.map((f) => f.ocr).join("\n\n"),
      particularsMarkdown,
      chronologyMarkdown,
      writOfSummons,
      statementOfClaim,
      statementOfDamages,
      preActionLetter,
      witnessStatement,
      witnessStatementBengali,
    },
  });

  console.log("");
  console.log("Seeded:");
  console.log("  User:    demo@vakil.app / demo1234");
  console.log("  Case:    " + demoCase.title);
  console.log("  Files:   " + files.length + " (OCR pre-filled)");
  console.log("  Docs:    5 generated documents + Bangla witness translation");
  console.log("");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    return prisma.$disconnect().then(() => process.exit(1));
  });
