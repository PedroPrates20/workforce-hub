import { LayoutDashboard, CalendarDays, Users, MapPin, ArrowLeftRight, Package, BarChart3, FileBadge, Clock, Camera, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { Role, Tab, Employee, Site, SwapRequest, Incident, Certificate, RosterData } from './types';

// Enable fictional sample data in explicitly built demo deployments as well as local development.
export const DEMO_MODE = import.meta.env.DEV || import.meta.env.MODE === 'demo' || import.meta.env.VITE_DEMO_MODE === 'true';

export const C = {
  bg: "#f4f6f9",
  header: "#1b2638",
  surface: "#eef1f5",
  gold: "#e8661c",
  goldLight: "#f59e0b",
  card: "#ffffff",
  border: "#e2e6ec",
  text: "#1b2638",
  muted: "#5d6b80",
  green: "#10b981",
  red: "#ef4444",
  blue: "#3b82f6",
};

export const PROFILES: Record<Role, { label: string; title: string; color: string }> = {
  cleaner:    { label: "Operational", title: "CLEANER / OP",    color: "#3b82f6" },
  security:   { label: "Security",    title: "SECURITY",         color: "#8b5cf6" },
  supervisor: { label: "Supervisor",  title: "SUPERVISOR",       color: "#10b981" },
  hr:         { label: "HR",          title: "HR MANAGER",       color: "#f59e0b" },
  director:   { label: "Director",    title: "DIRECTOR / ADMIN", color: "#d97706" },
};

export const TABS: { id: Tab; label: string; icon: LucideIcon; roles: Role[] }[] = [
  { id: "dashboard",  label: "Dashboard",        icon: LayoutDashboard, roles: ["cleaner","security","supervisor","hr","director"] },
  { id: "roster",     label: "Roster / E-mail",  icon: CalendarDays, roles: ["supervisor","hr","director"] },
  { id: "team",       label: "Team Status",      icon: Users, roles: ["supervisor","hr","director"] },
  { id: "sites",      label: "Sites & Posts",    icon: MapPin, roles: ["hr","director"] },
  { id: "swaps",      label: "Swaps & Requests", icon: ArrowLeftRight, roles: ["cleaner","security","supervisor","hr","director"] },
  { id: "supplies",   label: "Supply Requests",  icon: Package, roles: ["cleaner","security","supervisor","hr","director"] },
  { id: "reports",    label: "Reports",          icon: BarChart3, roles: ["supervisor","hr","director"] },
  { id: "certs",      label: "Certificates",     icon: FileBadge, roles: ["hr","director"] },
  { id: "ponto",      label: "Clock In/Out",     icon: Clock, roles: ["cleaner","security","supervisor","hr","director"] },
  { id: "audit",      label: "Visual Audit",     icon: Camera, roles: ["supervisor","hr","director"] },
  { id: "incidents",  label: "Incidents",        icon: TriangleAlert, roles: ["security","supervisor","hr","director"] },
];

const EXTRA_EMPLOYEE_NAMES = [
  "Aisling Keane", "Niall Keane", "Maeve Keane", "Cillian Keane", "Tara Keane",
  "Ronan Keane", "Saoirse Keane", "Dara Keane", "Erin Keane", "Kieran Keane",
  "Aisling Sloane", "Niall Sloane", "Maeve Sloane", "Cillian Sloane", "Tara Sloane",
  "Ronan Sloane", "Saoirse Sloane", "Dara Sloane", "Erin Sloane", "Kieran Sloane",
  "Aisling Byrne", "Niall Byrne", "Maeve Byrne", "Cillian Byrne", "Tara Byrne",
  "Ronan Byrne", "Saoirse Byrne", "Dara Byrne", "Erin Byrne", "Kieran Byrne",
  "Aisling Dwyer", "Niall Dwyer", "Maeve Dwyer", "Cillian Dwyer", "Tara Dwyer",
  "Ronan Dwyer", "Saoirse Dwyer", "Dara Dwyer", "Erin Dwyer", "Kieran Dwyer",
  "Aisling Mercer", "Niall Mercer", "Maeve Mercer", "Cillian Mercer", "Tara Mercer",
  "Ronan Mercer", "Saoirse Mercer", "Dara Mercer", "Erin Mercer", "Kieran Mercer",
];
const EXTRA_SITE_NAMES = ["Ashford", "Copperleaf", "Eastbank", "Foxglove", "Glenhaven", "Highmoor", "Juniper", "Kingswell", "Longmere", "Mossfield"]
  .flatMap(name => ["Business Centre", "Office Quarter", "Distribution Park", "Retail Village", "Operations Campus"].map(type => `${name} ${type}`));

export const MOCK_EMPLOYEES: Employee[] = DEMO_MODE ? [
  { id:"e1", name:"Amara Bennett", role:"supervisor", title:"SUPERVISOR",   email:"employee001@example.com", stamp:"Stamp 4", hoursUsed:72, hoursLimit:160, holidayBalance:14, holidayEntitlement:30, site:"s1", phone:"000-000-0001", nationality:"Not specified", certExpiry:"2099-12-01", visaExpiry:"2099-08-01", active:true },
  { id:"e2", name:"Noah Walsh", role:"cleaner",    title:"CLEANER / OP", email:"employee002@example.com", stamp:"Stamp 2", hoursUsed:36, hoursLimit:80, holidayBalance:7, holidayEntitlement:30, site:"s2", phone:"000-000-0002", nationality:"Not specified", certExpiry:"2099-09-15", visaExpiry:"2099-11-30", active:true },
  { id:"e3", name:"Leila Monroe", role:"cleaner",    title:"CLEANER / OP", email:"employee003@example.com", stamp:"Stamp 4", hoursUsed:64, hoursLimit:160, holidayBalance:10, holidayEntitlement:30, site:"s3", phone:"000-000-0003", nationality:"Not specified", certExpiry:"2099-03-20", visaExpiry:"2099-01-15", active:true },
  { id:"e4", name:"Theo Carrick", role:"cleaner",    title:"CLEANER / OP", email:"employee004@example.com", stamp:"Stamp 2", hoursUsed:40, hoursLimit:80, holidayBalance:5, holidayEntitlement:30, site:"s4", phone:"000-000-0004", nationality:"Not specified", certExpiry:"2099-08-30", visaExpiry:"2099-10-01", active:true },
  { id:"e5", name:"Erin Caldwell", role:"hr",         title:"HR MANAGER",   email:"employee005@example.com", stamp:null,      hoursUsed:88, hoursLimit:160, holidayBalance:21, holidayEntitlement:30, site:"s5", phone:"000-000-0005", nationality:"Not specified", certExpiry:"2099-01-01", visaExpiry:"2099-01-01", active:true },
  { id:"e6", name:"Idris Quinn", role:"security",   title:"SECURITY",     email:"employee006@example.com", stamp:"Stamp 4", hoursUsed:48, hoursLimit:160, holidayBalance:12, holidayEntitlement:30, site:"s1", phone:"000-000-0006", nationality:"Not specified", certExpiry:"2099-11-11", visaExpiry:"2099-06-30", active:true },
  { id:"e7", name:"Maya Kavanagh", role:"cleaner",    title:"CLEANER / OP", email:"employee007@example.com", stamp:"Stamp 2", hoursUsed:76, hoursLimit:80, holidayBalance:3, holidayEntitlement:30, site:"s2", phone:"000-000-0007", nationality:"Not specified", certExpiry:"2099-07-20", visaExpiry:"2099-09-10", active:true },
  { id:"e8", name:"Owen Clarke", role:"cleaner",    title:"CLEANER / OP", email:"employee008@example.com", stamp:"Stamp 4", hoursUsed:56, hoursLimit:160, holidayBalance:18, holidayEntitlement:30, site:"s3", phone:"000-000-0008", nationality:"Not specified", certExpiry:"2099-05-01", visaExpiry:"2099-03-01", active:false },
  { id:"e9", name:"Rowan Fitzgerald", role:"director",   title:"DIRECTOR",     email:"employee009@example.com", stamp:null,      hoursUsed:0, hoursLimit:999, holidayBalance:25, holidayEntitlement:30, site:"s1", phone:"000-000-0009", nationality:"Not specified", certExpiry:"2099-01-01", visaExpiry:"2099-01-01", active:true },
  ...EXTRA_EMPLOYEE_NAMES.map((name,index): Employee => ({
    id:`e${index+10}`, name, role:index%8===0?"security":"cleaner",
    title:index%8===0?"SECURITY":"CLEANER / OP",
    email:`employee${String(index+10).padStart(3,"0")}@example.com`, stamp:index%3===0?"Stamp 4":"Stamp 2",
    hoursUsed:32+(index%7)*8, hoursLimit:index%3===0?160:80, holidayBalance:5+(index%18), holidayEntitlement:30,
    site:`s${index%55+1}`, phone:"000-000-0000",
    nationality:"Not specified",
    certExpiry:"2099-06-30", visaExpiry:index%4===0?"2099-01-01":"2099-12-31", active:true,
  })),
 ] : [];

export const MOCK_SITES: Site[] = DEMO_MODE ? [
  { id:"s1", name:"Northstar Business Centre", address:"Sample District 01, Ireland", client:"Example Property Group 01", active:true,  postos:3 },
  { id:"s2", name:"Harbourlight Logistics Hub", address:"Sample District 02, Ireland", client:"Example Property Group 02", active:true,  postos:5 },
  { id:"s3", name:"Cedarstone Tower", address:"Sample District 03, Ireland", client:"Example Property Group 03", active:true,  postos:2 },
  { id:"s4", name:"Larkspur Retail Park", address:"Sample District 04, Ireland", client:"Example Property Group 04", active:true,  postos:4 },
  { id:"s5", name:"Silverfern Operations Campus", address:"Sample District 05, Ireland", client:"Example Property Group 05", active:false, postos:2 },
  ...EXTRA_SITE_NAMES.map((name,index): Site => ({
    id:`s${index+6}`, name, address:`Sample District ${String(index+6).padStart(2, "0")}, Ireland`,
    client:`Example Property Group ${String(index%5+1).padStart(2, "0")}`,
    active:true, postos:2+index%5,
  })),
 ] : [];

export const MOCK_SWAPS: SwapRequest[] = DEMO_MODE ? [
  { id:"sw1", from:"e2", to:"e7", date:"2025-06-18", site:"s2", shift:"07:00–15:00", status:"pending",  reason:"Medical appointment" },
  { id:"sw2", from:"e3", to:"e4", date:"2025-06-20", site:"s3", shift:"15:00–23:00", status:"approved", reason:"Personal commitments" },
  { id:"sw3", from:"e6", to:"e2", date:"2025-06-22", site:"s1", shift:"23:00–07:00", status:"rejected", reason:"Transport issues" },
 ] : [];

export const MOCK_INCIDENTS: Incident[] = DEMO_MODE ? [
  { id:"i1", reportedBy:"e6", site:"s1", date:"2025-06-15", type:"Unauthorized Access", description:"Person without badge attempted to access 3rd floor.", severity:"high" },
  { id:"i2", reportedBy:"e6", site:"s2", date:"2025-06-14", type:"Property Damage",    description:"Reception glass broken.", severity:"medium" },
  { id:"i3", reportedBy:"e3", site:"s3", date:"2025-06-13", type:"Equipment Failure",  description:"Vacuum cleaner out of order in hallway B.", severity:"low" },
 ] : [];

export const MOCK_CERTS: Certificate[] = DEMO_MODE ? [
  { empId:"e1", name:"Amara Bennett", type:"Safe Pass",       expiry:"2099-12-01", status:"valid" },
  { empId:"e2", name:"Noah Walsh", type:"Manual Handling", expiry:"2099-09-15", status:"valid" },
  { empId:"e4", name:"Theo Carrick", type:"Safe Pass",       expiry:"2099-08-30", status:"valid" },
  { empId:"e6", name:"Idris Quinn", type:"PSA Licence",     expiry:"2099-11-11", status:"valid" },
  { empId:"e7", name:"Maya Kavanagh", type:"Safe Pass",       expiry:"2099-07-20", status:"valid" },
  { empId:"e3", name:"Leila Monroe", type:"HACCP",           expiry:"2099-03-20", status:"valid" },
 ] : [];

export const DOW_EN = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
export const SHIFT_PRESETS = [
  { label:"Morning", start:"07:00", end:"15:00", color:"#0369a1", bg:"#e0f2fe" },
  { label:"Day",     start:"09:00", end:"17:00", color:"#065f46", bg:"#d1fae5" },
  { label:"Evening", start:"15:00", end:"23:00", color:"#92400e", bg:"#fef3c7" },
  { label:"Night",   start:"23:00", end:"07:00", color:"#5b21b6", bg:"#ede9fe" },
];

const periodStart = new Date();
periodStart.setHours(0,0,0,0);
periodStart.setDate(periodStart.getDate()-((periodStart.getDay()+6)%7));
export const PERIOD_START = periodStart;
export const DAYS14 = Array.from({length:14},(_,i)=>{ const d=new Date(PERIOD_START); d.setDate(d.getDate()+i); return d; });

// Utility Functions
export const fmt = (d:Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
export const initials = (n:string) => n.split(" ").slice(0,2).map(x=>x[0]).join("").toUpperCase();
export const roleColor = (r:Role) => PROFILES[r].color;

// Demo roster so the e-mail preview has data out of the box.
// To start with an empty roster again, use useState<RosterData>({}) in App.tsx.
// `days` = one char per weekday, Sun..Sat ("1" = works that day).
export const buildSeedRoster = (): RosterData => {
  const plan = [
    { site:"s1", emp:"e1", start:"07:00", end:"15:00", days:"0111110" },
    { site:"s1", emp:"e6", start:"23:00", end:"07:00", days:"1100011" },
    { site:"s2", emp:"e2", start:"07:00", end:"15:00", days:"0101010" },
    { site:"s2", emp:"e7", start:"15:00", end:"23:00", days:"0001001" },
    { site:"s3", emp:"e3", start:"09:00", end:"17:00", days:"0111110" },
    { site:"s4", emp:"e4", start:"15:00", end:"23:00", days:"0010100" },
  ];
  const r: RosterData = {};
  DAYS14.forEach(d => {
    plan.forEach(p => {
      if (p.days[d.getDay()] !== "1") return;
      const day = r[fmt(d)] || (r[fmt(d)] = {});
      (day[p.site] || (day[p.site] = [])).push({ empId: p.emp, start: p.start, end: p.end });
    });
  });
  return r;
};

export const stampColor = (s:string|null) => s==="Stamp 2"?"#f59e0b":s==="Stamp 4"?"#10b981":"#64748b";
