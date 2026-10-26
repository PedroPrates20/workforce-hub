import { useEffect, useState } from 'react';
import { ChevronsLeft, ChevronsRight, LogOut, Menu, X } from 'lucide-react';
import type { Lang } from '../types';
import { TABS, PROFILES, initials, roleColor } from '../constants';
import { useApp, useI18n } from '../context/AppContext';
import { BrandLogo } from './BrandLogo';

const STORAGE_KEY = 'epm_sidebar_collapsed';

export function Sidebar({ lang, setLang, onLogout }: { lang: Lang; setLang: (l: Lang) => void; onLogout: () => void }) {
  const { user, tab, setTab } = useApp();
  const { t: tr } = useI18n();
  const visibleTabs = TABS.filter(t => t.roles.includes(user.role));
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try { setCollapsed(localStorage.getItem(STORAGE_KEY) === '1'); } catch { /* ignore */ }
  }, []);

  const toggle = () => setCollapsed(c => {
    const next = !c;
    try { localStorage.setItem(STORAGE_KEY, next ? '1' : '0'); } catch { /* ignore */ }
    return next;
  });

  const go = (id: typeof tab) => { setTab(id); setMobileOpen(false); };

  const nav = (compact: boolean) => (
    <>
      <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
        {visibleTabs.map(t => {
          const active = tab === t.id;
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => go(t.id)} title={compact ? tr(t.label) : undefined} aria-label={tr(t.label)}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 h-11 rounded-md text-sm transition-colors ${compact ? 'justify-center' : 'px-3'} ${active ? 'bg-primary text-primary-foreground font-semibold' : 'text-nav-muted hover:bg-nav-hover hover:text-nav-foreground'}`}>
              <Icon className="size-5 shrink-0" />
              {!compact && <span className="truncate">{tr(t.label)}</span>}
            </button>
          );
        })}
      </nav>
      <div className="p-3 border-t border-nav-border flex flex-col gap-2">
        <div className={`flex items-center gap-3 ${compact ? 'justify-center' : 'px-1'}`} title={compact ? user.name : undefined}>
          <div className="size-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-primary-foreground" style={{ background: roleColor(user.role) }}>
            {initials(user.name)}
          </div>
          {!compact && (
            <div className="min-w-0">
              <div className="text-sm font-semibold text-nav-foreground truncate">{user.name}</div>
              <div className="text-xs text-primary font-semibold">{tr(PROFILES[user.role].title)}</div>
            </div>
          )}
        </div>
        <div className={`flex gap-1 ${compact ? 'flex-col' : ''}`}>
          {(['pt', 'en', 'ru', 'ro'] as Lang[]).map(l => (
            <button key={l} onClick={() => setLang(l)} aria-pressed={l === lang}
              className={`flex-1 h-8 rounded-md text-xs font-bold border ${l === lang ? 'border-primary text-primary bg-primary/15' : 'border-nav-border text-nav-muted hover:text-nav-foreground'}`}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        <button onClick={onLogout} title={compact ? tr('Logout') : undefined} aria-label={tr('Logout')}
          className={`flex items-center gap-3 h-11 rounded-md text-sm text-nav-muted hover:bg-nav-hover hover:text-nav-foreground ${compact ? 'justify-center' : 'px-3'}`}>
          <LogOut className="size-5" />
          {!compact && <span>{tr('Logout')}</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 h-14 bg-nav text-nav-foreground flex items-center justify-between px-4">
        <BrandLogo />
        <button onClick={() => setMobileOpen(true)} className="flex items-center gap-2 h-10 px-4 rounded-md border border-nav-border text-sm font-semibold">
          <Menu className="size-5" /> {tr('Menu')}
        </button>
      </div>
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-nav text-nav-foreground flex flex-col">
          <div className="h-14 flex items-center justify-between px-4 border-b border-nav-border">
            <BrandLogo />
            <button onClick={() => setMobileOpen(false)} className="flex items-center gap-2 h-10 px-4 rounded-md border border-nav-border text-sm font-semibold">
              <X className="size-5" /> {tr('Close')}
            </button>
          </div>
          {nav(false)}
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className={`hidden md:flex flex-col sticky top-0 h-screen shrink-0 bg-nav text-nav-foreground transition-[width] ${collapsed ? 'w-[72px]' : 'w-60'}`}>
        <div className={`h-16 flex items-center gap-2 px-3 border-b border-nav-border ${collapsed ? 'flex-col justify-center h-auto py-3' : 'justify-between'}`}>
          <BrandLogo />
          <button onClick={toggle} aria-label={collapsed ? tr('Expand menu') : tr('Collapse menu')}
            className="size-8 rounded-md border border-nav-border flex items-center justify-center text-nav-muted hover:text-nav-foreground hover:bg-nav-hover">
            {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
          </button>
        </div>
        {nav(collapsed)}
      </aside>
    </>
  );
}
