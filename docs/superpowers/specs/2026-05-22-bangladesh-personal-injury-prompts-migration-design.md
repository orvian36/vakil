# Design Spec: Bangladesh Personal Injury Prompts Migration

**Date:** 2026-05-22  
**Author:** AI Assistant  
**Status:** Approved  

---

## 1. Goal & Context
The goal is to transition the personal injury litigation prompts under `lib/prompts` from a Hong Kong (Chinese/HK legal) context to a Bangladesh (English/Bangla legal) context. This ensures that the generated legal documents (Writ of Summons, Statement of Claim, Statement of Damages, Particulars of Claim, Pre-action Letter, and Witness Statement) conform to the laws, courts, procedures, identification systems, and currency of Bangladesh.

---

## 2. Technical Design & Mappings

### 2.1 Statutory Mappings (Ordinance $\rightarrow$ Act/Rules)
| Hong Kong Legislation | Bangladesh Equivalent | Notes |
|---|---|---|
| **Fatal Accidents Ordinance, Cap. 22 (FAO)** | **Fatal Accidents Act, 1855 (Section 1)** | Under Section 1 of the 1855 Act, dependants can claim compensation. |
| **Law Amendment and Reform (Consolidation) Ordinance, Cap. 23 (LAR(C)O)** | **Succession Act, 1925 (Section 306)** | Governs the survival of causes of action for the estate. |
| **Road Traffic Ordinance, Cap. 374** | **Road Transport Act, 2018** | Replaces traffic safety/offence citations. |
| **Factories and Industrial Undertaking Ordinance (Cap. 59)** | **Bangladesh Labour Act, 2006** | Specifically Chapter V (Health), Chapter VI (Safety), and Chapter VII. |
| **Construction Site (Safety) Regulations (Cap. 59I)** | **Bangladesh Labour Rules, 2015** | Safety rules for construction and workplaces. |
| **Occupiers Liability Ordinance (Cap. 314)** | **Common Law Negligence (Torts)** | Bangladesh lacks a specific Occupier's Liability Act; tort principles apply. |
| **Occupational Safety and Health Ordinance (Cap. 509)** | **Bangladesh Labour Act, 2006** | General safety duties. |
| **Evidence Ordinance (Cap. 8) Section 62** | **Evidence Act, 1872 (Section 43)** | Admissibility of criminal convictions in civil suits. |
| **Employees' Compensation Ordinance (Cap. 282)** | **Bangladesh Labour Act, 2006 (Chapter XII)** | Workmen's compensation (no-fault claims). |

### 2.2 Procedural & Court Mappings
- **Civil Negligence Claims (Tort)**:
  - **Court Name**: Court of the Joint District Judge, [District Name] (e.g. Dhaka).
  - **Case Type**: Money Suit / Other Civil Suit for damages.
  - **Pleading Rules**: Rules of the District Court (Cap. 336H) Order 18 Rule 12(1A)(b) $\rightarrow$ **Order VI, Rule 4 of the Code of Civil Procedure, 1908 (CPC)**.
  - **Interest**: Sections 49 & 50 of the District Court Ordinance (Cap. 336) $\rightarrow$ **Section 34 of the Code of Civil Procedure, 1908 (CPC)** and/or the **Interest Act, 1839**.
- **Workmen's Compensation Claims (Labour)**:
  - **Court Name**: [Number] Labour Court, [Division/District Name] (e.g. First Labour Court, Dhaka).
  - **Case Type**: Workmen's Compensation Case.

