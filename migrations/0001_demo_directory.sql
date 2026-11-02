CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  email TEXT NOT NULL,
  site_id TEXT NOT NULL,
  active INTEGER NOT NULL,
  data_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS employees_site_id_idx ON employees(site_id);
CREATE INDEX IF NOT EXISTS employees_role_idx ON employees(role);

CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  active INTEGER NOT NULL,
  data_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS directory_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
