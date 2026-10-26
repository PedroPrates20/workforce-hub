import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
import { C, DAYS14, MOCK_CERTS, MOCK_INCIDENTS } from '../constants';
import { useApp, useI18n } from '../context/AppContext';
import type { Employee, Lang, Site } from '../types';
import { localeOf } from '../i18n';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type ReportKey = 'Hours per Employee' | 'Site Coverage' | 'Visa Compliance' | 'Monthly Incidents' | 'Expiring Certificates' | 'Swap Requests';

type ReportRow = Record<string, string | number>;
type ReportColumn = { key: string; label: string };
type ReportData = { columns: ReportColumn[]; rows: ReportRow[]; period: string; note?: string };
type ReportFilters = { from: string; to: string; siteId: string; employeeId: string };
const ALL_SITES = '__all_sites';
const ALL_EMPLOYEES = '__all_employees';

const dateValue = (value: string) => new Date(`${value.slice(0, 10)}T12:00:00Z`);

function formatDate(value: string | Date, lang: Lang) {
  const date = typeof value === 'string' ? dateValue(value) : value;
  return new Intl.DateTimeFormat(localeOf(lang), {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Dublin',
  }).format(date);
}

function formatNumber(value: number, lang: Lang, digits = 0) {
  return new Intl.NumberFormat(localeOf(lang), {
    minimumFractionDigits: digits, maximumFractionDigits: digits,
  }).format(value);
}

