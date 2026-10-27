import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useApp, useI18n } from '../context/AppContext';
import { useIsMobile } from '@/hooks/use-mobile';
import type { RosterData, Employee, RosterStaffFilter } from '../types';
import { C, SHIFT_PRESETS, DAYS14, fmt, initials, roleColor } from '../constants';
import { DOW, MONTHS, dayLabel, periodLabel, rangeLabel } from '../i18n';

/* ------------------------------ helpers ------------------------------ */
const EMAIL_FONT = "Arial, Helvetica, sans-serif";
const PREVIEW_DAYS = DAYS14;

const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;
const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return (h ?? 0) * 60 + (m ?? 0); };
const hoursOf = (s: string, e: string) => ((toMin(e) - toMin(s) + 1440) % 1440) / 60; // handles night shifts (23:00–07:00)
const fmtH = (h: number) => `${Math.round(h * 10) / 10}h`;
const presetFor = (start: string) => SHIFT_PRESETS.find(p => p.start === start);

interface Shift { siteId: string; start: string; end: string }
interface Day { date: Date; shifts: Shift[] }
interface Entry { siteId: string; start: string; end: string; empId?: string }

const buildDays = (roster: RosterData, empId: string): Day[] =>
  PREVIEW_DAYS.map(date => {
    const day = roster[fmt(date)] ?? {};
    const shifts: Shift[] = Object.entries(day).flatMap(([siteId, slots]) =>
      slots.filter(s => s.empId === empId).map(s => ({ siteId, start: s.start, end: s.end })));
    return { date, shifts };
  });

/* --------------------------- email building blocks --------------------------- */
function Band({ title }: { title: string }) {
  const { lang } = useI18n();
  return (
    <div style={{ background: C.gold, padding: "22px 24px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "rgba(255,255,255,.85)" }}>WORKFORCE HUB</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: "#fff", margin: "2px 0" }}>{title}</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,.9)" }}>{periodLabel(lang)}</div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ flex: 1, background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, padding: "10px 6px", textAlign: "center" }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#b45309" }}>{value}</div>
      <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: .6 }}>{label}</div>
    </div>
  );
}

function Pill({ start }: { start: string }) {
  const { t } = useI18n();
  const p = presetFor(start);
  return (
    <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: p?.bg ?? "#e5e7eb", color: p?.color ?? "#374151" }}>
      {t(p?.label ?? "Custom")}
    </span>
  );
}

