/**
 * Netlify Function — API router for the Ash Production Dashboard.
 *
 * Routes (after the /api/ prefix):
 *   GET  /api/data          → main CRM state blob { deals, expenses, settings, goals }
 *   POST /api/data          → replace main CRM state blob
 *   GET  /api/users         → list authorized users (admin only)
 *   POST /api/users         → add/update a user by email (admin only)
 *   DELETE /api/users/:email → remove a user (admin only)
 *   GET  /api/me            → current user's session info + role
 *
 * Auth: every request must carry a Clerk session JWT in the Authorization
 * header (Bearer xxx). The JWT is verified against Clerk's JWKS using the
 * CLERK_SECRET_KEY env var.
 *
 * Allowlist: the first user to sign in is auto-promoted to admin so the
 * system can bootstrap. After that, only users in the "users" blob can
 * read/write CRM data. This is a second layer on top of Clerk — even if
 * someone figures out the Clerk instance, they can't access data unless an
 * admin has added them.
 */

import { verifyToken } from '@clerk/backend';
import { getStore } from '@netlify/blobs';

const DATA_STORE = 'crm-data';       // main CRM state
const USERS_STORE = 'crm-users';     // authorized-user directory
const DATA_KEY = 'state';
const USERS_KEY = 'directory';

const json = (body, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...extraHeaders }
  });

const error = (message, status = 400) => json({ error: message }, status);

// ────────────────────────────────────────────────────────────────────────────
// Auth helpers
// ────────────────────────────────────────────────────────────────────────────

async function authenticate(req) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return { ok: false, status: 401, reason: 'Missing Bearer token' };

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY
    });
    // Clerk session tokens carry the user id as `sub`. Email is not in the
    // default JWT template — we fetch it from Clerk's Backend API when needed.
    return { ok: true, userId: payload.sub, sessionId: payload.sid };
  } catch (e) {
    return { ok: false, status: 401, reason: 'Invalid token: ' + e.message };
  }
}

