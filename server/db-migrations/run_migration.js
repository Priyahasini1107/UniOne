/**
 * db-migrations/run_migration.js
 *
 * Runs a SQL migration file against the configured MySQL database.
 * Safe to run multiple times — all statements use CREATE TABLE IF NOT EXISTS.
 *
 * USAGE:
 *   node --env-file=.env db-migrations/run_migration.js [filename.sql]
 *   Defaults to 001_faculty_tables.sql if no argument given.
 */

const fs    = require('node:fs');
const path  = require('node:path');
const mysql = require('mysql2/promise');

// Portfolio columns to add to student_profiles (safe, idempotent)
const PROFILE_COLUMNS = [
  ['bio',                  'TEXT DEFAULT NULL'],
  ['skills_json',          'JSON DEFAULT NULL'],
  ['linkedin_url',         'VARCHAR(255) DEFAULT NULL'],
  ['github_url',           'VARCHAR(255) DEFAULT NULL'],
  ['certifications_json',  'JSON DEFAULT NULL'],
  ['achievements_json',    'JSON DEFAULT NULL'],
  ['internship_exp_json',  'JSON DEFAULT NULL'],
];

async function addProfileColumns(conn) {
  const [existing] = await conn.execute(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'student_profiles'`
  );
  const existingNames = new Set(existing.map(r => r.column_name || r.COLUMN_NAME));

  for (const [col, def] of PROFILE_COLUMNS) {
    if (!existingNames.has(col)) {
      await conn.execute(`ALTER TABLE student_profiles ADD COLUMN \`${col}\` ${def}`);
      console.log(`  + Added column: student_profiles.${col}`);
    }
  }
}

async function run() {
  const filename = process.argv[2] || '001_faculty_tables.sql';
  const sqlFile  = path.join(__dirname, filename);

  if (!fs.existsSync(sqlFile)) {
    console.error(`❌  File not found: ${sqlFile}`);
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  try {
    // Handle student_profiles column additions separately (DELIMITER issue)
    if (filename.includes('002')) {
      console.log('\n▶  Adding student_profiles portfolio columns...');
      await addProfileColumns(conn);
    }

    const sql = fs.readFileSync(sqlFile, 'utf8');
    console.log(`\n▶  Running ${filename} ...\n`);
    await conn.query(sql);
    console.log(`✅  Migration complete: ${filename}\n`);
  } catch (err) {
    console.error('❌  Migration failed:', err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

run();
