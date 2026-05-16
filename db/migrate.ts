import 'dotenv/config';
import { db } from './index';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

const main = async () => {
    try {
        // Check if DATABASE_URL is set
        if (!process.env.DATABASE_URL) {
            console.error('❌ DATABASE_URL environment variable is not set');
            console.error('Please set DATABASE_URL in your .env file');
            process.exit(1);
        }

        console.log('🔄 Starting database migration...');
        console.log(`📊 Database URL: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@')}`); // Hide password in logs
        
        await migrate(db as PostgresJsDatabase<any>, { migrationsFolder: 'db/migrations' });
        console.log('✅ Migration successful');
    } catch (error) {
        console.error('❌ Migration failed');
        console.error(error);
        process.exit(1);
    }
};

main();