import React, { useEffect, useState } from 'react';
import type { User, Tab, Lang, RosterData, Site, Employee, SupplyRequest, HolidayRequest, HolidayBlock } from './types';
import { C, DEMO_MODE, MOCK_SITES, MOCK_SWAPS, MOCK_EMPLOYEES, buildSeedRoster, TABS } from './constants';
import { Ctx } from './context/AppContext';

import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';

import { Dashboard } from './pages/Dashboard';
import { Roster } from './pages/Roster';
import { TeamStatus } from './pages/TeamStatus';
import { Sites } from './pages/Sites';
import { Swaps } from './pages/Swaps';
import { Supplies } from './pages/Supplies';
import { Certs } from './pages/Certs';
import { Incidents } from './pages/Incidents';
import { Ponto } from './pages/Ponto';
import { Reports } from './pages/Reports';
import { Audit } from './pages/Audit';

const TAB_COMPONENTS: Record<Tab, () => React.ReactElement> = {
  dashboard: Dashboard,
  roster: Roster,
  team: TeamStatus,
  sites: Sites,
  swaps: Swaps,
  supplies: Supplies,
  reports: Reports,
  certs: Certs,
  ponto: Ponto,
  audit: Audit,
  incidents: Incidents,
};

export default function WorkforceApp() {
  const [user, setUser] = useState<User | null>(null);
  const [lang, setLangState] = useState<Lang>("en");
  // Lê o idioma salvo só depois da montagem (evita diferença entre servidor e navegador).
  useEffect(() => {
    try { const v = localStorage.getItem("epm_lang"); if (v === "pt" || v === "en" || v === "ru" || v === "ro") setLangState(v); } catch { /* ignore */ }
  }, []);
  useEffect(() => { document.documentElement.lang = ({pt:"pt-IE",en:"en-IE",ru:"ru-RU",ro:"ro-RO"} as const)[lang]; }, [lang]);
  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("epm_lang", l); } catch { /* ignore */ }
  };
  const [tab, setTab] = useState<Tab>("dashboard");
  const [roster, setRoster] = useState<RosterData>(()=>DEMO_MODE?buildSeedRoster():{});
  const [swaps, setSwaps] = useState(MOCK_SWAPS);
  const [supplyRequests, setSupplyRequests] = useState<SupplyRequest[]>([]);
  const [supplyRequestsLoaded, setSupplyRequestsLoaded] = useState(false);
  const [holidayRequests, setHolidayRequests] = useState<HolidayRequest[]>([]);
  const [holidayRequestsLoaded, setHolidayRequestsLoaded] = useState(false);
  const [holidayBlocks, setHolidayBlocks] = useState<HolidayBlock[]>([]);
  const [holidayBlocksLoaded, setHolidayBlocksLoaded] = useState(false);
  const [sites, setSites] = useState<Site[]>(MOCK_SITES);
  const [sitesLoaded, setSitesLoaded] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES);
  const [employeesLoaded, setEmployeesLoaded] = useState(false);

  useEffect(() => {
    if(!DEMO_MODE){setSupplyRequestsLoaded(true);return;}
    try {
      const saved = localStorage.getItem('epm_supply_requests');
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every(request => request && typeof request.id==='string' && typeof request.employeeId==='string' && typeof request.siteId==='string' && typeof request.item==='string' && Number.isFinite(request.quantity) && ['pending','approved','rejected'].includes(request.status))) {
          setSupplyRequests(parsed as SupplyRequest[]);
        }
      }
    } catch { /* ignore invalid local request data */ }
    setSupplyRequestsLoaded(true);
  }, []);

  useEffect(() => {
    if (!DEMO_MODE || !supplyRequestsLoaded) return;
    try { localStorage.setItem('epm_supply_requests', JSON.stringify(supplyRequests)); } catch { /* ignore storage failures */ }
  }, [supplyRequests, supplyRequestsLoaded]);

  useEffect(() => {
    if(!DEMO_MODE){setHolidayRequestsLoaded(true);return;}
    try {
      const saved = localStorage.getItem('epm_holiday_requests');
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every(request => request && typeof request.id==='string' && typeof request.employeeId==='string' && /^\d{4}-\d{2}-\d{2}$/.test(request.startDate) && /^\d{4}-\d{2}-\d{2}$/.test(request.endDate) && Number.isInteger(request.workingDays) && ['pending_hr','pending_director','approved','rejected'].includes(request.status))) {
          setHolidayRequests(parsed as HolidayRequest[]);
        }
      }
    } catch { /* ignore invalid holiday request data */ }
    setHolidayRequestsLoaded(true);
  }, []);

  useEffect(() => {
    if (!DEMO_MODE || !holidayRequestsLoaded) return;
    try { localStorage.setItem('epm_holiday_requests', JSON.stringify(holidayRequests)); } catch { /* ignore storage failures */ }
  }, [holidayRequests, holidayRequestsLoaded]);

  useEffect(() => {
    if (!DEMO_MODE) { setHolidayBlocksLoaded(true); return; }
    try {
      const saved = localStorage.getItem('epm_holiday_blocks');
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every(block => block && typeof block.id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(block.startDate) && /^\d{4}-\d{2}-\d{2}$/.test(block.endDate) && block.endDate >= block.startDate && ['month', 'week'].includes(block.kind) && typeof block.createdBy === 'string')) {
          setHolidayBlocks(parsed as HolidayBlock[]);
        }
      }
    } catch { /* ignore invalid holiday block data */ }
    setHolidayBlocksLoaded(true);
  }, []);

  useEffect(() => {
    if (!DEMO_MODE || !holidayBlocksLoaded) return;
    try { localStorage.setItem('epm_holiday_blocks', JSON.stringify(holidayBlocks)); } catch { /* ignore storage failures */ }
  }, [holidayBlocks, holidayBlocksLoaded]);

  useEffect(() => {
    if(!DEMO_MODE){setEmployeesLoaded(true);return;}
    try {
      const saved = localStorage.getItem('epm_employees');
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every(employee => employee && typeof employee.id === 'string' && typeof employee.name === 'string' && typeof employee.email === 'string')) {
          setEmployees((parsed as Employee[]).map(employee=>({...employee,holidayEntitlement:employee.holidayEntitlement??30})));
        }
      }
    } catch { /* ignore invalid employee data */ }
    setEmployeesLoaded(true);
  }, []);

  useEffect(() => {
    if (!DEMO_MODE || !employeesLoaded) return;
    try { localStorage.setItem('epm_employees', JSON.stringify(employees)); } catch { /* ignore storage failures */ }
  }, [employees, employeesLoaded]);

  useEffect(() => {
    setUser(current => current ? employees.find(employee => employee.id === current.id) ?? null : null);
  }, [employees]);

  useEffect(() => {
    if(!DEMO_MODE){setSitesLoaded(true);return;}
    try {
      const saved = localStorage.getItem('epm_sites');
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every(site => site && typeof site.id === 'string' && typeof site.name === 'string')) {
          setSites(parsed as Site[]);
        }
      }
    } catch { /* ignore invalid local site data */ }
    setSitesLoaded(true);
  }, []);

  useEffect(() => {
    if (!DEMO_MODE || !sitesLoaded) return;
    try { localStorage.setItem('epm_sites', JSON.stringify(sites)); } catch { /* ignore storage failures */ }
  }, [sites, sitesLoaded]);

  if (!user) {
    return <Login employees={employees} onLogin={u => { setUser(u); setTab("dashboard"); }} lang={lang} setLang={setLang} />;
  }

  const tabAllowed=TABS.some(item=>item.id===tab&&item.roles.includes(user.role));
  const safeTab:Tab=tabAllowed?tab:'dashboard';
  const TabComponent = TAB_COMPONENTS[safeTab] || Dashboard;

  return (
    <Ctx.Provider value={{ user, lang, tab:safeTab, setTab, roster, setRoster, swaps, setSwaps, supplyRequests, setSupplyRequests, holidayRequests, setHolidayRequests, holidayBlocks, setHolidayBlocks, sites, setSites, employees, setEmployees }}>
      <div style={{ display: "flex", minHeight: "100vh", background: C.bg, fontFamily:"inherit", color: C.text }}>
        <Sidebar lang={lang} setLang={setLang} onLogout={() => setUser(null)} />
        <main className="pt-14 md:pt-0" style={{ flex: 1, minWidth: 0 }}>
          <TabComponent />
        </main>
      </div>
    </Ctx.Provider>
  );
}
