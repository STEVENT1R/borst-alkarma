/**
 * Export Database from Supabase to SQL file
 * Run: node export_db.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const TABLES_ORDER = [
  'users',
  'shops',
  'tasks',
  'inventory',
  'receivers',
  'notifications',
  'salary_payments',
  'salaries',
  'inventory_transactions',
  'receiver_transactions',
  'profit_log',
  'expenses',
  'purchases',
  'purchase_items',
  'spoilage',
  'performance_log',
  'push_subscriptions',
  'app_settings',
  'sales'
];

async function exportDatabase() {
  const client = await pool.connect();
  try {
    let sql = '-- ===========================================\n';
    sql += '-- Database Export from Supabase\n';
    sql += `-- Date: ${new Date().toISOString()}\n`;
    sql += '-- ===========================================\n\n';

    // Disable triggers temporarily for clean import
    sql += 'SET session_replication_role = replica;\n\n';

    for (const table of TABLES_ORDER) {
      // Check if table exists
      const tableExists = await client.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`,
        [table]
      );

      if (!tableExists.rows[0].exists) {
        console.log(`⏭️ Table "${table}" does not exist, skipping...`);
        continue;
      }

      console.log(`📤 Exporting table: ${table}`);

      // Get columns
      const columns = await client.query(
        `SELECT column_name, column_default FROM information_schema.columns 
         WHERE table_name = $1 AND table_schema = 'public'
         ORDER BY ordinal_position`,
        [table]
      );

      const colNames = columns.rows.map(c => c.column_name);
      const serialColumns = columns.rows
        .filter(c => c.column_default && c.column_default.includes('nextval'))
        .map(c => c.column_name);

      // Export data
      const { rows } = await client.query(`SELECT * FROM "${table}" ORDER BY id`);

      if (rows.length === 0) {
        console.log(`   ⚠️ No data in "${table}"`);
        continue;
      }

      // Reset sequences before importing
      for (const col of serialColumns) {
        const seqName = `${table}_${col}_seq`;
        sql += `SELECT setval('${seqName}', COALESCE((SELECT MAX(${col}) FROM "${table}"), 1), true);\n`;
      }

      sql += `\n-- Table: ${table} (${rows.length} rows)\n`;

      // Batch insert
      const batchSize = 100;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);

        const values = batch.map(row => {
          const vals = colNames.map(col => {
            const val = row[col];
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'number') return val.toString();
            if (typeof val === 'boolean') return val ? 'true' : 'false';
            if (val instanceof Date) return `'${val.toISOString()}'`;
            // Escape single quotes
            return `'${String(val).replace(/'/g, "''")}'`;
          });
          return `(${vals.join(', ')})`;
        }).join(',\n');

        sql += `INSERT INTO "${table}" (${colNames.map(c => `"${c}"`).join(', ')})\nVALUES\n${values};\n\n`;
      }
    }

    // Re-enable triggers
    sql += 'SET session_replication_role = origin;\n\n';
    sql += '-- ===========================================\n';
    sql += '-- Export Complete\n';
    sql += '-- ===========================================\n';

    // Write to file
    const fs = require('fs');
    const outputFile = path.join(__dirname, 'supabase_export.sql');
    fs.writeFileSync(outputFile, sql, 'utf8');

    console.log(`\n✅ Export complete! File saved to: ${outputFile}`);
    console.log(`📊 Total size: ${(Buffer.byteLength(sql) / 1024 / 1024).toFixed(2)} MB`);
    
  } catch (err) {
    console.error('❌ Export failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

exportDatabase();
