-- Add writ_of_summons column to soc_analyses table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'soc_analyses' 
        AND column_name = 'writ_of_summons'
    ) THEN
        ALTER TABLE "soc_analyses" ADD COLUMN "writ_of_summons" text;
    END IF;
END $$;
