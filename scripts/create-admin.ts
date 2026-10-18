/**
 * First Admin for a production install (demo accounts are off there):
 *   ADMIN_PASSWORD='a long passphrase' npm run db:create-admin -- owner@firm.in "Owner Name"
 */

import { openDb } from '../lib/db/open';
import { createUser } from '../lib/db/repos/users';

const [email, name] = process.argv.slice(2);
const password = process.env.ADMIN_PASSWORD;
if (!email || !name || !password) {
  console.error('Usage: ADMIN_PASSWORD=... npm run db:create-admin -- <email> "<name>"');
  process.exit(1);
}

const db = openDb(process.env.DATABASE_PATH || 'data/proposalpanda.db');
const user = createUser(db, { email, name, role: 'Admin', password });
console.log(`Created Admin ${user.email}. Sign in and add everyone else on the Users page.`);
