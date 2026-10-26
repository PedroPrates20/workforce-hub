import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { ArrowRight, Check, FileUp, TriangleAlert, X } from 'lucide-react';
import type { HolidayBlock, HolidayRequest, SwapRequest } from '../types';
import { useApp, useI18n } from '../context/AppContext';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { C, SHIFT_PRESETS, fmt } from '../constants';
import { directorEmails, openRequestEmailDraft, reviewEmailsForSite } from '../utils/requestEmails';

const SWAP_REASONS = ['Medical appointment', 'Personal commitments', 'Transport issues'] as const;
const MAX_CERTIFICATE_BYTES = 10 * 1024 * 1024;
const CERTIFICATE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

function countWorkingDays(start: string, end: string) {
  if (!start || !end || end < start) return 0;
  const cursor = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);
  let count = 0;
  while (cursor <= last) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

function readCertificate(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read'));
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('read'));
    reader.readAsDataURL(file);
  });
}

export function Swaps() {
  const { user, employees, swaps, setSwaps, sites, holidayRequests, setHolidayRequests, holidayBlocks, setHolidayBlocks, setEmployees } = useApp();
  const { lang, t } = useI18n();
  const canReviewSwap = ['supervisor', 'hr', 'director'].includes(user.role);
  const isHr = user.role === 'hr';
  const isDirector = user.role === 'director';
  const currentEmployee = employees.find(employee => employee.id === user.id);
  const activeSites = sites.filter(site => site.active);
  const candidates = employees.filter(employee => employee.active && employee.id !== user.id && ['cleaner', 'security', 'supervisor'].includes(employee.role));
  const [showSwapForm, setShowSwapForm] = useState(false);
  const [swapSite, setSwapSite] = useState(user.site || activeSites[0]?.id || '');
  const [swapDate, setSwapDate] = useState('');
  const [swapShift, setSwapShift] = useState(SHIFT_PRESETS[0]?.start ?? '07:00');
  const [replacement, setReplacement] = useState(candidates[0]?.id ?? '');
  const [reason, setReason] = useState<(typeof SWAP_REASONS)[number]>('Personal commitments');
  const [certificate, setCertificate] = useState<File | null>(null);
  const [swapError, setSwapError] = useState('');
  const [swapSent, setSwapSent] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [holidayError, setHolidayError] = useState('');
  const [holidaySent, setHolidaySent] = useState(false);
  const [emailNotice, setEmailNotice] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [blockKind, setBlockKind] = useState<HolidayBlock['kind']>('month');
  const [blockPeriod, setBlockPeriod] = useState('');
  const [blockConfirmation, setBlockConfirmation] = useState<{ action: 'add' | 'remove'; block: HolidayBlock } | null>(null);
  const [showHolidayBlockNotice, setShowHolidayBlockNotice] = useState(false);

  useEffect(() => {
    if (holidayBlocks.length > 0) setShowHolidayBlockNotice(true);
  }, [holidayBlocks.length]);

  const dateLocale = ({ pt: 'pt-IE', en: 'en-IE', ru: 'ru-RU', ro: 'ro-RO' } as const)[lang];
  const dateInputStyle: CSSProperties = { width: '100%', minHeight: 40, boxSizing: 'border-box', padding: '9px 11px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.card, color: C.text, fontSize: 13, fontFamily: 'inherit' };
  const labelStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, color: C.muted, fontSize: 11, fontWeight: 700 };
  const today = fmt(new Date());
  const minHolidayStartDate = (() => { const date = new Date(`${today}T12:00:00`); date.setDate(date.getDate() + 21); return fmt(date); })();
  const blockInputStyle: CSSProperties = { ...dateInputStyle, maxWidth: 260 };

  const prepareEmail = (to:string[], cc:string[], subject:string, body:string) => {
    setEmailNotice(openRequestEmailDraft(to,cc,subject,body)?t('Email draft opened. Press Send in your email app to deliver it.'):t('No valid email address is available for this notification.'));
  };

  const submitSwap = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSwapError('');
    if (!swapDate || swapDate < today || !swapSite || !replacement) {
      setSwapError(t('Complete the shift date, site, shift and replacement employee.'));
      return;
    }
    if (reason === 'Medical appointment' && !certificate) {
      setSwapError(t('Attach your medical certificate to submit this request.'));
      return;
    }
    let medicalCertificate: SwapRequest['medicalCertificate'];
    if (certificate) {
      try {
        medicalCertificate = { name: certificate.name, mimeType: certificate.type, dataUrl: await readCertificate(certificate) };
      } catch {
        setSwapError(t('Could not read the medical certificate. Try again.'));
        return;
      }
    }
    const selectedPreset = SHIFT_PRESETS.find(preset => preset.start === swapShift) ?? SHIFT_PRESETS[0]!;
    const request: SwapRequest = {
      id: globalThis.crypto?.randomUUID?.() ?? `swap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      from: user.id,
      to: replacement,
      date: swapDate,
      site: swapSite,
      shift: `${selectedPreset.start}–${selectedPreset.end}`,
      status: 'pending',
      reason,
      ...(medicalCertificate ? { medicalCertificate } : {}),
    };
    setSwaps(current => [request, ...current]);
    const replacementEmployee=employees.find(employee=>employee.id===replacement);
    prepareEmail([...reviewEmailsForSite(employees,swapSite),replacementEmployee?.email??''],[user.email],t('New shift request · {reference}',{reference:request.id}),[
      t('Request reference: {reference}',{reference:request.id}),
      `${t('Employee')}: ${user.name}`,
      `${t('Site')}: ${sites.find(site=>site.id===swapSite)?.name??swapSite}`,
      `${t('Shift date')}: ${swapDate}`,
      `${t('Shift')}: ${request.shift}`,
      `${t('Replacement employee')}: ${replacementEmployee?.name??''}`,
      `${t('Reason')}: ${t(reason)}`,
      '',t('This is a prototype email draft. Press Send in your email app to deliver it.'),
    ].join('\n'));
    setSwapDate('');
    setCertificate(null);
    setSwapSent(true);
  };

  const updateSwap = (id: string, status: 'approved' | 'rejected') => {
    const request=swaps.find(item=>item.id===id);
    if(!request)return;
    setSwaps(current => current.map(item => item.id === id ? { ...item, status } : item));
    const applicant=employees.find(employee=>employee.id===request.from);
    const replacementEmployee=employees.find(employee=>employee.id===request.to);
    prepareEmail([applicant?.email??'',replacementEmployee?.email??''],[],t('Shift request {status} · {reference}',{status:t(status==='approved'?'Approved':'Rejected'),reference:id}),[
      t('Request reference: {reference}',{reference:id}),
      `${t('Request status')}: ${t(status==='approved'?'Approved':'Rejected')}`,
      `${t('Shift date')}: ${request.date}`,
      `${t('Site')}: ${sites.find(site=>site.id===request.site)?.name??request.site}`,
      `${t('Shift')}: ${request.shift}`,
      '',t('This is a prototype email draft. Press Send in your email app to deliver it.'),
    ].join('\n'));
  };

  const requestedDays = countWorkingDays(startDate, endDate);
  const ownRequests = holidayRequests.filter(request => request.employeeId === user.id);
  const pendingReservedDays = ownRequests.filter(request => request.status === 'pending_hr' || request.status === 'pending_director').reduce((sum, request) => sum + request.workingDays, 0);
  const availableForNewRequest = Math.max(0, (currentEmployee?.holidayBalance ?? 0) - pendingReservedDays);
  const overlapsExistingRequest = ownRequests.some(request => request.status !== 'rejected' && startDate && endDate && startDate <= request.endDate && endDate >= request.startDate);
  const exceedsBalance = requestedDays > availableForNewRequest;
  const blockedPeriodsForSelection = holidayBlocks.filter(block => startDate && endDate && startDate <= block.endDate && endDate >= block.startDate);
  const selectedDatesBlocked = blockedPeriodsForSelection.length > 0;
  const visibleHolidayRequests = useMemo(() => (isHr || isDirector ? holidayRequests : ownRequests).slice().sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)), [holidayRequests, isDirector, isHr, ownRequests]);

  const submitHoliday = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHolidayError('');
    if (startDate && startDate < minHolidayStartDate) {
      setHolidayError(t('Holiday requests must be submitted at least 3 weeks in advance.'));
      setHolidaySent(false);
      return;
    }
    if (!startDate || !endDate || endDate < startDate || requestedDays < 1) {
      setHolidayError(t('Choose a valid date range that includes at least one weekday.'));
      setHolidaySent(false);
      return;
    }
    if (overlapsExistingRequest) {
      setHolidayError(t('These dates overlap another active holiday request.'));
      setHolidaySent(false);
      return;
    }
    if (selectedDatesBlocked) {
      setHolidayError(t('This period is blocked for holidays. Choose different dates.'));
      setHolidaySent(false);
      return;
    }
    if (requestedDays > availableForNewRequest) {
      setHolidayError(t('Requested working days exceed your available holiday balance.'));
      setHolidaySent(false);
      return;
    }
    const request: HolidayRequest = {
      id: globalThis.crypto?.randomUUID?.() ?? `holiday-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      employeeId: user.id,
      startDate,
      endDate,
      workingDays: requestedDays,
      status: 'pending_hr',
      submittedAt: new Date().toISOString(),
    };
    setHolidayRequests(current => [request, ...current]);
    const reviewers=reviewEmailsForSite(employees,currentEmployee?.site);
    if(reviewers.length===0){setEmailNotice(t('No HR or supervisor email is configured for this request.'));}
    else prepareEmail(reviewers,[user.email],t('Holiday request received · {reference}',{reference:request.id}),[
      t('Request reference: {reference}',{reference:request.id}),
      `${t('Employee')}: ${user.name}`,
      `${t('Start date')}: ${startDate}`,
      `${t('End date')}: ${endDate}`,
      `${t('Working days requested')}: ${requestedDays}`,
      '',t('Holiday request requires HR review, followed by director approval.'),
      '',t('This is a prototype email draft. Press Send in your email app to deliver it.'),
    ].join('\n'));
    setStartDate('');
    setEndDate('');
    setHolidaySent(true);
  };

  const moveToDirector = (request: HolidayRequest) => {
    if (holidayBlocks.some(block => request.startDate <= block.endDate && request.endDate >= block.startDate)) {
      setReviewError(t('This holiday request falls within a blocked period.'));
      return;
    }
    const employee = employees.find(person => person.id === request.employeeId);
    const otherReservations = holidayRequests.filter(item => item.employeeId === request.employeeId && item.id !== request.id && (item.status === 'pending_hr' || item.status === 'pending_director')).reduce((sum, item) => sum + item.workingDays, 0);
    if (!employee || employee.holidayBalance - otherReservations < request.workingDays) {
      setReviewError(t('The employee no longer has enough available holiday days for this request.'));
      return;
    }
    setReviewError('');
    setHolidayRequests(current => current.map(item => item.id === request.id ? { ...item, status: 'pending_director', hrReviewedBy: user.id, hrReviewedAt: new Date().toISOString() } : item));
    const directors=directorEmails(employees);
    if(directors.length===0){setEmailNotice(t('No director email is configured for this request.'));}
    else prepareEmail(directors,[employee?.email??''],t('Holiday request sent for director approval · {reference}',{reference:request.id}),[
      t('Request reference: {reference}',{reference:request.id}),
      `${t('Employee')}: ${employee?.name??''}`,
      `${t('Start date')}: ${request.startDate}`,
      `${t('End date')}: ${request.endDate}`,
      `${t('Working days requested')}: ${request.workingDays}`,
      '',t('HR reviewed this holiday request. Director decision required.'),
      '',t('This is a prototype email draft. Press Send in your email app to deliver it.'),
    ].join('\n'));
  };

  const rejectHolidayAsHr = (request:HolidayRequest) => {
    setHolidayRequests(current => current.map(item => item.id === request.id ? { ...item, status: 'rejected', hrReviewedBy: user.id, hrReviewedAt: new Date().toISOString() } : item));
    const employee=employees.find(person=>person.id===request.employeeId);
    prepareEmail([employee?.email??''],[],t('Holiday request rejected · {reference}',{reference:request.id}),[
      t('Request reference: {reference}',{reference:request.id}),
      `${t('Request status')}: ${t('Rejected')}`,
      `${t('Start date')}: ${request.startDate}`,
      `${t('End date')}: ${request.endDate}`,
      '',t('Your holiday request was rejected by HR.'),
      '',t('This is a prototype email draft. Press Send in your email app to deliver it.'),
    ].join('\n'));
  };

  const reviewHoliday = (request: HolidayRequest, status: 'approved' | 'rejected') => {
    setReviewError('');
    if (status === 'approved') {
      if (holidayBlocks.some(block => request.startDate <= block.endDate && request.endDate >= block.startDate)) {
        setReviewError(t('This holiday request falls within a blocked period.'));
        return;
      }
      const employee = employees.find(person => person.id === request.employeeId);
      const otherReservations = holidayRequests.filter(item => item.employeeId === request.employeeId && item.id !== request.id && (item.status === 'pending_hr' || item.status === 'pending_director')).reduce((sum, item) => sum + item.workingDays, 0);
      if (!employee || employee.holidayBalance - otherReservations < request.workingDays) {
        setReviewError(t('The employee no longer has enough available holiday days for this request.'));
        return;
      }
      setEmployees(current => current.map(person => person.id === request.employeeId ? { ...person, holidayBalance: Math.max(0, person.holidayBalance - request.workingDays) } : person));
    }
    setHolidayRequests(current => current.map(item => item.id === request.id ? { ...item, status, directorReviewedBy: user.id, directorReviewedAt: new Date().toISOString() } : item));
    const employee=employees.find(person=>person.id===request.employeeId);
    prepareEmail([employee?.email??''],[],t('Holiday request {status} · {reference}',{status:t(status==='approved'?'Approved':'Rejected'),reference:request.id}),[
      t('Request reference: {reference}',{reference:request.id}),
      `${t('Request status')}: ${t(status==='approved'?'Approved':'Rejected')}`,
      `${t('Start date')}: ${request.startDate}`,
      `${t('End date')}: ${request.endDate}`,
      `${t('Working days requested')}: ${request.workingDays}`,
      '',t(status==='approved'?'Your holiday request was approved.':'Your holiday request was rejected.'),
      '',t('This is a prototype email draft. Press Send in your email app to deliver it.'),
    ].join('\n'));
  };

  const prepareHolidayBlock = () => {
    if (!blockPeriod) return;
    let start: Date;
    let end: Date;
    if (blockKind === 'month') {
      const [year, month] = blockPeriod.split('-').map(Number);
      start = new Date(year!, month! - 1, 1, 12);
      end = new Date(year!, month!, 0, 12);
    } else {
      const selected = new Date(`${blockPeriod}T12:00:00`);
      start = new Date(selected);
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
      end = new Date(start);
      end.setDate(end.getDate() + 6);
    }
    const block: HolidayBlock = {
      id: globalThis.crypto?.randomUUID?.() ?? `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      startDate: fmt(start),
      endDate: fmt(end),
      kind: blockKind,
      createdBy: user.id,
      createdAt: new Date().toISOString(),
    };
    if (holidayBlocks.some(existing => existing.startDate === block.startDate && existing.endDate === block.endDate)) return;
    setBlockConfirmation({ action: 'add', block });
  };

  const applyBlockConfirmation = () => {
    if (!blockConfirmation) return;
    if (blockConfirmation.action === 'add') setHolidayBlocks(current => [blockConfirmation.block, ...current]);
    else setHolidayBlocks(current => current.filter(block => block.id !== blockConfirmation.block.id));
    setBlockConfirmation(null);
    setBlockPeriod('');
  };

  const formatBlockedPeriod = (block: HolidayBlock) => `${holidayLabel(block.startDate)} – ${holidayLabel(block.endDate)}`;

  const statusBadge = (status: SwapRequest['status']) => status === 'pending'
    ? <Badge label={t('Pending')} color="#f59e0b" />
    : status === 'approved' ? <Badge label={t('Approved')} color={C.green} /> : <Badge label={t('Rejected')} color={C.red} />;

  const holidayStatus = (request: HolidayRequest) => {
    if (request.status === 'pending_hr') return <Badge label={t('Awaiting HR review')} color="#f59e0b" />;
    if (request.status === 'pending_director') return <Badge label={t('Awaiting director approval')} color={C.blue} />;
    return request.status === 'approved' ? <Badge label={t('Approved')} color={C.green} /> : <Badge label={t('Rejected')} color={C.red} />;
  };

  const holidayLabel = (date: string) => new Intl.DateTimeFormat(dateLocale, { dateStyle: 'medium', timeZone: 'Europe/Dublin' }).format(new Date(`${date}T12:00:00`));

  return (
    <div className="workforce-page" style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: C.text }}>{t('Swaps & Requests')}</h1>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 18 }}>{t('Shift replacement requests')}</div>
      {emailNotice&&<div role="status" aria-live="polite" style={{marginBottom:12,padding:'10px 12px',border:`1px solid ${C.blue}55`,borderRadius:8,background:`${C.blue}0A`,color:C.text,fontSize:11,lineHeight:1.5}}>{emailNotice}</div>}

      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div><h2 style={{ margin: 0, fontSize: 15, color: C.text }}>{t('Request a shift replacement')}</h2><p style={{ margin: '4px 0 0', color: C.muted, fontSize: 11 }}>{t('Send a shift replacement request to your supervisor.')}</p></div>
          <button type="button" onClick={() => { setShowSwapForm(value => !value); setSwapError(''); setSwapSent(false); }} style={{ padding: '8px 13px', border: `1px solid ${C.gold}`, borderRadius: 7, background: `${C.gold}12`, color: C.gold, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{showSwapForm ? t('Cancel') : t('Request shift replacement')}</button>
        </div>
        {showSwapForm && <form onSubmit={submitSwap} style={{ marginTop: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,210px),1fr))', gap: 12 }}>
            <label style={labelStyle}>{t('Shift date')}<input type="date" min={today} value={swapDate} onChange={event => setSwapDate(event.target.value)} required style={dateInputStyle} /></label>
            <label style={labelStyle}>{t('Site')}<select value={swapSite} onChange={event => setSwapSite(event.target.value)} required style={dateInputStyle}>{activeSites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label>
            <label style={labelStyle}>{t('Shift')}<select value={swapShift} onChange={event => setSwapShift(event.target.value)} style={dateInputStyle}>{SHIFT_PRESETS.map(preset => <option key={preset.start} value={preset.start}>{t(preset.label)} · {preset.start}–{preset.end}</option>)}</select></label>
            <label style={labelStyle}>{t('Replacement employee')}<select value={replacement} onChange={event => setReplacement(event.target.value)} required style={dateInputStyle}><option value="">{t('Choose a replacement employee')}</option>{candidates.map(employee => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
            <label style={labelStyle}>{t('Reason')}<select value={reason} onChange={event => { setReason(event.target.value as (typeof SWAP_REASONS)[number]); setCertificate(null); }} style={dateInputStyle}>{SWAP_REASONS.map(value => <option key={value} value={value}>{t(value)}</option>)}</select></label>
          </div>
          {reason === 'Medical appointment' && <div style={{ marginTop: 12, padding: 12, border: `1px solid ${C.border}`, borderRadius: 8, background: C.surface }}>
            <label style={labelStyle}>{t('Medical certificate')}<input type="file" accept="application/pdf,image/jpeg,image/png" required={!certificate} onChange={event => {
              const file = event.target.files?.[0] ?? null;
              setSwapError('');
              if (file && !CERTIFICATE_TYPES.includes(file.type)) { setCertificate(null); setSwapError(t('Use a PDF, JPG or PNG medical certificate.')); event.target.value = ''; return; }
              if (file && file.size > MAX_CERTIFICATE_BYTES) { setCertificate(null); setSwapError(t('Medical certificate must be 10 MB or smaller.')); event.target.value = ''; return; }
              setCertificate(file);
            }} style={{ ...dateInputStyle, padding: 7, background: C.card }} /></label>
            {certificate && <div style={{ marginTop: 6, color: C.green, fontSize: 11, fontWeight: 700 }}>{t('Attached')}: {certificate.name}</div>}
            <div style={{ marginTop: 7, color: C.muted, fontSize: 10, lineHeight: 1.5 }}>{t('Medical certificates are held in this browser session only; secure server storage is not connected.')}</div>
          </div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
            <button type="submit" disabled={candidates.length === 0} style={{ padding: '9px 15px', border: 0, borderRadius: 7, background: candidates.length ? C.gold : C.border, color: candidates.length ? '#fff' : C.muted, fontSize: 12, fontWeight: 700, cursor: candidates.length ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>{t('Submit shift request')}</button>
            {swapSent && <span role="status" style={{ color: C.green, fontSize: 12, fontWeight: 700 }}>{t('Shift request submitted.')}</span>}
            {swapError && <span role="alert" style={{ color: C.red, fontSize: 12 }}>{swapError}</span>}
          </div>
        </form>}
      </Card>

      <h2 style={{ margin: '18px 0 10px', fontSize: 15, fontWeight: 800, color: C.text }}>{t('Shift replacement requests')}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {swaps.map(request => {
          const from = employees.find(employee => employee.id === request.from);
          const to = employees.find(employee => employee.id === request.to);
          return <Card key={request.id} style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}><span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{from?.name}</span><span style={{ color: C.muted }}>→</span><span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{to?.name}</span>{statusBadge(request.status)}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{request.date} · {request.shift} · {sites.find(site => site.id === request.site)?.name}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{t('Reason:')} {t(request.reason)}</div>
              {request.medicalCertificate && (canReviewSwap || request.from === user.id) && <a href={request.medicalCertificate.dataUrl} download={request.medicalCertificate.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 7, color: C.gold, fontSize: 11, fontWeight: 700 }}><FileUp size={13}/>{t('View medical certificate')} · {request.medicalCertificate.name}</a>}
            </div>
            {canReviewSwap && request.status === 'pending' && <div style={{ display: 'flex', gap: 8 }}><button onClick={() => updateSwap(request.id, 'approved')} style={{ padding: '7px 14px', borderRadius: 6, border: `1px solid ${C.green}`, background: `${C.green}20`, color: C.green, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{t('✓ Approve')}</button><button onClick={() => updateSwap(request.id, 'rejected')} style={{ padding: '7px 14px', borderRadius: 6, border: `1px solid ${C.red}`, background: `${C.red}20`, color: C.red, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{t('✗ Reject')}</button></div>}
          </Card>;
        })}
        {swaps.length === 0 && <Card><span style={{ color: C.muted, fontSize: 12 }}>{t('No shift requests yet.')}</span></Card>}
      </div>

      <section style={{ marginTop: 28 }}>
        <div style={{ marginBottom: 12 }}><h2 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 800, color: C.text }}>{t('Request holidays')}</h2><p style={{ margin: 0, color: C.muted, fontSize: 12 }}>{t('Holiday requests are checked by HR and then sent to a director for approval.')}</p></div>
        {isHr && <Card style={{ marginBottom: 14 }}>
          <div style={{ marginBottom: 8, color: C.text, fontSize: 13, fontWeight: 800 }}>{t('Manage holiday blocks')}</div>
          {holidayBlocks.length ? <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>{holidayBlocks.slice().sort((a, b) => a.startDate.localeCompare(b.startDate)).map(block => <div key={block.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', color: C.text, fontSize: 12 }}><span><strong>{t(block.kind === 'month' ? 'Month blocked' : 'Week blocked')}:</strong> {formatBlockedPeriod(block)}</span><button type="button" onClick={() => setBlockConfirmation({ action: 'remove', block })} style={{ padding: '5px 9px', border: `1px solid ${C.red}`, borderRadius: 6, background: 'transparent', color: C.red, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{t('Unblock period')}</button></div>)}</div> : <div style={{ marginBottom: 10, color: C.muted, fontSize: 11 }}>{t('No months or weeks are currently blocked.')}</div>}
          {selectedDatesBlocked && <div role="alert" style={{ marginBottom: 9, padding: 9, borderRadius: 6, background: `${C.red}12`, color: C.red, fontSize: 11, fontWeight: 700 }}>{t('This period is blocked for holidays. Choose different dates.')}</div>}
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'end', gap: 9, flexWrap: 'wrap' }}>
              <label style={labelStyle}>{t('Block type')}<select value={blockKind} onChange={event => { setBlockKind(event.target.value as HolidayBlock['kind']); setBlockPeriod(''); }} style={blockInputStyle}><option value="month">{t('Block a month')}</option><option value="week">{t('Block a week')}</option></select></label>
              <label style={labelStyle}>{t(blockKind === 'month' ? 'Month' : 'Select a date in the week')}<input type={blockKind === 'month' ? 'month' : 'date'} value={blockPeriod} onChange={event => setBlockPeriod(event.target.value)} required style={blockInputStyle} /></label>
              <button type="button" disabled={!blockPeriod} onClick={prepareHolidayBlock} style={{ padding: '10px 14px', border: 0, borderRadius: 7, background: blockPeriod ? C.gold : C.border, color: blockPeriod ? '#fff' : C.muted, fontSize: 11, fontWeight: 800, cursor: blockPeriod ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>{t('Block selected period')}</button>
            </div>
          </div>
        </Card>}
        <Card style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}><h3 style={{ margin: 0, color: C.text, fontSize: 14 }}>{t('Request annual leave')}</h3><div style={{ color: C.green, fontSize: 12, fontWeight: 800 }}>{t('Available for new requests')}: {availableForNewRequest} {t('days')}</div></div>
          <form onSubmit={submitHoliday}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,190px),1fr))', gap: 12 }}>
              <label style={labelStyle}>{t('Start date')}<input type="date" min={minHolidayStartDate} value={startDate} onChange={event => { setStartDate(event.target.value); setHolidayError(''); setHolidaySent(false); }} required style={dateInputStyle} /><span style={{ color: C.muted, fontSize: 10, fontWeight: 400 }}>{t('Holiday requests must be submitted at least 3 weeks in advance.')}</span></label>
              <label style={labelStyle}>{t('End date')}<input type="date" min={startDate || minHolidayStartDate} value={endDate} onChange={event => { setEndDate(event.target.value); setHolidayError(''); setHolidaySent(false); }} required style={dateInputStyle} /></label>
              <div style={{ padding: 10, border: `1px solid ${C.border}`, borderRadius: 8, background: C.surface }}><div style={{ color: C.muted, fontSize: 10, fontWeight: 700 }}>{t('Working days requested')}</div><div style={{ marginTop: 4, color: exceedsBalance ? C.red : C.text, fontSize: 20, fontWeight: 900 }}>{requestedDays}</div><div style={{ marginTop: 3, color: C.muted, fontSize: 9 }}>{t('Counts weekdays from Monday to Friday.')}</div></div>
            </div>
            {(exceedsBalance && requestedDays > 0) && <div role="alert" style={{ marginTop: 10, color: C.red, fontSize: 11 }}>{t('Requested working days exceed your available holiday balance.')}</div>}
            {overlapsExistingRequest && <div role="alert" style={{ marginTop: 10, color: C.red, fontSize: 11 }}>{t('These dates overlap another active holiday request.')}</div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 12 }}><button type="submit" disabled={!currentEmployee || requestedDays < 1 || exceedsBalance || overlapsExistingRequest || selectedDatesBlocked} style={{ padding: '9px 15px', border: 0, borderRadius: 7, background: !currentEmployee || requestedDays < 1 || exceedsBalance || overlapsExistingRequest || selectedDatesBlocked ? C.border : C.gold, color: !currentEmployee || requestedDays < 1 || exceedsBalance || overlapsExistingRequest || selectedDatesBlocked ? C.muted : '#fff', fontSize: 12, fontWeight: 700, cursor: !currentEmployee || requestedDays < 1 || exceedsBalance || overlapsExistingRequest || selectedDatesBlocked ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>{t('Submit holiday request')}</button>{holidaySent && <span role="status" style={{ color: C.green, fontSize: 12, fontWeight: 700 }}>{t('Holiday request sent to HR for review.')}</span>}{holidayError && <span role="alert" style={{ color: C.red, fontSize: 12 }}>{holidayError}</span>}</div>
          </form>
        </Card>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 9 }}><h3 style={{ margin: 0, color: C.text, fontSize: 14 }}>{isHr || isDirector ? t('Holiday requests') : t('My holiday requests')}</h3><span style={{ color: C.muted, fontSize: 11 }}>{visibleHolidayRequests.length}</span></div>
        {reviewError && <div role="alert" style={{ marginBottom: 9, color: C.red, fontSize: 12 }}>{reviewError}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {visibleHolidayRequests.map(request => {
            const employee = employees.find(person => person.id === request.employeeId);
            return <Card key={request.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 230 }}><div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}><strong style={{ color: C.text, fontSize: 13 }}>{employee?.name ?? t('Unknown employee')}</strong>{holidayStatus(request)}</div><div style={{ color: C.muted, fontSize: 12 }}>{holidayLabel(request.startDate)} – {holidayLabel(request.endDate)} · {request.workingDays} {t('working days')}</div>{(isHr || isDirector) && <div style={{ color: C.muted, fontSize: 10, marginTop: 3 }}>{t('Available balance')}: {employee?.holidayBalance ?? 0} {t('days')}</div>}{request.status === 'pending_director' && <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5, color: C.blue, fontSize: 10, fontWeight: 700 }}>{t('HR reviewed and forwarded')} <ArrowRight size={12}/></div>}</div>
              {isHr && request.status === 'pending_hr' && <div style={{ display: 'flex', gap: 7 }}><button onClick={() => moveToDirector(request)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 10px', borderRadius: 6, border: `1px solid ${C.blue}`, background: `${C.blue}12`, color: C.blue, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}><ArrowRight size={13}/>{t('Verify & send to director')}</button><button onClick={() => rejectHolidayAsHr(request)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 10px', borderRadius: 6, border: `1px solid ${C.red}`, background: `${C.red}10`, color: C.red, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}><X size={13}/>{t('Reject')}</button></div>}
              {isDirector && request.status === 'pending_director' && <div style={{ display: 'flex', gap: 7 }}><button onClick={() => reviewHoliday(request, 'approved')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 10px', borderRadius: 6, border: `1px solid ${C.green}`, background: `${C.green}12`, color: C.green, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}><Check size={13}/>{t('Approve holiday request')}</button><button onClick={() => reviewHoliday(request, 'rejected')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 10px', borderRadius: 6, border: `1px solid ${C.red}`, background: `${C.red}10`, color: C.red, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}><X size={13}/>{t('Reject')}</button></div>}
            </Card>;
          })}
          {visibleHolidayRequests.length === 0 && <Card><span style={{ color: C.muted, fontSize: 12 }}>{t('No holiday requests yet.')}</span></Card>}
        </div>
        <p style={{ margin: '9px 2px 0', color: C.muted, fontSize: 10, lineHeight: 1.5 }}>{t('Holiday days are counted as weekdays; Irish public holidays are not excluded automatically.')}</p>
      </section>
      {showHolidayBlockNotice && holidayBlocks.length > 0 && <div role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setShowHolidayBlockNotice(false); }} style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(15,23,42,.58)' }}>
        <div role="alertdialog" aria-modal="true" aria-labelledby="holiday-availability-dialog-title" style={{ width: 'min(100%, 440px)', padding: 22, border: `1px solid ${C.red}55`, borderRadius: 14, background: C.card, boxShadow: '0 22px 70px rgba(15,23,42,.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9, color: C.red }}><TriangleAlert size={21}/><span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase' }}>{t('Attention')}</span></div>
          <h2 id="holiday-availability-dialog-title" style={{ margin: '0 0 8px', color: C.text, fontSize: 18, fontWeight: 850 }}>{t('Holiday availability notice')}</h2>
          <p style={{ margin: '0 0 12px', color: C.muted, fontSize: 13, lineHeight: 1.5 }}>{t('The following periods are blocked for holidays. Requests in these dates cannot be submitted or approved.')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>{holidayBlocks.slice().sort((a, b) => a.startDate.localeCompare(b.startDate)).map(block => <div key={block.id} style={{ padding: 10, border: `1px solid ${C.red}55`, borderRadius: 8, background: `${C.red}0A`, color: C.text, fontSize: 12 }}><strong style={{ color: C.red }}>{t(block.kind === 'month' ? 'Month blocked' : 'Week blocked')}:</strong> {formatBlockedPeriod(block)}</div>)}</div>
          <button type="button" autoFocus onClick={() => setShowHolidayBlockNotice(false)} style={{ width: '100%', padding: '10px 14px', border: 0, borderRadius: 8, background: C.gold, color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>{t('Understood')}</button>
        </div>
      </div>}
      {blockConfirmation && <div role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setBlockConfirmation(null); }} style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(15,23,42,.55)' }}>
        <div role="alertdialog" aria-modal="true" aria-labelledby="holiday-block-dialog-title" style={{ width: 'min(100%, 420px)', padding: 20, border: `1px solid ${C.border}`, borderRadius: 12, background: C.card, boxShadow: '0 20px 60px rgba(15,23,42,.25)' }}>
          <h2 id="holiday-block-dialog-title" style={{ margin: '0 0 8px', color: C.text, fontSize: 17, fontWeight: 800 }}>{t('Confirm holiday block')}</h2>
          <p style={{ margin: '0 0 18px', color: C.muted, fontSize: 13, lineHeight: 1.55 }}>{blockConfirmation.action === 'add' ? t('Confirm blocking this period for holidays?') : t('Confirm removing this holiday block?')}<br/><strong style={{ color: C.text }}>{formatBlockedPeriod(blockConfirmation.block)}</strong>{blockConfirmation.action === 'add' && <><br/><span style={{ display: 'inline-block', marginTop: 8 }}>{t('New requests and pending approvals in this period will be blocked. Already approved holidays are not cancelled.')}</span></>}</p>
          <div style={{ display: 'flex', justifyContent: 'end', gap: 8 }}><button type="button" onClick={() => setBlockConfirmation(null)} style={{ padding: '8px 13px', border: `1px solid ${C.border}`, borderRadius: 7, background: C.card, color: C.text, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{t('Cancel')}</button><button type="button" onClick={applyBlockConfirmation} style={{ padding: '8px 13px', border: 0, borderRadius: 7, background: blockConfirmation.action === 'add' ? C.gold : C.red, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{t(blockConfirmation.action === 'add' ? 'Confirm block' : 'Confirm unblock')}</button></div>
        </div>
      </div>}
    </div>
  );
}
