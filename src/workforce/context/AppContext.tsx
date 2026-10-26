import React, { createContext, useContext } from 'react';
import type { User, Tab, Lang, RosterData, SwapRequest, SupplyRequest, HolidayRequest, HolidayBlock, Site, Employee } from '../types';
import { makeT } from '../i18n';

interface AppCtx {
  user: User;
  lang: Lang;
  tab: Tab;
  setTab: (t: Tab) => void;
  roster: RosterData;
  setRoster: React.Dispatch<React.SetStateAction<RosterData>>;
  swaps: SwapRequest[];
  setSwaps: React.Dispatch<React.SetStateAction<SwapRequest[]>>;
  supplyRequests: SupplyRequest[];
  setSupplyRequests: React.Dispatch<React.SetStateAction<SupplyRequest[]>>;
  holidayRequests: HolidayRequest[];
  setHolidayRequests: React.Dispatch<React.SetStateAction<HolidayRequest[]>>;
  holidayBlocks: HolidayBlock[];
  setHolidayBlocks: React.Dispatch<React.SetStateAction<HolidayBlock[]>>;
  sites: Site[];
  setSites: React.Dispatch<React.SetStateAction<Site[]>>;
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
}

export const Ctx = createContext<AppCtx>(null!);
export const useApp = () => useContext(Ctx);
export const useI18n = () => { const { lang } = useApp(); return { lang, t: makeT(lang) }; };
