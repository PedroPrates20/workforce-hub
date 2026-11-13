CREATE TABLE IF NOT EXISTS auth_accounts (
  account_id TEXT PRIMARY KEY,
  employee_id TEXT UNIQUE,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  role TEXT NOT NULL,
  name TEXT NOT NULL,
  site_id TEXT NOT NULL DEFAULT '',
  pin_salt TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES auth_accounts(account_id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS auth_sessions_account_id_idx ON auth_sessions(account_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expires_at_idx ON auth_sessions(expires_at);
