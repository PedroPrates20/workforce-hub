import { createServerFn, createServerOnlyFn } from '@tanstack/react-start';
import { deleteCookie, getCookie, setCookie } from '@tanstack/react-start/server';
import { z } from 'zod';
import type { Employee, Role, User } from './types';
import { isValidWorkforcePin } from './authPolicy';

interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T>(): Promise<T | null>;
  run(): Promise<unknown>;
}
interface D1Database { prepare(query: string): D1Statement }
interface AuthAccountRow {
  account_id: string;
  employee_id: string | null;
  email: string;
  role: Role;
  name: string;
  site_id: string;
  pin_salt: string;
  pin_hash: string;
  failed_attempts: number;
  locked_until: number;
}
interface RuntimeEnv {
  DB?: D1Database;
  AUTH_ADMIN_EMAIL?: string;
  AUTH_ADMIN_PIN?: string;
  AUTH_ADMIN_NAME?: string;
}

const SESSION_COOKIE = '__Host-workforce-session';
const SESSION_TTL_SECONDS = 60 * 60 * 12;
const PBKDF2_ITERATIONS = 120_000;
const encoder = new TextEncoder();
const env = () => (globalThis as typeof globalThis & { __env__?: RuntimeEnv }).__env__ ?? {};
const database = () => env().DB;
const normalizedEmail = (email: string) => email.trim().toLowerCase();
const toHex = (bytes: Uint8Array) => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
const fromHex = (value: string) => new Uint8Array(value.match(/.{2}/g)?.map(byte => Number.parseInt(byte, 16)) ?? []);

async function hashPin(pin: string, saltHex: string) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const result = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltHex), iterations: PBKDF2_ITERATIONS },
    material,
    256,
  );
  return toHex(new Uint8Array(result));
}

function constantTimeEqual(left: string, right: string) {
  const a = fromHex(left);
  const b = fromHex(right);
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= (a[index] ?? 0) ^ (b[index] ?? 0);
  return difference === 0;
}

async function randomHex(size: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  return toHex(bytes);
}

async function digest(value: string) {
  return toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));
}

async function ensureBootstrapAdmin(db: D1Database) {
  const email = env().AUTH_ADMIN_EMAIL;
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return false;

  const existing = await db.prepare('SELECT account_id, email FROM auth_accounts WHERE account_id = ?').bind('bootstrap-admin').first<{ account_id: string; email: string }>();
  if (existing) return normalizedEmail(existing.email) === normalizedEmail(email);

  const pin = env().AUTH_ADMIN_PIN;
  if (!pin || !isValidWorkforcePin(pin)) return false;

  const salt = await randomHex(16);
  const pinHash = await hashPin(pin, salt);
  const now = Date.now();
  try {
    await db.prepare(`INSERT OR IGNORE INTO auth_accounts
      (account_id, employee_id, email, role, name, site_id, pin_salt, pin_hash, created_at, updated_at)
      VALUES (?, NULL, ?, 'admin', ?, '', ?, ?, ?, ?)`)
      .bind('bootstrap-admin', normalizedEmail(email), env().AUTH_ADMIN_NAME?.trim() || 'System Administrator', salt, pinHash, now, now).run();
    const created = await db.prepare('SELECT account_id, email FROM auth_accounts WHERE account_id = ?').bind('bootstrap-admin').first<{ account_id: string; email: string }>();
    return !!created && normalizedEmail(created.email) === normalizedEmail(email);
  } catch {
    return false;
  }
}

async function userForAccount(db: D1Database, account: Pick<AuthAccountRow, 'account_id' | 'employee_id' | 'email' | 'role' | 'name' | 'site_id'>): Promise<User | null> {
  if (account.account_id === 'bootstrap-admin' && account.role === 'admin') {
    return { id: account.account_id, name: account.name, role: 'admin', title: 'SYSTEM ADMINISTRATOR', email: account.email, stamp: null, hoursUsed: 0, hoursLimit: 0, holidayBalance: 0, holidayEntitlement: 0, site: account.site_id };
  }
  if (!account.employee_id) return null;

  const employeeRow = await db.prepare('SELECT data_json, email FROM employees WHERE id = ?').bind(account.employee_id).first<{ data_json: string; email: string }>();
  if (!employeeRow) return null;
  try {
    const employee = JSON.parse(employeeRow.data_json) as Employee;
    if (!employee.active || normalizedEmail(employeeRow.email) !== normalizedEmail(account.email)) return null;
    return { ...employee, email: employeeRow.email };
  } catch {
    return null;
  }
}

async function accountFromSession(db: D1Database, token: string): Promise<User | null> {
  const tokenHash = await digest(token);
  const session = await db.prepare('SELECT account_id FROM auth_sessions WHERE token_hash = ? AND expires_at > ?')
    .bind(tokenHash, Date.now()).first<{ account_id: string }>();
  if (!session) return null;
  const account = await db.prepare('SELECT account_id, employee_id, email, role, name, site_id FROM auth_accounts WHERE account_id = ?')
    .bind(session.account_id).first<Pick<AuthAccountRow, 'account_id' | 'employee_id' | 'email' | 'role' | 'name' | 'site_id'>>();
  return account ? userForAccount(db, account) : null;
}

export const getSignedInAccount = createServerOnlyFn(async () => {
  const db = database();
  const token = getCookie(SESSION_COOKIE);
  if (!db || !token) return null;
  try { return await accountFromSession(db, token); } catch { return null; }
});

const loginSchema = z.object({ email: z.string().trim().email().max(254), pin: z.string().regex(/^\d{6}$/) });

