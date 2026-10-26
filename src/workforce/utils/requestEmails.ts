import type { Employee } from '../types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function reviewEmailsForSite(employees: Employee[], siteId?: string) {
  return employees
    .filter(employee => employee.active && (employee.role === 'hr' || (employee.role === 'supervisor' && (!siteId || employee.site === siteId))))
    .map(employee => employee.email.trim())
    .filter(email => EMAIL_PATTERN.test(email));
}

export function directorEmails(employees: Employee[]) {
  return employees.filter(employee => employee.active && employee.role === 'director')
    .map(employee => employee.email.trim())
    .filter(email => EMAIL_PATTERN.test(email));
}

export function openRequestEmailDraft(to: string[], cc: string[], subject: string, body: string) {
  const validTo = [...new Set(to.map(email => email.trim()).filter(email => EMAIL_PATTERN.test(email)))];
  if (!validTo.length || typeof window === 'undefined') return false;
  const validCc = [...new Set(cc.map(email => email.trim()).filter(email => EMAIL_PATTERN.test(email) && !validTo.includes(email)))];
  const query = new URLSearchParams({ subject, body });
  if (validCc.length) query.set('cc', validCc.join(','));
  window.location.href = `mailto:${validTo.map(encodeURIComponent).join(',')}?${query.toString()}`;
  return true;
}
