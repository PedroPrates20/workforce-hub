import { createServerFn } from '@tanstack/react-start';
import type { Employee, Site } from './types';
import { DEMO_MODE } from './constants';
import { getSignedInAccount } from './authServer.server';

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
  const signedInUser = DEMO_MODE ? null : await getSignedInAccount();
  if (!DEMO_MODE && !signedInUser) return { configured: false as const };

  try {
    const [employeeRows, siteRows] = await Promise.all([
      database.prepare('SELECT data_json FROM employees ORDER BY id').all<{ data_json: string }>(),
      database.prepare('SELECT data_json FROM sites ORDER BY id').all<{ data_json: string }>(),
    ]);

    const allEmployees = employeeRows.results.map(row => JSON.parse(row.data_json) as Employee);
    const privilegedDirectoryAccess = DEMO_MODE || ['admin', 'hr', 'director', 'supervisor'].includes(signedInUser?.role ?? '');
    const employees = privilegedDirectoryAccess
      ? allEmployees
      : allEmployees.filter(employee => employee.site === signedInUser?.site).map(employee => ({
          ...employee,
          email: employee.id === signedInUser?.id ? employee.email : '',
          phone: '',
          address: '',
          contractStart: '',
          nationality: 'Not specified',
          certExpiry: '',
          visaExpiry: '',
        }));

    return {
      configured: true as const,
      employees,
      sites: siteRows.results.map(row => JSON.parse(row.data_json) as Site),
    };
  } catch (error) {
    console.error('Failed to read the shared demo directory from D1.', error);
    return { configured: false as const };
  }
});