### 2.3 Administrative & Financial Mappings
- **Currency**: HKD / HK$ $\rightarrow$ **Bangladeshi Taka (BDT / ৳)**.
- **Identification Card**: HKID $\rightarrow$ **National Identity Card (NID) Number**.
- **Accident Reporting Form**: Form 2 $\rightarrow$ **Form 80 (Notice of Accident)** under the *Bangladesh Labour Rules, 2015*.
- **Accident Reporting Authority**: Labour Department $\rightarrow$ **Department of Inspection for Factories and Establishments (DIFE) / Labour Court**.
- **Transit Systems**: MTR / Taxi $\rightarrow$ **Bus / CNG / Rickshaw / Taxi**.
- **Public Hospitals**: Hospital Authority public hospitals $\rightarrow$ Public/private medical college hospitals under the **Directorate General of Health Services (DGHS)** (e.g. Dhaka Medical College Hospital, NITOR).
- **Pension / Retirement Contributions**: MPF (Mandatory Provident Fund) $\rightarrow$ **Provident Fund (PF) and Gratuity** under the *Bangladesh Labour Act, 2006*.
- **Sick Leave Pay**: 4/5th Wages $\rightarrow$ **Half-monthly payments for temporary disablement** under Section 151 of the *Bangladesh Labour Act, 2006*, or full salary during recovery depending on employer terms.

---

## 3. Witness Statement Prompt Translation
The file `generate_witness_statement.txt` (currently in Traditional Chinese) will be translated entirely into English. 
- The target output of the translated prompt remains **English** as requested, which integrates with the translation pipeline.
- All HK court structures, ordinances, currencies, and addresses in the guidelines and examples will be replaced with their Bangladeshi equivalents as detailed in Section 2.
- The dual declaration/verification statements at the end of the witness statement will be translated to English, citing **Section 193 of the Bangladesh Penal Code, 1860** (perjury/false statement warning) instead of the HK contempt of court rules.

---

## 4. File-by-File Changes Summary

1. `generate_particulars.txt`
   - Replace HK$ with BDT.
   - Replace MTR with Bus/CNG/Rickshaw.
   - Update generic placeholders from HK to Bangladesh.
2. `generate_pre-action_letter.txt`
   - Replace references to HK Practice Direction 18.1 with standard Bangladeshi legal/demand notice procedure.
   - Map ECO to Labour Act 2006 (Chapter XII), OSHO to Labour Act 2006.
   - Update HKID to NID, and HKD to BDT.
   - Replace Form 2 with Form 80.
3. `generate_statement_of_claim.txt`
   - Fully map FAO, LAR(C)O, Road Traffic Ordinance, FIUO, CSSR, OLO, OSHO, ECO, Evidence Ordinance to Bangladeshi equivalents.
   - Replace RDC and PD 18.1 references with CPC (Order VI Rule 4, Order V).
   - Update District Court headings to Court of the Joint District Judge.
   - Change HKD to BDT.
4. `generate_statement_of_damages.txt`
   - Change HKD to BDT.
   - Replace MPF (Mandatory Provident Fund) references and formulas with Provident Fund (PF) and Gratuity.
   - Remove HK case law references (e.g. *Chan Pak Ting*) and use general principles under Bangladeshi common law/statutory guidelines.
5. `generate_witness_statement.txt`
   - Complete translation from Traditional Chinese to English.
   - Fully integrate all Bangladeshi court and statutory mappings.
6. `generate_writ_of_summons.txt`
   - Replace HKSAR District Court with Joint District Judge Court of Bangladesh.
   - Replace High Court Ordinance / section 48 interest with CPC Section 34 / Interest Act, 1839.
   - Remove "Bangladesh Special Administrative Region".

---

## 5. Verification Plan
We will verify the changes by performing a case-insensitive `grep_search` across `lib/prompts/` to ensure no trace remains of:
- "HKD", "HK$", "Hong Kong" (unless in a negative validation context), "Kowloon", "Kwun Tong", "New Territories", "MTR", "HKSAR".
- "Ordinance", "Cap." (except where referring to a valid Bangladeshi ordinance or properly removed).
- "ECO", "FIUO", "CSSR", "OLO", "OSHO", "OSHR".
- Traditional Chinese characters (specifically in `generate_witness_statement.txt`).
