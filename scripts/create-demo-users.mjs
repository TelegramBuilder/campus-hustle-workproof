// One-time setup: creates the six demo auth accounts via the Supabase Admin API.
// Run with:  SUPABASE_SERVICE_KEY=sb_secret_... node scripts/create-demo-users.mjs
// Uses the supported auth.admin.createUser path (no fragile raw inserts into auth.users).
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = readFileSync(new URL('../.env', import.meta.url), 'utf8')
  .split('\n')
  .reduce((a, l) => { const i = l.indexOf('='); if (i > 0) a[l.slice(0, i)] = l.slice(i + 1).trim(); return a; }, {});

const url = env.VITE_SUPABASE_URL;
const secret = process.env.SUPABASE_SERVICE_KEY;
if (!url || !secret) { console.error('Missing VITE_SUPABASE_URL (.env) or SUPABASE_SERVICE_KEY env var.'); process.exit(1); }

const sb = createClient(url, secret, { auth: { persistSession: false } });

const DEMO_USERS = [
  { email: 'salawu@demo.campushustle.app', username: 'salawu' },
  { email: 'morayo@demo.campushustle.app', username: 'morayo' },
  { email: 'tobi@demo.campushustle.app', username: 'tobi' },
  { email: 'chiamaka@demo.campushustle.app', username: 'chiamaka' },
  { email: 'admin@demo.campushustle.app', username: 'admin' },
  { email: 'super@demo.campushustle.app', username: 'super' },
];
const PASSWORD = 'password123';

for (const u of DEMO_USERS) {
  const { data, error } = await sb.auth.admin.createUser({
    email: u.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { username: u.username, local_uid: u.username },
  });
  if (error) console.log(`${u.email}: ERROR ${error.message}`);
  else console.log(`${u.email}: created ${data.user?.id}`);
}