function buildReportData(report: ReportKey, lang: Lang, roster: ReturnType<typeof useApp>['roster'], swaps: ReturnType<typeof useApp>['swaps'], employees: Employee[], sitesData: Site[], filters: ReportFilters, t: (key: string, vars?: Record<string, string | number>) => string): ReportData {
  const allRecords = t('All available records');
  const rosterPeriod = `${formatDate(DAYS14[0]!, lang)} – ${formatDate(DAYS14[DAYS14.length - 1]!, lang)}`;
  const asHours = (value: number) => formatNumber(value, lang, 1);
  const siteName = (siteId: string) => sitesData.find(site => site.id === siteId)?.name ?? t('Unknown site');
  const employeeRecord = (empId: string) => employees.find(employee => employee.id === empId);
  const employeeName = (empId: string) => employees.find(employee => employee.id === empId)?.name ?? t('Unknown employee');
  const daysUntil = (value: string) => Math.ceil((dateValue(value).getTime() - Date.now()) / 86_400_000);
  const dateMatches = (value: string) => {
    const date = value.slice(0, 10);
    return (!filters.from || date >= filters.from) && (!filters.to || date <= filters.to);
  };
  const siteMatches = (siteId: string) => filters.siteId === ALL_SITES || filters.siteId === siteId;
  const employeeMatches = (empId: string) => filters.employeeId === ALL_EMPLOYEES || filters.employeeId === empId;
  const periodLabel = (fallback: string) => {
    if (filters.from && filters.to) return `${formatDate(filters.from, lang)} – ${formatDate(filters.to, lang)}`;
    if (filters.from) return `${t('From')} ${formatDate(filters.from, lang)}`;
    if (filters.to) return `${t('Up to')} ${formatDate(filters.to, lang)}`;
    return fallback;
  };
  const scheduledHours = (start: string, end: string) => {
    const [startHour, startMinute] = start.split(':').map(Number);
    const [endHour, endMinute] = end.split(':').map(Number);
    let minutes = endHour! * 60 + endMinute! - (startHour! * 60 + startMinute!);
    if (minutes <= 0) minutes += 24 * 60;
    return minutes / 60;
  };
  const matchingShifts = Object.entries(roster).flatMap(([date, day]) =>
    dateMatches(date) ? Object.entries(day).flatMap(([siteId, slots]) =>
      siteMatches(siteId) ? slots.filter(slot => employeeMatches(slot.empId)).map(slot => ({ date, siteId, slot })) : [],
    ) : [],
  );

  switch (report) {
    case 'Hours per Employee':
      {
      const byEmployeeAndSite = new Map<string, { empId: string; siteId: string; shifts: number; hours: number }>();
      matchingShifts.forEach(({ siteId, slot }) => {
        const key = `${slot.empId}:${siteId}`;
        const current = byEmployeeAndSite.get(key) ?? { empId: slot.empId, siteId, shifts: 0, hours: 0 };
        current.shifts += 1;
        current.hours += scheduledHours(slot.start, slot.end);
        byEmployeeAndSite.set(key, current);
      });
      return {
        period: periodLabel(rosterPeriod),
        columns: [
          { key: 'employee', label: t('Employee') }, { key: 'site', label: t('Site') },
          { key: 'shifts', label: t('Shifts') }, { key: 'hours', label: t('Scheduled hours') },
        ],
        rows: [...byEmployeeAndSite.values()].map(item => ({
          employee: employeeName(item.empId), site: siteName(item.siteId), shifts: item.shifts, hours: asHours(item.hours),
        })),
        note: t('OWTA checks normally review net working hours across the applicable reference period. In Ireland, the general limit is an average 48-hour week over four months, with exceptions. These app totals do not contain that history and do not determine compliance. Pay amounts are omitted because hourly rates are not configured.'),
      };
      }
    case 'Site Coverage': {
      const sites = sitesData.filter(site => siteMatches(site.id) && (site.active || filters.siteId !== ALL_SITES));
      const assignedBySite = new Map<string, number>();
      matchingShifts.forEach(({siteId})=>assignedBySite.set(siteId,(assignedBySite.get(siteId)??0)+1));
      const periodDays = new Set(Object.keys(roster).filter(dateMatches)).size;
      return {
        period: periodLabel(rosterPeriod),
        columns: [
          { key: 'site', label: t('Site') }, { key: 'client', label: t('Client') },
          { key: 'posts', label: t('Posts') }, { key: 'shifts', label: t('Assigned shifts') },
          { key: 'coverage', label: t('Indicative coverage') },
        ],
        rows: sites.map(site => {
          const shifts = assignedBySite.get(site.id) ?? 0;
          const coverage = site.postos > 0 && periodDays > 0 ? Math.min(100, shifts / (site.postos * periodDays) * 100) : 0;
          return { site: site.name, client: site.client, posts: site.postos, shifts, coverage: `${formatNumber(coverage, lang, 1)}%` };
        }),
        note: t('Coverage is an estimate of assigned shifts against active posts for the displayed roster period.'),
      };
    }
    case 'Visa Compliance': {
      const staffRows = employees.filter(employee => employee.active && employee.stamp && employeeMatches(employee.id) && siteMatches(employee.site) && dateMatches(employee.visaExpiry));
      const scheduledByEmployee = new Map<string, number>();
      matchingShifts.forEach(({slot})=>scheduledByEmployee.set(slot.empId,(scheduledByEmployee.get(slot.empId)??0)+scheduledHours(slot.start,slot.end)));
      return {
        period: t('Current permissions on file'),
        columns: [
          { key: 'employee', label: t('Employee') }, { key: 'permission', label: t('Immigration permission') },
          { key: 'hours', label: t('Scheduled hours') },
          { key: 'expiry', label: t('Permission expiry') }, { key: 'status', label: t('Record status') },
        ],
        rows: staffRows.map(employee => {
          const remaining = daysUntil(employee.visaExpiry);
          const status = remaining < 0 ? t('Expired') : remaining <= 90 ? t('Expires within 90 days') : t('Current');
          return {
            employee: employee.name, permission: employee.stamp!, hours: asHours(scheduledByEmployee.get(employee.id) ?? 0),
            expiry: formatDate(employee.visaExpiry, lang), status,
          };
        }),
        note: t('This summary shows permission records stored in the app. Verify the current permission and applicable conditions before making work or immigration decisions.'),
      };
    }
    case 'Monthly Incidents': {
      const latestIncident = [...MOCK_INCIDENTS].sort((a,b)=>dateValue(b.date).getTime()-dateValue(a.date).getTime())[0];
      const monthPeriod = latestIncident
        ? new Intl.DateTimeFormat(localeOf(lang),{month:'long',year:'numeric',timeZone:'Europe/Dublin'}).format(dateValue(latestIncident.date))
        : allRecords;
      const monthIncidents = MOCK_INCIDENTS.filter(incident=>
        dateMatches(incident.date) && siteMatches(incident.site) && employeeMatches(incident.reportedBy) &&
        ((filters.from || filters.to) || !latestIncident || incident.date.slice(0,7)===latestIncident.date.slice(0,7)),
      );
      return {
        period: periodLabel(monthPeriod),
        columns: [
          { key: 'id', label: t('Reference') }, { key: 'date', label: t('Date') },
          { key: 'site', label: t('Site') }, { key: 'type', label: t('Category') },
          { key: 'severity', label: t('Severity') }, { key: 'description', label: t('Description') },
        ],
        rows: monthIncidents.map(incident => ({
          id: incident.id.toUpperCase(), date: formatDate(incident.date, lang), site: siteName(incident.site),
          type: t(incident.type), severity: t(incident.severity[0].toUpperCase() + incident.severity.slice(1)), description: t(incident.description),
        })),
      };
    }
    case 'Expiring Certificates': {
      const certificates = MOCK_CERTS.map(certificate => {
        const remaining = daysUntil(certificate.expiry);
        const status = remaining < 0 ? t('Expired') : remaining <= 90 ? t('Expiring') : t('✓ Valid');
        return { certificate, remaining, status };
      }).filter(item => ((filters.from || filters.to) || item.remaining <= 90) && dateMatches(item.certificate.expiry) && employeeMatches(item.certificate.empId) && siteMatches(employeeRecord(item.certificate.empId)?.site ?? ''));
      return {
        period: t('Expired or due within 90 days'),
        columns: [
          { key: 'employee', label: t('Employee') }, { key: 'certificate', label: t('Certificate') },
          { key: 'expiry', label: t('Expiry date') }, { key: 'status', label: t('Record status') },
        ],
        rows: certificates.map(({ certificate, status }) => ({
          employee: employeeName(certificate.empId), certificate: t(certificate.type), expiry: formatDate(certificate.expiry, lang), status,
        })),
      };
    }
    case 'Swap Requests':
      return {
        period: allRecords,
        columns: [
          { key: 'date', label: t('Date') }, { key: 'site', label: t('Site') },
          { key: 'from', label: t('Employee') }, { key: 'to', label: t('Replacement') },
          { key: 'shift', label: t('Shift') }, { key: 'status', label: t('Status') },
        ],
        rows: swaps.filter(swap=>dateMatches(swap.date)&&siteMatches(swap.site)&&(employeeMatches(swap.from)||employeeMatches(swap.to))).map(swap => ({
          date: formatDate(swap.date, lang), site: siteName(swap.site), from: employeeName(swap.from),
          to: employeeName(swap.to), shift: swap.shift, status: t(swap.status[0].toUpperCase() + swap.status.slice(1)),
        })),
      };
  }
}