// Fetch the user's primary email from Clerk's Backend API. Cached per request.
async function fetchClerkUserEmail(userId) {
  const resp = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` }
  });
  if (!resp.ok) throw new Error(`Clerk API ${resp.status}`);
  const user = await resp.json();
  const primary = user.email_addresses?.find(e => e.id === user.primary_email_address_id);
  return {
    email: (primary?.email_address || '').toLowerCase(),
    firstName: user.first_name || '',
    lastName: user.last_name || '',
    imageUrl: user.image_url || ''
  };
}

// Read the authorized-user directory. Shape: { users: [{email, role, addedAt, addedBy}] }
async function readUsersDirectory() {
  const store = getStore(USERS_STORE);
  const data = await store.get(USERS_KEY, { type: 'json' });
  return data || { users: [] };
}

async function writeUsersDirectory(dir) {
  const store = getStore(USERS_STORE);
  await store.setJSON(USERS_KEY, dir);
}

// Look up a user by email in the directory. Returns null if not authorized.
function findUserInDirectory(directory, email) {
  const low = (email || '').toLowerCase();
  return directory.users.find(u => u.email.toLowerCase() === low) || null;
}

// Bootstrap: if the directory is empty, the first authenticated user
// becomes an admin. Otherwise, reject anyone not already in the directory.
async function resolveUserAccess(userId) {
  const { email, firstName, lastName, imageUrl } = await fetchClerkUserEmail(userId);
  if (!email) return { ok: false, status: 403, reason: 'No email on your Clerk account' };

  const directory = await readUsersDirectory();
  let entry = findUserInDirectory(directory, email);

  if (!entry && directory.users.length === 0) {
    // Bootstrap admin
    entry = {
      email,
      role: 'admin',
      addedAt: new Date().toISOString(),
      addedBy: 'bootstrap',
      firstName,
      lastName,
      imageUrl,
      lastSeenAt: new Date().toISOString()
    };
    directory.users.push(entry);
    await writeUsersDirectory(directory);
    return { ok: true, user: entry, directory };
  }

  if (!entry) {
    return { ok: false, status: 403, reason: 'Your email is not authorized. Ask an admin to add you.', email };
  }

  // Refresh metadata + lastSeenAt (so admins can see activity)
  entry.firstName = firstName;
  entry.lastName = lastName;
  entry.imageUrl = imageUrl;
  entry.lastSeenAt = new Date().toISOString();
  await writeUsersDirectory(directory);

  return { ok: true, user: entry, directory };
}

// ────────────────────────────────────────────────────────────────────────────
// Route handlers
// ────────────────────────────────────────────────────────────────────────────

async function handleMe(user) {
  return json({
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl
  });
}

async function handleGetData() {
  const store = getStore(DATA_STORE);
  const data = await store.get(DATA_KEY, { type: 'json' });
  // Empty = new install, signal null so client falls back to local seed
  return json({ state: data || null });
}

async function handleSaveData(req, user) {
  if (user.role !== 'admin' && user.role !== 'editor') {
    return error('Read-only role', 403);
  }
  let body;
  try { body = await req.json(); }
  catch { return error('Invalid JSON body'); }
  if (!body || !body.state) return error('Missing state in body');

  const store = getStore(DATA_STORE);
  await store.setJSON(DATA_KEY, body.state);
  return json({ ok: true, savedAt: new Date().toISOString() });
}

async function handleListUsers(user) {
  if (user.role !== 'admin') return error('Admin only', 403);
  const directory = await readUsersDirectory();
  return json(directory);
}

async function handleAddOrUpdateUser(req, user) {
  if (user.role !== 'admin') return error('Admin only', 403);
  let body;
  try { body = await req.json(); }
  catch { return error('Invalid JSON body'); }
  const email = (body.email || '').trim().toLowerCase();
  const role = (body.role || 'editor').trim().toLowerCase();
  if (!email) return error('email required');
  if (!['admin', 'editor', 'viewer'].includes(role)) return error('role must be admin, editor, or viewer');

  const directory = await readUsersDirectory();
  let entry = findUserInDirectory(directory, email);
  if (entry) {
    entry.role = role;
  } else {
    entry = {
      email,
      role,
      addedAt: new Date().toISOString(),
      addedBy: user.email,
      firstName: '',
      lastName: '',
      imageUrl: '',
      lastSeenAt: null
    };
    directory.users.push(entry);
  }
  await writeUsersDirectory(directory);
  return json({ ok: true, user: entry });
}

async function handleDeleteUser(email, user) {
  if (user.role !== 'admin') return error('Admin only', 403);
  const target = (email || '').trim().toLowerCase();
  if (!target) return error('email required');
  if (target === user.email.toLowerCase()) return error('You cannot remove yourself');

  const directory = await readUsersDirectory();
  const before = directory.users.length;
  directory.users = directory.users.filter(u => u.email.toLowerCase() !== target);
  if (directory.users.length === before) return error('User not found', 404);
  await writeUsersDirectory(directory);
  return json({ ok: true });
}

// ────────────────────────────────────────────────────────────────────────────
// Main entry — Netlify Functions v2 API
// ────────────────────────────────────────────────────────────────────────────

export default async (req, context) => {
  // CORS — allow the Netlify site itself to call us (same-origin via redirect
  // so this is mostly defensive)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
        'access-control-allow-headers': 'authorization, content-type'
      }
    });
  }

  const auth = await authenticate(req);
  if (!auth.ok) return error(auth.reason, auth.status);

  let access;
  try {
    access = await resolveUserAccess(auth.userId);
  } catch (e) {
    return error('Failed to resolve access: ' + e.message, 500);
  }
  if (!access.ok) return error(access.reason, access.status);
  const user = access.user;

  const url = new URL(req.url);
  // The redirect in netlify.toml strips "/api/" but the function also
  // receives requests at /.netlify/functions/api/<rest>. Normalize:
  let path = url.pathname.replace(/^\/\.netlify\/functions\/api/, '');
  path = path.replace(/^\/api/, '');
  if (!path.startsWith('/')) path = '/' + path;

  try {
    if (path === '/me' && req.method === 'GET') return handleMe(user);
    if (path === '/data' && req.method === 'GET') return handleGetData();
    if (path === '/data' && req.method === 'POST') return handleSaveData(req, user);
    if (path === '/users' && req.method === 'GET') return handleListUsers(user);
    if (path === '/users' && req.method === 'POST') return handleAddOrUpdateUser(req, user);
    if (path.startsWith('/users/') && req.method === 'DELETE') {
      const email = decodeURIComponent(path.slice('/users/'.length));
      return handleDeleteUser(email, user);
    }
    return error('Not found: ' + req.method + ' ' + path, 404);
  } catch (e) {
    return error('Server error: ' + e.message, 500);
  }
};

export const config = {
  path: ['/api/*', '/.netlify/functions/api/*']
};
