import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  host: 'dpg-d0h21q49c44c7397ujc0-a.oregon-postgres.render.com',
  port: 5432,
  user: 'idec_db_user',
  password: 'mfSwamCCfOboytv3eLaftZvDUghXaziZ',
  database: 'idec_db',
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();
  try {
    // Start transaction
    await client.query('BEGIN');

    // Read and execute migration file
    const migrationPath = path.join(__dirname, 'migrations', '001_add_tier_columns.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running migration...');
    await client.query(migrationSQL);
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('Migration completed successfully');
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error); 