import 'dotenv/config';
import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';

const main = async () => {
    try {
        // Check if DATABASE_URL is set
        if (!process.env.DATABASE_URL) {
            console.error('❌ DATABASE_URL environment variable is not set');
            console.error('Please set DATABASE_URL in your .env file');
            process.exit(1);
        }

        console.log('🔄 Running migration 0004: Add Writ of Summons evidence type...');
        
        // Read the migration SQL file
        const migrationPath = path.join(process.cwd(), 'db/migrations/0004_add_writ_of_summons_evidence_type.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

        // Determine SSL mode
        const sslMode = process.env.NODE_ENV === 'production' || process.env.DATABASE_URL?.includes('sslmode=require')
            ? 'require'
            : (process.env.DATABASE_SSL === 'true' ? 'require' : false);

        // Create a connection
        const sql = postgres(process.env.DATABASE_URL, {
            ssl: sslMode,
            max: 1, // Single connection for migration
        });

        // Execute the migration SQL
        await sql.unsafe(migrationSQL);
        
        console.log('✅ Migration 0004 completed successfully');
        
        // Close the connection
        await sql.end();
    } catch (error) {
        console.error('❌ Migration failed');
        console.error(error);
        process.exit(1);
    }
};

main();