export const loginWithPin = createServerFn({ method: 'POST' })
  .validator((value: unknown) => loginSchema.parse(value))
  .handler(async ({ data }) => {
    const db = database();
    if (!db) return { ok: false as const, reason: 'not_configured' as const };

    try {
      if (!(await ensureBootstrapAdmin(db))) return { ok: false as const, reason: 'not_configured' as const };
      const account = await db.prepare(`SELECT account_id, employee_id, email, role, name, site_id, pin_salt, pin_hash, failed_attempts, locked_until
        FROM auth_accounts WHERE email = ? COLLATE NOCASE`).bind(normalizedEmail(data.email)).first<AuthAccountRow>();
      const salt = account?.pin_salt ?? '6a2b0bfe7f58e0349ca01ab77653b1c2';
      const actualHash = await hashPin(data.pin, salt);
      const matches = account ? constantTimeEqual(actualHash, account.pin_hash) : false;
      const now = Date.now();

      if (!account) return { ok: false as const, reason: 'invalid_credentials' as const };
      if (account.locked_until > now) return { ok: false as const, reason: 'invalid_credentials' as const };

      const user = matches ? await userForAccount(db, account) : null;
      if (!matches || !user) {
        const failures = (account.locked_until > 0 && account.locked_until <= now ? 0 : account.failed_attempts) + 1;
        const lockedUntil = failures >= 5 ? now + 15 * 60_000 : 0;
        await db.prepare('UPDATE auth_accounts SET failed_attempts = ?, locked_until = ?, updated_at = ? WHERE account_id = ?')
          .bind(failures, lockedUntil, now, account.account_id).run();
        return { ok: false as const, reason: 'invalid_credentials' as const };
      }

      await db.prepare('UPDATE auth_accounts SET failed_attempts = 0, locked_until = 0, updated_at = ? WHERE account_id = ?')
        .bind(now, account.account_id).run();
      const token = await randomHex(32);
      const expiresAt = now + SESSION_TTL_SECONDS * 1000;
      await db.prepare('INSERT INTO auth_sessions (token_hash, account_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
        .bind(await digest(token), account.account_id, expiresAt, now).run();
      setCookie(SESSION_COOKIE, token, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: SESSION_TTL_SECONDS });
      return { ok: true as const, user };
    } catch (error) {
      console.error('Workforce login failed because authentication storage is unavailable.', error);
      return { ok: false as const, reason: 'not_configured' as const };
    }
  });

export const getCurrentAccount = createServerFn({ method: 'GET' }).handler(async () => getSignedInAccount());

export const logoutAccount = createServerFn({ method: 'POST' }).handler(async () => {
  const db = database();
  const token = getCookie(SESSION_COOKIE);
  if (db && token) {
    try { await db.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').bind(await digest(token)).run(); } catch { /* Cookie is still cleared locally. */ }
  }
  deleteCookie(SESSION_COOKIE, { httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
  return { ok: true as const };
});

const setPinSchema = z.object({ employeeId: z.string().min(1).max(100), email: z.string().trim().email().max(254), pin: z.string().regex(/^\d{6}$/) });

export const setEmployeeLoginPin = createServerFn({ method: 'POST' })
  .validator((value: unknown) => setPinSchema.parse(value))
  .handler(async ({ data }) => {
    const db = database();
    if (!db) return { ok: false as const, reason: 'not_configured' as const };
    const actor = await getSignedInAccount();
    if (!actor || !['admin', 'hr'].includes(actor.role)) return { ok: false as const, reason: 'not_authorized' as const };
    if (!isValidWorkforcePin(data.pin)) return { ok: false as const, reason: 'invalid_pin' as const };

    const row = await db.prepare('SELECT data_json FROM employees WHERE id = ?').bind(data.employeeId).first<{ data_json: string }>();
    if (!row) return { ok: false as const, reason: 'employee_not_found' as const };
    let employee: Employee;
    try { employee = JSON.parse(row.data_json) as Employee; } catch { return { ok: false as const, reason: 'employee_not_found' as const }; }
    const email = normalizedEmail(data.email);
    if (!employee.active) return { ok: false as const, reason: 'employee_not_found' as const };
    const duplicateEmployee = await db.prepare('SELECT id FROM employees WHERE lower(email) = ? AND id <> ?')
      .bind(email, employee.id).first<{ id: string }>();
    const duplicateAccount = await db.prepare('SELECT account_id FROM auth_accounts WHERE email = ? COLLATE NOCASE AND account_id <> ?')
      .bind(email, employee.id).first<{ account_id: string }>();
    if (duplicateEmployee || duplicateAccount) return { ok: false as const, reason: 'email_in_use' as const };

    const salt = await randomHex(16);
    const pinHash = await hashPin(data.pin, salt);
    const now = Date.now();
    try {
      employee.email = email;
      await db.prepare('UPDATE employees SET email = ?, data_json = ? WHERE id = ?').bind(email, JSON.stringify(employee), employee.id).run();
      await db.prepare(`INSERT INTO auth_accounts
        (account_id, employee_id, email, role, name, site_id, pin_salt, pin_hash, failed_attempts, locked_until, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
        ON CONFLICT(account_id) DO UPDATE SET employee_id=excluded.employee_id, email=excluded.email, role=excluded.role,
          name=excluded.name, site_id=excluded.site_id, pin_salt=excluded.pin_salt, pin_hash=excluded.pin_hash,
          failed_attempts=0, locked_until=0, updated_at=excluded.updated_at`)
        .bind(employee.id, employee.id, email, employee.role, employee.name, employee.site, salt, pinHash, now, now).run();
      await db.prepare('DELETE FROM auth_sessions WHERE account_id = ?').bind(employee.id).run();
      return { ok: true as const };
    } catch (error) {
      console.error('Could not save employee login credentials.', error);
      return { ok: false as const, reason: 'not_configured' as const };
    }
  });
