import { createServerFn } from '@tanstack/react-start';
import type { Employee, Site } from './types';

interface D1Statement {
  all<T>(): Promise<{ results: T[] }>;
}

interface D1Database {
  prepare(query: string): D1Statement;
}

declare global {
  // Nitro's Cloudflare Worker adapter exposes request bindings on __env__.
  var __env__: { DB?: D1Database } | undefined;
}

export const getSharedDirectory = createServerFn({ method: 'GET' }).handler(async () => {
  const database = globalThis.__env__?.DB;
  if (!database) return { configured: false as const };

  try {
    const [employeeRows, siteRows] = await Promise.all([
      database.prepare('SELECT data_json FROM employees ORDER BY id').all<{ data_json: string }>(),
      database.prepare('SELECT data_json FROM sites ORDER BY id').all<{ data_json: string }>(),
    ]);

    return {
      configured: true as const,
      employees: employeeRows.results.map(row => JSON.parse(row.data_json) as Employee),
      sites: siteRows.results.map(row => JSON.parse(row.data_json) as Site),
    };
  } catch (error) {
    console.error('Failed to read the shared demo directory from D1.', error);
    return { configured: false as const };
  }
});
