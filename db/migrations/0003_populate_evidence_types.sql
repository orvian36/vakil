-- Populate evidence types for all existing cases
-- This data migration inserts the default 9 evidence types for each existing case
-- Note: New cases will automatically get 10 evidence types (including "Writ of Summons Supporting documents")

DO $$
DECLARE
    case_record RECORD;
BEGIN
    -- Loop through all existing cases
    FOR case_record IN SELECT id FROM cases LOOP
        -- Insert default evidence types for this case
        INSERT INTO case_evidence_types (case_id, key, title, description, is_default, display_order)
        VALUES
            (case_record.id, 'medical_records', 'Medical Records & Reports', 'Hospital/clinic records, doctor''s certificates, discharge summaries, physiotherapy reports', true, 1),
            (case_record.id, 'medical_bills', 'Medical Bills & Receipts/Invoices', 'For consultations, medication, rehabilitation, surgery, hospital stays', true, 2),
            (case_record.id, 'police_reports', 'Police / Incident Reports', 'Management office report, accident log book entry', true, 3),
            (case_record.id, 'witness_statements', 'Witness Statements', 'Written accounts from people who saw the incident', true, 4),
            (case_record.id, 'employment_income', 'Employment & Income Proof', 'Payslips, employer''s letter confirming absence and loss of income', true, 5),
            (case_record.id, 'transportation_receipts', 'Transportation Receipts', 'Taxi, bus, MTR receipts to/from medical appointments', true, 6),
            (case_record.id, 'damaged_property', 'Damaged Property Evidence', 'Photos and repair/replacement receipts for damaged personal items', true, 7),
            (case_record.id, 'future_treatment', 'Future Treatment Estimates', 'Medical quotes for future surgery, rehabilitation, or care', true, 8),
            (case_record.id, 'correspondence', 'Correspondence', 'Letters, emails, WhatsApp messages with the other party or insurer', true, 9);
    END LOOP;
END $$;