export function ReportPreviewModal({ report, onClose }: { report: ReportKey; onClose: () => void }) {
  const { roster, swaps, employees, sites } = useApp();
  const { lang, t } = useI18n();
  const [filters, setFilters] = useState<ReportFilters>({ from: '', to: '', siteId: ALL_SITES, employeeId: ALL_EMPLOYEES });
  const [siteSearch, setSiteSearch] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const matchingSites = sites.filter(site => site.name.toLowerCase().includes(siteSearch.trim().toLowerCase()));
  const matchingEmployees = employees.filter(employee => employee.name.toLowerCase().includes(employeeSearch.trim().toLowerCase()));
  const selectedSiteLabel = filters.siteId === ALL_SITES ? t('All sites') : sites.find(site => site.id === filters.siteId)?.name ?? t('All sites');
  const selectedEmployeeLabel = filters.employeeId === ALL_EMPLOYEES ? t('All employees') : employees.find(employee => employee.id === filters.employeeId)?.name ?? t('All employees');
  const appliedFilters = [
    filters.from && `${t('From date')}: ${formatDate(filters.from, lang)}`,
    filters.to && `${t('To date')}: ${formatDate(filters.to, lang)}`,
    `${t('Site')}: ${selectedSiteLabel}`,
    `${t('Employee')}: ${selectedEmployeeLabel}`,
  ].filter(Boolean).join(' · ');
  const data = buildReportData(report, lang, roster, swaps, employees, sites, filters, t);
  const generatedNow = new Date();
  const generatedAt = `${formatDate(generatedNow, lang)} ${new Intl.DateTimeFormat(localeOf(lang), { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Dublin' }).format(generatedNow)}`;

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return createPortal(
    <div className="report-preview-overlay" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(15,23,42,.58)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <section className="report-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="report-preview-title" onClick={event => event.stopPropagation()} style={{ width: 'min(1100px, 96vw)', maxHeight: '92vh', background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, boxShadow: '0 24px 64px rgba(15,23,42,.28)', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'inherit' }}>
        <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '18px 20px', borderBottom: `1px solid ${C.border}`, background: C.surface }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: C.gold, textTransform: 'uppercase', marginBottom: 4 }}>{t('Report preview')}</div>
            <h2 id="report-preview-title" style={{ margin: 0, color: C.text, fontSize: 19, fontWeight: 800 }}>{t(report)}</h2>
            <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{t('Internal operational report')}</div>
          </div>
          <button data-print-hide onClick={onClose} aria-label={t('Close')} style={{ width: 34, height: 34, flexShrink: 0, border: `1px solid ${C.border}`, borderRadius: 8, background: C.card, color: C.muted, cursor: 'pointer', display: 'grid', placeItems: 'center' }}><X size={17}/></button>
        </header>

        <div className="report-preview-content" style={{ padding: 20, overflow: 'auto' }}>
          <section data-print-hide aria-label={t('Report filters')} style={{ padding: 14, border: `1px solid ${C.border}`, borderRadius: 10, background: C.surface, marginBottom: 16 }}>
            <div style={{ color: C.text, fontSize: 12, fontWeight: 800, marginBottom: 10 }}>{t('Filter report')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, color: C.muted, fontSize: 10, fontWeight: 700 }}>
                {t('From date')}
                <input type="date" value={filters.from} max={filters.to||undefined} onChange={event=>setFilters(current=>({...current,from:event.target.value}))} style={{ width: '100%', height: 38, boxSizing: 'border-box', padding: '0 9px', border: `1px solid ${C.border}`, borderRadius: 7, background: C.card, color: C.text, fontFamily: 'inherit', fontSize: 12 }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, color: C.muted, fontSize: 10, fontWeight: 700 }}>
                {t('To date')}
                <input type="date" value={filters.to} min={filters.from||undefined} onChange={event=>setFilters(current=>({...current,to:event.target.value}))} style={{ width: '100%', height: 38, boxSizing: 'border-box', padding: '0 9px', border: `1px solid ${C.border}`, borderRadius: 7, background: C.card, color: C.text, fontFamily: 'inherit', fontSize: 12 }} />
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label htmlFor="report-site-search" style={{ color: C.muted, fontSize: 10, fontWeight: 700 }}>{t('Site')}</label>
                <input id="report-site-search" value={siteSearch} onChange={event=>setSiteSearch(event.target.value)} placeholder={t('Search sites...')} style={{ width: '100%', height: 38, boxSizing: 'border-box', padding: '0 9px', border: `1px solid ${C.border}`, borderRadius: 7, background: C.card, color: C.text, fontFamily: 'inherit', fontSize: 12, marginBottom: 2 }} />
                <Select value={filters.siteId} onValueChange={siteId=>setFilters(current=>({...current,siteId}))}>
                  <SelectTrigger aria-label={t('Site')} className="h-[38px] w-full rounded-lg border-[#e2e6ec] bg-white px-2 text-xs text-[#1b2638] shadow-none focus:ring-1 focus:ring-[#e8661c]"><SelectValue>{selectedSiteLabel}</SelectValue></SelectTrigger>
                  <SelectContent className="border-[#e2e6ec] bg-white text-[#1b2638]">
                    <SelectItem value={ALL_SITES} className="text-xs">{t('All sites')}</SelectItem>
                    {matchingSites.map(site=><SelectItem key={site.id} value={site.id} className="text-xs">{site.name}</SelectItem>)}
                    {matchingSites.length===0&&<SelectItem value="__no_sites" disabled className="text-xs text-[#5d6b80]">{t('No sites found')}</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label htmlFor="report-employee-search" style={{ color: C.muted, fontSize: 10, fontWeight: 700 }}>{t('Employee')}</label>
                <input id="report-employee-search" value={employeeSearch} onChange={event=>setEmployeeSearch(event.target.value)} placeholder={t('Search employees...')} style={{ width: '100%', height: 38, boxSizing: 'border-box', padding: '0 9px', border: `1px solid ${C.border}`, borderRadius: 7, background: C.card, color: C.text, fontFamily: 'inherit', fontSize: 12, marginBottom: 2 }} />
                <Select value={filters.employeeId} onValueChange={employeeId=>setFilters(current=>({...current,employeeId}))}>
                  <SelectTrigger aria-label={t('Employee')} className="h-[38px] w-full rounded-lg border-[#e2e6ec] bg-white px-2 text-xs text-[#1b2638] shadow-none focus:ring-1 focus:ring-[#e8661c]"><SelectValue>{selectedEmployeeLabel}</SelectValue></SelectTrigger>
                  <SelectContent className="border-[#e2e6ec] bg-white text-[#1b2638]">
                    <SelectItem value={ALL_EMPLOYEES} className="text-xs">{t('All employees')}</SelectItem>
                    {matchingEmployees.map(employee=><SelectItem key={employee.id} value={employee.id} className="text-xs">{employee.name}</SelectItem>)}
                    {matchingEmployees.length===0&&<SelectItem value="__no_employees" disabled className="text-xs text-[#5d6b80]">{t('No employees found')}</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button onClick={()=>{setFilters({from:'',to:'',siteId:ALL_SITES,employeeId:ALL_EMPLOYEES});setSiteSearch('');setEmployeeSearch('');}} style={{ border: 'none', background: 'transparent', color: C.gold, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{t('Clear filters')}</button>
            </div>
          </section>

          <div className="report-applied-filters" style={{display:'none',marginBottom:14,color:C.muted,fontSize:11,lineHeight:1.5}}><strong style={{color:C.text}}>{t('Applied filters')}: </strong>{appliedFilters}</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(145px,1fr))', gap: 10, marginBottom: 18 }}>
            {[
              [t('Country'), t('Ireland')], [t('Reporting period'), data.period],
              [t('Generated on'), generatedAt], [t('Time zone'), 'Europe/Dublin'],
              [t('Currency'), 'EUR (€)'], [t('Date format'), 'DD/MM/YYYY'],
            ].map(([label, value]) => <div key={label} style={{ minWidth: 0, padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.card }}>
              <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, marginBottom: 4 }}>{label}</div>
              <div style={{ color: C.text, fontSize: 12, fontWeight: 700, overflowWrap: 'anywhere' }}>{value}</div>
            </div>)}
          </div>

          <div style={{ border: `1px solid ${C.border}`, borderRadius: 9, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto', maxHeight: '48vh' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680, fontSize: 12 }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: C.surface }}><tr>
                  {data.columns.map(column => <th key={column.key} scope="col" style={{ padding: '10px 12px', textAlign: 'left', color: C.text, fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap', borderBottom: `1px solid ${C.border}` }}>{column.label}</th>)}
                </tr></thead>
                <tbody>{data.rows.length ? data.rows.map((row,index) => <tr key={index} style={{ background: index%2===0?C.card:'#fafbfc' }}>
                  {data.columns.map(column => <td key={column.key} style={{ padding: '9px 12px', color: C.text, verticalAlign: 'top', borderBottom: `1px solid ${C.border}`, whiteSpace: column.key==='description'?'normal':'nowrap', maxWidth: column.key==='description'?360:undefined }}>{row[column.key]}</td>)}
                </tr>) : <tr><td colSpan={data.columns.length} style={{ padding: 24, color: C.muted, textAlign: 'center' }}>{t('No records to display')}</td></tr>}</tbody>
              </table>
            </div>
          </div>

          {data.note && <p style={{ margin: '14px 2px 0', color: C.muted, fontSize: 11, lineHeight: 1.5 }}>{data.note}</p>}
          {report === 'Hours per Employee' && <a href="https://workplacerelations.ie/en/what_you_should_know/hours-and-wages/" target="_blank" rel="noreferrer" style={{ display: 'inline-block', margin: '4px 2px 0', color: C.gold, fontSize: 11, fontWeight: 700 }}>{t('WRC working hours guidance')}</a>}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}`, color: C.muted, fontSize: 10 }}>
            <span>{t('Workforce Hub · Internal')}</span><span>{t('{n} records',{n:data.rows.length})}</span>
          </div>
        </div>
        <footer data-print-hide style={{display:'flex',justifyContent:'flex-end',padding:'12px 20px',borderTop:`1px solid ${C.border}`,background:C.surface}}>
          <button onClick={()=>window.print()} style={{display:'inline-flex',alignItems:'center',gap:8,padding:'9px 15px',border:0,borderRadius:7,background:C.gold,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}><Printer size={15}/>{t('Generate PDF')}</button>
        </footer>
      </section>
    </div>, document.body,
  );
}
