import 'dotenv/config';
import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';

const main = async () => {
    try {
        if (!process.env.DATABASE_URL) {
            console.error('❌ DATABASE_URL environment variable is not set');
            console.error('Please set DATABASE_URL in your .env file');
            process.exit(1);
        }

        console.log('🔄 Running migration 0005: Add writ_of_summons column...');
        const migrationPath = path.join(process.cwd(), 'db/migrations/0005_add_writ_of_summons_column.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

        const sslMode = process.env.NODE_ENV === 'production' || process.env.DATABASE_URL?.includes('sslmode=require')
            ? 'require'
            : (process.env.DATABASE_SSL === 'true' ? 'require' : false);

        const sql = postgres(process.env.DATABASE_URL, {
            ssl: sslMode,
            max: 1,
        });

        await sql.unsafe(migrationSQL);
        console.log('✅ Migration 0005 completed successfully');
        await sql.end();
    } catch (error) {
        console.error('❌ Migration failed');
        console.error(error);
        process.exit(1);
    }
};
main();
