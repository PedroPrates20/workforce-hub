export type Role = "cleaner" | "security" | "supervisor" | "hr" | "director";
export type RosterStaffFilter = "all" | "cleaner" | "security";
export type Tab = "dashboard" | "roster" | "team" | "sites" | "swaps" | "supplies" | "reports" | "certs" | "ponto" | "audit" | "incidents";
export type Lang = "pt" | "en" | "ru" | "ro";

export interface User {
  id: string;
  name: string;
  role: Role;
  title: string;
  email: string;
  stamp: "Stamp 2" | "Stamp 4" | null;
  hoursUsed: number;
  hoursLimit: number;
  holidayBalance: number;
  holidayEntitlement?: number;
  site: string;
}

export interface Employee extends User {
  phone: string;
  address?: string;
  contractStart?: string;
  nationality: string;
  certExpiry: string;
  visaExpiry: string;
  active: boolean;
}

export interface Site {
  id: string;
  name: string;
  address: string;
  client: string;
  active: boolean;
  postos: number;
  latitude?: number;
  longitude?: number;
  geofenceRadius?: number;
  cleanersRequired?: number;
  securityRequired?: number;
  buildingManagerPhone?: string;
  openingHours?: string;
}

export interface ShiftSlot {
  empId: string;
  start: string;
  end: string;
}

export interface RosterDay {
  [siteId: string]: ShiftSlot[];
}

export interface RosterData {
  [dayKey: string]: RosterDay;
}

export interface SwapRequest {
  id: string;
  from: string;
  to: string;
  date: string;
  site: string;
  shift: string;
  status: "pending" | "approved" | "rejected";
  reason: string;
  medicalCertificate?: { name: string; mimeType: string; dataUrl: string };
}

export interface HolidayRequest {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  workingDays: number;
  status: "pending_hr" | "pending_director" | "approved" | "rejected";
  submittedAt: string;
  hrReviewedBy?: string;
  hrReviewedAt?: string;
  directorReviewedBy?: string;
  directorReviewedAt?: string;
}

export interface HolidayBlock {
  id: string;
  startDate: string;
  endDate: string;
  kind: "month" | "week";
  createdBy: string;
  createdAt: string;
}

export interface SupplyRequest {
  id: string;
  employeeId: string;
  siteId: string;
  category: "Cleaning supplies" | "Security equipment" | "PPE" | "Other";
  item: string;
  quantity: number;
  details: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface Incident {
  id: string;
  reportedBy: string;
  site: string;
  date: string;
  type: string;
  description: string;
  severity: "low" | "medium" | "high";
}

export interface Certificate {
  empId: string;
  name: string;
  type: string;
  expiry: string;
  status: "valid" | "expiring" | "expired";
}
