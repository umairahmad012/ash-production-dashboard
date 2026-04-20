/**
 * Netlify Function — API router for the Ash Production Dashboard.
 *
 * Routes (after the /api/ prefix):
 *   GET    /api/data                   → main CRM state blob { deals, expenses, settings, goals }
 *   POST   /api/data                   → replace main CRM state blob
 *   GET    /api/users                  → list authorized users (admin only)
 *   POST   /api/users                  → add/update a user by email (admin only)
 *   DELETE /api/users/:email           → remove a user (admin only)
 *   POST   /api/users/:email/resend    → re-send Clerk invitation email (admin only)
 *   GET    /api/me                     → current user's session info + role
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
 *
 * Concurrency note: the user directory is only written in the /me handler
 * (for lastSeenAt / profile refresh) and in the explicit user-management
 * handlers. The access-resolution step is read-only, so a long-running
 * invitation (which calls out to Clerk) can't be clobbered by a concurrent
 * /data request that used to read-modify-write the directory.
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
//
// Read-only for established users: metadata refresh (lastSeenAt, name,
// avatar) used to happen here on every request, which raced with
// concurrent user-management writes. It now lives in handleMe only.
async function resolveUserAccess(userId) {
  const clerkInfo = await fetchClerkUserEmail(userId);
  const { email } = clerkInfo;
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
      firstName: clerkInfo.firstName,
      lastName: clerkInfo.lastName,
      imageUrl: clerkInfo.imageUrl,
      lastSeenAt: new Date().toISOString()
    };
    directory.users.push(entry);
    await writeUsersDirectory(directory);
    return { ok: true, user: entry, directory, clerkInfo, bootstrapped: true };
  }

  if (!entry) {
    return { ok: false, status: 403, reason: 'Your email is not authorized. Ask an admin to add you.', email };
  }

  return { ok: true, user: entry, directory, clerkInfo };
}

// ────────────────────────────────────────────────────────────────────────────
// Route handlers
// ────────────────────────────────────────────────────────────────────────────

// Refresh the entry's profile + lastSeenAt. Runs once per sign-in (Auth.init
// hits /me). We re-read the directory right before writing to minimize the
// window in which a concurrent user-management write could be clobbered.
async function handleMe(access) {
  const { user, clerkInfo } = access;
  const nowIso = new Date().toISOString();

  // The bootstrap path already wrote the entry inside resolveUserAccess —
  // no need to re-read + re-write. Any other request re-reads fresh.
  if (!access.bootstrapped) {
    try {
      const dir = await readUsersDirectory();
      const entry = findUserInDirectory(dir, user.email);
      if (entry) {
        entry.firstName = clerkInfo.firstName;
        entry.lastName = clerkInfo.lastName;
        entry.imageUrl = clerkInfo.imageUrl;
        entry.lastSeenAt = nowIso;
        await writeUsersDirectory(dir);
      }
    } catch (e) {
      // Non-fatal — profile metadata is a nice-to-have
      console.warn('me metadata refresh failed:', e.message);
    }
  }

  return json({
    email: user.email,
    role: user.role,
    firstName: clerkInfo.firstName || user.firstName || '',
    lastName: clerkInfo.lastName || user.lastName || '',
    imageUrl: clerkInfo.imageUrl || user.imageUrl || ''
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
  const isNewUser = !entry;

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
      lastSeenAt: null,
      invitationSent: false,
      invitationId: null,
      invitationStatus: null,
      invitationError: null
    };
    directory.users.push(entry);
  }

  // For brand-new invites, ask Clerk to email the user a sign-up link.
  // We still add to the allowlist even if the email send fails — the
  // user can sign in with Google directly and access will still work.
  let inviteResult = null;
  if (isNewUser) {
    inviteResult = await sendClerkInvitation(req, email, role);
    if (inviteResult.ok) {
      entry.invitationSent = inviteResult.status === 'created';
      entry.invitationId = inviteResult.invitationId || null;
      entry.invitationStatus = inviteResult.status || 'created';
      entry.invitationError = null;
    } else {
      entry.invitationError = inviteResult.reason;
    }
  }

  await writeUsersDirectory(directory);
  return json({ ok: true, user: entry, invite: inviteResult });
}

// Ask Clerk's Backend API to email a sign-up invitation link to `email`.
// Clerk sends the email itself (their SMTP). The link lands on Clerk's
// Account Portal, where the user signs up; we don't need a custom
// redirect URL.
//
// Return shape:
//   { ok: true, status: 'created',          invitationId }
//   { ok: true, status: 'already_pending',  invitationId, reason }
//   { ok: true, status: 'already_signed_up',                  reason }
//   { ok: false,                                              reason }
async function sendClerkInvitation(req, email, role) {
  try {
    const origin = new URL(req.url).origin;
    const resp = await fetch('https://api.clerk.com/v1/invitations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email_address: email,
        redirect_url: origin,
        public_metadata: { role, source: 'ra-crm-admin' },
        notify: true
        // NOTE: `ignore_existing` is intentionally omitted. When it's true
        // and a pending invite already exists, Clerk silently succeeds
        // without sending a new email — which looks to the admin like the
        // invite worked but the user never receives a link. Without the
        // flag, Clerk surfaces a 422 that we catch below and expose as
        // `already_pending` so the admin can hit Resend.
      })
    });
    const data = await resp.json().catch(() => ({}));
    if (resp.ok) {
      return { ok: true, status: 'created', invitationId: data.id };
    }
    const firstError = data.errors?.[0];
    const code = (firstError?.code || '').toLowerCase();
    const message = firstError?.long_message || firstError?.message || `Clerk ${resp.status}`;

    // Already-pending-invitation → look up the existing invite so we can
    // offer a Resend. Clerk has returned this as both 400 and 422 across
    // API versions and the error code varies too — so we match liberally
    // on the human message instead of gating by status.
    const looksLikeAlreadyPending =
      code === 'duplicate_record' ||
      (/invitation/i.test(message) && /already|exists|pending/i.test(message));
    if (looksLikeAlreadyPending) {
      const existing = await findPendingInvitation(email);
      return {
        ok: true,
        status: 'already_pending',
        invitationId: existing?.id || null,
        reason: 'An invitation is still pending for this email. No new email was sent — click Resend to revoke the old invite and deliver a new link.'
      };
    }

    // The email already has a Clerk account → they can just sign in.
    const looksLikeExistingAccount =
      code === 'form_identifier_exists' ||
      (/already.*sign(ed)?\s*up/i.test(message)) ||
      (/user|account/i.test(message) && /already|exists/i.test(message));
    if (looksLikeExistingAccount) {
      return {
        ok: true,
        status: 'already_signed_up',
        reason: 'This person already has a Clerk account — they can sign in with Google directly using this email.'
      };
    }

    return { ok: false, reason: message };
  } catch (e) {
    return { ok: false, reason: 'Network error: ' + e.message };
  }
}

// Find a pending invitation for a given email, if any, so we can revoke it
// before creating a new one.
async function findPendingInvitation(email) {
  try {
    const url = new URL('https://api.clerk.com/v1/invitations');
    url.searchParams.set('status', 'pending');
    url.searchParams.set('query', email);
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` }
    });
    if (!resp.ok) return null;
    const body = await resp.json().catch(() => null);
    // Clerk returns either a bare array or an envelope { data: [...] }
    const list = Array.isArray(body) ? body : (body?.data || []);
    const low = email.toLowerCase();
    return list.find(inv => (inv.email_address || '').toLowerCase() === low) || null;
  } catch {
    return null;
  }
}

async function revokeClerkInvitation(invitationId) {
  if (!invitationId) return false;
  try {
    const resp = await fetch(`https://api.clerk.com/v1/invitations/${invitationId}/revoke`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` }
    });
    return resp.ok;
  } catch {
    return false;
  }
}

async function handleResendInvite(email, user, req) {
  if (user.role !== 'admin') return error('Admin only', 403);
  const target = (email || '').trim().toLowerCase();
  if (!target) return error('email required');

  const directory = await readUsersDirectory();
  const entry = findUserInDirectory(directory, target);
  if (!entry) return error('User not found', 404);

  // Revoke any existing pending invite so Clerk actually sends a new email
  // (it won't re-notify if one is still outstanding for this address).
  const knownId = entry.invitationId;
  if (knownId) {
    await revokeClerkInvitation(knownId);
  } else {
    const existing = await findPendingInvitation(target);
    if (existing?.id) await revokeClerkInvitation(existing.id);
  }

  const result = await sendClerkInvitation(req, target, entry.role);
  if (result.ok) {
    entry.invitationSent = result.status === 'created';
    entry.invitationId = result.invitationId || null;
    entry.invitationStatus = result.status;
    entry.invitationError = null;
  } else {
    entry.invitationError = result.reason;
  }
  await writeUsersDirectory(directory);

  return json({ ok: result.ok, invite: result, user: entry });
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
  // Pin the real email onto the user object so handlers that rely on it
  // (e.g. `addedBy`) always have the up-to-date Clerk email even when the
  // stored entry doesn't carry one yet.
  user.email = user.email || access.clerkInfo?.email || '';

  const url = new URL(req.url);
  // The redirect in netlify.toml strips "/api/" but the function also
  // receives requests at /.netlify/functions/api/<rest>. Normalize:
  let path = url.pathname.replace(/^\/\.netlify\/functions\/api/, '');
  path = path.replace(/^\/api/, '');
  if (!path.startsWith('/')) path = '/' + path;

  try {
    if (path === '/me' && req.method === 'GET') return handleMe(access);
    if (path === '/data' && req.method === 'GET') return handleGetData();
    if (path === '/data' && req.method === 'POST') return handleSaveData(req, user);
    if (path === '/users' && req.method === 'GET') return handleListUsers(user);
    if (path === '/users' && req.method === 'POST') return handleAddOrUpdateUser(req, user);
    if (req.method === 'POST' && path.startsWith('/users/') && path.endsWith('/resend')) {
      const email = decodeURIComponent(path.slice('/users/'.length, -'/resend'.length));
      return handleResendInvite(email, user, req);
    }
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