function WeekCalendarTable({ days, teamMode = false, roster }: { days: Day[]; teamMode?: boolean; roster?: RosterData }) {
  const { lang, t } = useI18n();
  const { employees, sites } = useApp();
  const siteName = (id:string) => sites.find(site=>site.id===id)?.name??id;
  const isMobile = useIsMobile();
  const weeks = Array.from({ length: Math.ceil(days.length / 7) }, (_, i) => days.slice(i * 7, i * 7 + 7));

  const entriesOf = (item: Day): Entry[] =>
    teamMode && roster
      ? Object.entries(roster[fmt(item.date)] ?? {}).flatMap(([siteId, slots]) =>
          slots.map(sl => ({ siteId, start: sl.start, end: sl.end, empId: sl.empId })))
      : item.shifts.map(s => ({ siteId: s.siteId, start: s.start, end: s.end }));

  const weekHeader = (wi: number, week: Day[]) => {
    const first = week[0]?.date;
    const last = week[week.length - 1]?.date;
    const range = first && last ? rangeLabel(lang, first, last) : "";
    return (
      <div style={{ background: "#f8fafc", padding: "9px 12px", borderBottom: "1px solid #dfe3e8", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <strong style={{ fontSize: 12, color: "#111827" }}>{t("Week {n}", { n: wi + 1 })}</strong>
        <span style={{ fontSize: 11, color: "#6b7280" }}>{range}</span>
      </div>
    );
  };

  /* Celular: uma linha por dia (as 7 colunas ficariam apertadas demais) */
  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, fontFamily: EMAIL_FONT }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ border: "1px solid #dfe3e8", borderRadius: 9, overflow: "hidden", background: "#fff" }}>
            {weekHeader(wi, week)}
            {week.map(item => {
              const date = item.date;
              const entries = entriesOf(item);
              return (
                <div key={fmt(date)} style={{ display: "flex", gap: 10, padding: "9px 10px", borderBottom: "1px solid #f1f3f5", background: isWeekend(date) ? "#fffaf3" : "#fff" }}>
                  <div style={{ width: 40, flexShrink: 0, textAlign: "center" }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: isWeekend(date) ? "#b45309" : "#6b7280", textTransform: "uppercase" }}>{DOW[lang][date.getDay()]}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: isWeekend(date) ? "#b45309" : "#111827" }}>{date.getDate()}</div>
                    <div style={{ fontSize: 9, color: "#9ca3af" }}>{MONTHS[lang][date.getMonth()]}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {entries.length === 0 ? (
                      <div style={{ fontSize: 12, color: "#9ca3af", fontStyle: "italic", paddingTop: 6 }}>{t("Day off")}</div>
                    ) : entries.map((entry, index) => {
                      const preset = presetFor(entry.start);
                      const emp = entry.empId ? employees.find(e => e.id === entry.empId) : undefined;
                      return (
                        <div key={`${fmt(date)}-${entry.siteId}-${entry.start}-${index}`} style={{
                          borderLeft: `3px solid ${preset?.color ?? "#9ca3af"}`, borderRadius: 6, padding: "6px 8px", marginBottom: 6,
                          background: preset?.bg ? `${preset.bg}35` : "#f9fafb",
                        }}>
                          <div style={{ fontSize: 12, fontWeight: 800, color: "#111827", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            {entry.start}–{entry.end} <Pill start={entry.start} />
                          </div>
                          <div style={{ fontSize: 11, color: "#4b5563", marginTop: 2 }}>
                            {siteName(entry.siteId)}{teamMode && emp ? ` · ${emp.name}` : ""}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  const cellStyle = (date: Date): CSSProperties => ({
    width: `${100 / 7}%`, verticalAlign: "top", padding: "9px 7px",
    background: isWeekend(date) ? "#fffaf3" : "#ffffff",
    borderRight: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb", minHeight: 112,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {weeks.map((week, wi) => {
        const paddedWeek: Array<Day | null> = [...week];
        while (paddedWeek.length < 7) paddedWeek.push(null);

        return (
          <div key={wi} style={{ border: "1px solid #dfe3e8", borderRadius: 9, overflow: "hidden", background: "#fff" }}>
            {weekHeader(wi, week)}
            <table role="presentation" style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontFamily: EMAIL_FONT }}>
              <thead>
                <tr>
                  {paddedWeek.map((item, i) => {
                    if (!item) return <th key={`empty-head-${i}`} style={{ background: "#f9fafb" }} />;
                    const date = item.date;
                    return (
                      <th key={fmt(date)} style={{
                        padding: "8px 7px", textAlign: "left", verticalAlign: "top",
                        background: isWeekend(date) ? "#fff5e6" : "#f8fafc",
                        borderRight: "1px solid #e5e7eb", borderBottom: "1px solid #dfe3e8",
                      }}>
                        <div style={{ fontSize: 9, fontWeight: 800, color: isWeekend(date) ? "#b45309" : "#6b7280", textTransform: "uppercase", letterSpacing: .6 }}>
                          {DOW[lang][date.getDay()]}
                        </div>
                        <div style={{ marginTop: 2, fontSize: 16, lineHeight: "18px", fontWeight: 800, color: isWeekend(date) ? "#b45309" : "#111827" }}>
                          {date.getDate()}
                        </div>
                        <div style={{ fontSize: 9, color: "#9ca3af", marginTop: 1 }}>{MONTHS[lang][date.getMonth()]}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {paddedWeek.map((item, i) => {
                    if (!item) return <td key={`empty-cell-${i}`} style={{ background: "#fafafa" }} />;
                    const date = item.date;
                    const entries = entriesOf(item);
                    return (
                      <td key={fmt(date)} style={cellStyle(date)}>
                        {entries.length === 0 ? (
                          <div style={{ minHeight: 88, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 10, fontStyle: "italic" }}>
                            {t("Day off")}
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {entries.map((entry, index) => {
                              const preset = presetFor(entry.start);
                              const emp = entry.empId ? employees.find(e => e.id === entry.empId) : undefined;
                              return (
                                <div key={`${fmt(date)}-${entry.siteId}-${entry.start}-${index}`} style={{
                                  border: `1px solid ${preset?.color ?? "#d1d5db"}55`,
                                  borderLeft: `3px solid ${preset?.color ?? "#9ca3af"}`,
                                  borderRadius: 6, padding: "7px 6px",
                                  background: preset?.bg ? `${preset.bg}35` : "#f9fafb",
                                }}>
                                  <div style={{ fontSize: 10, fontWeight: 800, color: "#111827", lineHeight: "13px" }}>{entry.start}–{entry.end}</div>
                                  <div style={{ marginTop: 3, fontSize: 9, color: "#4b5563", lineHeight: "12px" }}>{siteName(entry.siteId)}</div>
                                  <div style={{ marginTop: 5 }}><Pill start={entry.start} /></div>
                                  {teamMode && emp && (
                                    <div style={{ marginTop: 4, fontSize: 9, fontWeight: 700, color: "#374151" }}>{emp.name}</div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function EmployeeEmail({ emp, days, count, hours, sender }: { emp: Employee; days: Day[]; count: number; hours: number; sender: string }) {
  const { lang, t } = useI18n();
  const sites = new Set(days.flatMap(d => d.shifts.map(s => s.siteId))).size;
  return (
    <div style={{ fontFamily: EMAIL_FONT, color: "#1f2937" }}>
      <Band title={t("Your shift roster")} />
      <div style={{ padding: "22px 18px" }}>
        <p style={{ fontSize: 15, margin: "0 0 12px" }}>{t("Hi {name},", { name: emp.name.split(" ")[0] ?? "" })}</p>
        <p style={{ fontSize: 14, lineHeight: 1.6, margin: "0 0 18px", color: "#374151" }}>
          {t("Here is your confirmed roster for")} <b>{periodLabel(lang)}</b>. {t("If you can't make a shift, please request a swap in the Workforce Hub app as early as possible.")}
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <Tile label={t("Shifts")} value={count} />
          <Tile label={t("Total hours")} value={fmtH(hours)} />
          <Tile label={sites === 1 ? t("Site") : t("Sites")} value={sites} />
        </div>

        <div style={{ fontSize: 12, fontWeight: 800, color: "#111827", marginBottom: 8, textTransform: "uppercase", letterSpacing: .7 }}>
          {t("Weekly schedule")}
        </div>
        <WeekCalendarTable days={days} />

        <p style={{ fontSize: 13, color: "#6b7280", margin: "20px 0 16px" }}>{t("Questions? Just reply to this e-mail.")}</p>
        <p style={{ fontSize: 14, margin: 0, lineHeight: 1.6 }}>{t("Kind regards,")}<br /><b>{sender}</b><br />Workforce Hub</p>
      </div>
    </div>
  );
}

function TeamEmail({ roster, sender, employeeRoleFilter }: { roster: RosterData; sender: string; employeeRoleFilter:RosterStaffFilter }) {
  const { lang, t } = useI18n();
  const {sites:allSites,employees} = useApp();
  const eligibleEmployees=new Set(employees.filter(employee=>
    ['cleaner','security','supervisor'].includes(employee.role)&&
    (employeeRoleFilter==='all'||employee.role===employeeRoleFilter)
  ).map(employee=>employee.id));
  const filteredRoster=Object.fromEntries(Object.entries(roster).map(([day,siteRoster])=>[
    day,Object.fromEntries(Object.entries(siteRoster).map(([siteId,slots])=>[
      siteId,slots.filter(slot=>eligibleEmployees.has(slot.empId))
    ]).filter(([,slots])=>slots.length>0))
  ]).filter(([,siteRoster])=>Object.keys(siteRoster).length>0));
  const sites = allSites.filter(s => DAYS14.some(d => (filteredRoster[fmt(d)]?.[s.id]?.length ?? 0) > 0));
  return (
    <div style={{ fontFamily: EMAIL_FONT, color: "#1f2937" }}>
      <Band title={t("Team shift roster")} />
      <div style={{ padding: "22px 18px" }}>
        <p style={{ fontSize: 14, lineHeight: 1.6, margin: "0 0 18px", color: "#374151" }}>
          {t("Hi team, here is the full roster for")} <b>{periodLabel(lang)}</b>{t(", organised as a clear weekly schedule.")}
        </p>
        {sites.map(site => {
          const siteDays: Day[] = PREVIEW_DAYS.map(date => ({
            date,
            shifts: (filteredRoster[fmt(date)]?.[site.id] ?? []).map(s => ({ siteId: site.id, start: s.start, end: s.end })),
          }));
          return (
            <div key={site.id} style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
                {site.name} <span style={{ fontSize: 12, fontWeight: 400, color: "#6b7280" }}>· {site.client}</span>
              </div>
              <WeekCalendarTable days={siteDays} teamMode roster={filteredRoster} />
            </div>
          );
        })}
        <p style={{ fontSize: 14, margin: "8px 0 0", lineHeight: 1.6 }}>{t("Kind regards,")}<br /><b>{sender}</b><br />Workforce Hub</p>
      </div>
    </div>
  );
}

/* ------------------------------ the modal ------------------------------ */
export function EmailPreviewModal({ onClose, employeeRoleFilter = 'all' }: { onClose: () => void; employeeRoleFilter?: RosterStaffFilter }) {
  const { roster, user, setTab, employees, sites } = useApp();
  const { lang, t } = useI18n();
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<"employee" | "team">("employee");
  const [selId, setSelId] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [clipboardStatus, setClipboardStatus] = useState<"copied" | "failed" | null>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const recipients = useMemo(() =>
    employees
      .filter(employee=>employee.active&&(employeeRoleFilter==='all'||employee.role===employeeRoleFilter))
      .map(emp => {
        const days = buildDays(roster, emp.id);
        const all = days.flatMap(d => d.shifts);
        return { emp, days, count: all.length, hours: all.reduce((a, s) => a + hoursOf(s.start, s.end), 0) };
      })
      .filter(r => r.count > 0)
      .sort((a, b) => a.emp.name.localeCompare(b.emp.name)),
  [roster, employees, employeeRoleFilter]);

  const current = recipients.find(r => r.emp.id === selId) ?? recipients[0];
  const period = periodLabel(lang);
  const sender = `${user.name} <${user.email}>`;
  const subject = mode === "employee" ? t("Your shift roster · {period}", { period }) : t("Team shift roster · {period}", { period });
  const to = mode === "employee" && current
    ? `${current.emp.name} <${current.emp.email}>`
    : t("All employees with shifts ({n})", { n: recipients.length });
  const noun = recipients.length === 1 ? t("employee") : t("employees");

  // Open a browser-based Gmail compose window so sending works even when no desktop mail app is configured.
  const emailBody = (() => {
    if (!current) return "";
    const lines = current.days.flatMap(({ date, shifts }) =>
      shifts.length === 0
        ? [`${dayLabel(lang, date)} — ${t("Day off")}`]
        : shifts.map(s => `${dayLabel(lang, date)} — ${sites.find(site=>site.id===s.siteId)?.name??s.siteId} — ${t(presetFor(s.start)?.label ?? "Custom")} ${s.start}–${s.end}`));
    const body = [
      t("Hi {name},", { name: current.emp.name.split(" ")[0] ?? "" }), "",
      t("Here is your confirmed roster for {period}:", { period }), "",
      ...lines, "",
      t("Total: {n} shifts · {h}", { n: current.count, h: fmtH(current.hours) }), "",
      t("Kind regards,"), user.name, "Workforce Hub",
    ].join("\n");
    return body;
  })();
  const emailSubject = t("Your shift roster · {period}", { period });
  const gmailCompose = current
    ? `https://mail.google.com/mail/?${new URLSearchParams({ view: "cm", fs: "1", to: current.emp.email, su: emailSubject }).toString()}`
    : "";
  const mailto = current
    ? `mailto:${encodeURIComponent(current.emp.email)}?${new URLSearchParams({ subject: emailSubject, body: emailBody }).toString()}`
    : "";
  const openStyledGmailDraft = async () => {
    setClipboardStatus(null);
    window.open(gmailCompose, "_blank", "noopener,noreferrer");
    try {
      const previewBody = document.getElementById("roster-email-html-body");
      if (!previewBody || !navigator.clipboard?.write || typeof ClipboardItem === "undefined") throw new Error("clipboard unavailable");
      const html = `<!doctype html><html><body style="margin:0;font-family:Arial,Helvetica,sans-serif">${previewBody.outerHTML}</body></html>`;
      await navigator.clipboard.write([new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([emailBody], { type: "text/plain" }),
      })]);
      setClipboardStatus("copied");
    } catch {
      setClipboardStatus("failed");
    }
  };

  const modeBtn = (m: "employee" | "team", label: string) => (
    <button onClick={() => { setMode(m); setSent(false); setClipboardStatus(null); }}
      style={{ flex: 1, padding: isMobile ? "9px 8px" : "7px 8px", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700,
        border: `1.5px solid ${mode === m ? C.gold : C.border}`, background: mode === m ? `${C.gold}18` : "transparent", color: mode === m ? C.gold : C.muted }}>
      {label}
    </button>
  );

  const shell: CSSProperties = isMobile
    ? { position: "fixed", zIndex: 9999, inset: 0, width: "100vw", height: "100dvh", background: C.card, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "inherit" }
    : { position: "fixed", zIndex: 9999, top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(1100px,96vw)", height: "min(90vh,860px)", background: C.card, border: `1px solid ${C.gold}`, borderRadius: 14, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 64px #000c", fontFamily: "inherit" };

  return createPortal(
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,.7)", backdropFilter: "blur(3px)" }} />
      <div style={shell}>
        {/* header */}
        <div style={{ background: C.surface, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexShrink: 0, borderBottom: `1px solid ${C.gold}40` }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: 1 }}>{t("E-MAIL PREVIEW")}</div>
            <div style={{ fontSize: 13, color: C.muted }}>{t("This is how the roster will look in the recipient's inbox")}</div>
          </div>
          <button onClick={onClose} aria-label={t("Close")} style={{ background: C.border, border: "none", borderRadius: 8, color: C.muted, cursor: "pointer", width: 36, height: 36, fontSize: 18, fontFamily: "inherit", flexShrink: 0 }}>×</button>
        </div>

        {recipients.length === 0 || !current ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, color: C.muted, fontSize: 14, padding: 20, textAlign: "center" }}>
            <div>{t("No shifts assigned yet — there is nothing to send.")}</div>
            <button onClick={() => { setTab("roster"); onClose(); }} style={{ background: C.gold, color: "#fff", border: "none", borderRadius: 7, padding: "10px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>{t("Go to Roster")}</button>
          </div>
        ) : (
          <>
            <div style={{ display: isMobile ? "flex" : "grid", flexDirection: "column", gridTemplateColumns: "280px 1fr", flex: 1, minHeight: 0 }}>
              {/* sidebar (desktop) / top strip (mobile) */}
              <div style={{ borderRight: isMobile ? "none" : `1px solid ${C.border}`, borderBottom: isMobile ? `1px solid ${C.border}` : "none", display: "flex", flexDirection: "column", minHeight: 0, flexShrink: 0 }}>
                <div style={{ padding: 12, display: "flex", gap: 6, flexShrink: 0 }}>
                  {modeBtn("employee", t("Per employee"))}
                  {modeBtn("team", t("Full roster"))}
                </div>
                {mode === "employee" ? (
                  isMobile ? (
                    <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "0 12px 12px" }}>
                      {recipients.map(r => {
                        const active = r.emp.id === current.emp.id;
                        const over = r.emp.stamp !== null && r.emp.hoursUsed + r.hours > r.emp.hoursLimit;
                        return (
                          <button key={r.emp.id} onClick={() => { setSelId(r.emp.id); setSent(false); setClipboardStatus(null); }}
                            style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8, padding: "6px 12px 6px 6px", borderRadius: 99, cursor: "pointer", fontFamily: "inherit",
                              border: `1px solid ${active ? C.gold : C.border}`, background: active ? `${C.gold}18` : "transparent", color: C.text, fontSize: 13, fontWeight: 600 }}>
                            <span style={{ width: 28, height: 28, borderRadius: "50%", background: roleColor(r.emp.role), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800 }}>{initials(r.emp.name)}</span>
                            {r.emp.name.split(" ")[0]}{over ? " !" : ""}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <>
                      <div style={{ padding: "4px 14px 8px", fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: .8 }}>{t("RECIPIENTS")} ({recipients.length})</div>
                      <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 8px" }}>
                        {recipients.map(r => {
                          const active = r.emp.id === current.emp.id;
                          const over = r.emp.stamp !== null && r.emp.hoursUsed + r.hours > r.emp.hoursLimit;
                          return (
                            <button key={r.emp.id} onClick={() => { setSelId(r.emp.id); setSent(false); setClipboardStatus(null); }}
                              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", marginBottom: 4, borderRadius: 8, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                                border: `1px solid ${active ? C.gold : "transparent"}`, background: active ? `${C.gold}18` : "transparent" }}>
                              <div style={{ width: 32, height: 32, borderRadius: "50%", background: roleColor(r.emp.role), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{initials(r.emp.name)}</div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{r.emp.name}</div>
                                <div style={{ fontSize: 11, color: C.muted }}>{r.count} {t("shifts")} · {fmtH(r.hours)}</div>
                                {over && <div style={{ fontSize: 10, color: C.red, fontWeight: 600 }}>{r.emp.hoursUsed}h {t("used")} + {fmtH(r.hours)} &gt; {r.emp.hoursLimit}h {t("limit")}</div>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )
                ) : (
                  <div style={{ padding: isMobile ? "0 14px 12px" : "4px 16px", fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
                    {t("One overview e-mail, grouped by site, going to all {n} employees who have shifts in this period.", { n: recipients.length })}
                  </div>
                )}
              </div>

              {/* email canvas */}
              <div style={{ background: "#e5e9f0", overflowY: "auto", padding: isMobile ? 10 : 24, minHeight: 0, flex: 1 }}>
                <div style={{ maxWidth: 680, margin: "0 auto", background: "#fff", borderRadius: 10, overflow: "hidden", boxShadow: "0 6px 24px rgba(15,23,42,.18)" }}>
                  <div style={{ padding: "14px 20px", borderBottom: "1px solid #e5e7eb", background: "#fafafa", fontFamily: EMAIL_FONT, fontSize: 12, color: "#6b7280", lineHeight: 1.9, wordBreak: "break-word" }}>
                    <div><b style={{ color: "#374151" }}>{t("From:")}</b> {sender}</div>
                    <div><b style={{ color: "#374151" }}>{t("To:")}</b> {to}</div>
                    <div><b style={{ color: "#374151" }}>{t("Subject:")}</b> {subject}</div>
                  </div>
                  {mode === "employee"
                    ? <div id="roster-email-html-body"><EmployeeEmail emp={current.emp} days={current.days} count={current.count} hours={current.hours} sender={user.name} /></div>
                    : <TeamEmail roster={roster} sender={user.name} employeeRoleFilter={employeeRoleFilter} />}
                </div>
              </div>
            </div>

            {/* footer actions */}
            <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flexShrink: 0 }}>
              <div style={{ flex: isMobile ? "1 1 100%" : 1, fontSize: 12, color: sent ? C.green : C.muted }}>
                {clipboardStatus === "copied"
                  ? t("Formatted roster copied. In Gmail, click the message body and press Ctrl+V.")
                  : clipboardStatus === "failed"
                    ? t("Gmail opened, but formatting could not be copied. Copy the preview and paste it into the message body.")
                    : sent
                  ? t("Queued for {n} {noun} — demo only, no e-mail server is connected yet.", { n: recipients.length, noun })
                  : mode === "employee"
                    ? t("Review the e-mail, open Gmail, then paste the formatted roster into the message body.")
                    : t("Review the e-mail, then send.")}
              </div>
              {mode === "employee" && (
                <>
                  <button type="button" onClick={() => void openStyledGmailDraft()} style={{ flex: isMobile ? 1 : undefined, textAlign: "center", textDecoration: "none", background: C.gold, color: "#fff", border: `1px solid ${C.gold}`, borderRadius: 7, padding: "11px 16px", fontWeight: 700, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>
                    {t("Open Gmail & paste roster")}
                  </button>
                  <a href={mailto} style={{ flex: isMobile ? 1 : undefined, textAlign: "center", textDecoration: "none", background: "transparent", color: C.text, border: `1px solid ${C.border}`, borderRadius: 7, padding: "11px 16px", fontWeight: 700, fontSize: 13, fontFamily: "inherit" }}>
                    {t("Use default e-mail app")}
                  </a>
                </>
              )}
              <button onClick={() => setSent(true)} disabled={sent}
                style={{ flex: isMobile ? 1 : undefined, background: sent ? C.green : C.gold, color: "#fff", border: "none", borderRadius: 7, padding: "11px 18px", fontWeight: 700, fontSize: 13, cursor: sent ? "default" : "pointer", fontFamily: "inherit" }}>
                {sent ? t("Sent") : t("Send to {n} {noun}", { n: recipients.length, noun })}
              </button>
            </div>
          </>
        )}
      </div>
    </>,
    document.body
  );
}
