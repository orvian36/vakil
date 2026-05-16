-- Add "Writ of Summons Supporting documents" evidence type to all existing cases
-- This migration adds the new evidence type as the first item (display_order: 1)
-- and shifts all existing evidence types' display_order by +1

DO $$
DECLARE
    case_record RECORD;
BEGIN
    -- Loop through all existing cases
    FOR case_record IN SELECT id FROM cases LOOP
        -- First, update all existing evidence types to shift display_order by +1
        UPDATE case_evidence_types
        SET display_order = display_order + 1
        WHERE case_id = case_record.id;
        
        -- Then, insert the new "Writ of Summons Supporting documents" evidence type with display_order: 1
        INSERT INTO case_evidence_types (case_id, key, title, description, is_default, display_order)
        VALUES
            (case_record.id, 'writ_of_summons_supporting', 'Writ of Summons Supporting documents', 'Supporting documents for the writ of summons', true, 1)
        ON CONFLICT DO NOTHING; -- Prevent duplicate if somehow already exists
    END LOOP;
END $$;
