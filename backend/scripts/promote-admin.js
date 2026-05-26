#!/usr/bin/env node
// Usage:
//   node scripts/promote-admin.js <email>
// Marks the user with the given email as a system admin.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { pool } = require('../src/config/db');

async function main() {
  const email = (process.argv[2] || '').toLowerCase().trim();
  if (!email) {
    console.error('Usage: node scripts/promote-admin.js <email>');
    process.exit(1);
  }
  const r = await pool.query(
    `update chat_users set is_admin = true where email = $1
     returning id, username, email, is_admin`,
    [email]
  );
  if (!r.rowCount) {
    console.error(`No user found with email "${email}"`);
    process.exit(2);
  }
  console.log('Promoted:', r.rows[0]);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(3);
});
