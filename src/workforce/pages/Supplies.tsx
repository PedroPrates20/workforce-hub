import { useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { Package, Check, X } from 'lucide-react';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { useApp, useI18n } from '../context/AppContext';
import { C } from '../constants';
import type { SupplyRequest } from '../types';
import { localeOf } from '../i18n';
import { openRequestEmailDraft, reviewEmailsForSite } from '../utils/requestEmails';

const CATEGORIES: SupplyRequest['category'][] = ['Cleaning supplies', 'Security equipment', 'PPE', 'Other'];

export function Supplies() {
  const { user, employees, sites, supplyRequests, setSupplyRequests } = useApp();
  const { lang, t } = useI18n();
  const canApprove = ['supervisor', 'hr', 'director'].includes(user.role);
  const [siteId, setSiteId] = useState(user.site || sites.find(site => site.active)?.id || '');
  const requestSiteId = canApprove ? siteId : user.site;
  const [category, setCategory] = useState<SupplyRequest['category']>('Cleaning supplies');
  const [item, setItem] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [emailNotice, setEmailNotice] = useState('');

  const prepareEmail = (to:string[],cc:string[],subject:string,body:string) => {
    setEmailNotice(openRequestEmailDraft(to,cc,subject,body)?t('Email draft opened. Press Send in your email app to deliver it.'):t('No valid email address is available for this notification.'));
  };

  const visibleRequests = useMemo(() => (canApprove
    ? supplyRequests
    : supplyRequests.filter(request => request.employeeId === user.id && request.siteId === user.site)
  ).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [canApprove, supplyRequests, user.id, user.site]);

  const normalizedItem = item.trim().toLocaleLowerCase();
  const duplicateRequest = normalizedItem ? supplyRequests.find(request => {
    if (request.employeeId !== user.id || request.siteId !== requestSiteId || request.status !== 'pending' || request.item.trim().toLocaleLowerCase() !== normalizedItem) return false;
    const age = Date.now() - new Date(request.createdAt).getTime();
    return Number.isFinite(age) && age >= 0 && age <= 3 * 24 * 60 * 60 * 1000;
  }) : undefined;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const count = Number(quantity);
    if (!item.trim() || !requestSiteId || !Number.isInteger(count) || count < 1 || count > 999) {
      setError(t('Enter an item, a site, and a quantity from 1 to 999.'));
      setSent(false);
      return;
    }
    const alreadyRequested = supplyRequests.some(request => {
      if (request.employeeId !== user.id || request.siteId !== requestSiteId || request.status !== 'pending' || request.item.trim().toLocaleLowerCase() !== normalizedItem) return false;
      const age = Date.now() - new Date(request.createdAt).getTime();
      return Number.isFinite(age) && age >= 0 && age <= 3 * 24 * 60 * 60 * 1000;
    });
    if (alreadyRequested) {
      setSent(false);
      return;
    }
    const request: SupplyRequest = {
      id: globalThis.crypto?.randomUUID?.() ?? `supply-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      employeeId: user.id,
      siteId: requestSiteId,
      category,
      item: item.trim(),
      quantity: count,
      details: details.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setSupplyRequests(current => [request, ...current]);
    const reviewers=reviewEmailsForSite(employees,requestSiteId);
    if(reviewers.length===0)setEmailNotice(t('No HR or supervisor email is configured for this request.'));
    else prepareEmail(reviewers,[user.email],t('Supply request received · {reference}',{reference:request.id}),[
      t('Request reference: {reference}',{reference:request.id}),
      `${t('Employee')}: ${user.name}`,
      `${t('Site')}: ${sites.find(site=>site.id===requestSiteId)?.name??requestSiteId}`,
      `${t('Category')}: ${t(category)}`,
      `${t('Supply item')}: ${request.item}`,
      `${t('Quantity')}: ${request.quantity}`,
      request.details?`${t('Details (optional)')}: ${request.details}`:'',
      '',t('This is a prototype email draft. Press Send in your email app to deliver it.'),
    ].filter(Boolean).join('\n'));
    setItem('');
    setQuantity('1');
    setDetails('');
    setError('');
    setSent(true);
  };

  const updateStatus = (id: string, status: SupplyRequest['status']) => {
    const request=supplyRequests.find(item=>item.id===id);
    if(!request)return;
    setSupplyRequests(current => current.map(request => request.id === id ? { ...request, status } : request));
    const employee=employees.find(person=>person.id===request.employeeId);
    if(employee)prepareEmail([employee.email],[],t('Supply request {status} · {reference}',{status:t(status==='approved'?'Approved':'Rejected'),reference:id}),[
      t('Request reference: {reference}',{reference:id}),
      `${t('Request status')}: ${t(status==='approved'?'Approved':'Rejected')}`,
      `${t('Site')}: ${sites.find(site=>site.id===request.siteId)?.name??request.siteId}`,
      `${t('Supply item')}: ${request.item}`,
      `${t('Quantity')}: ${request.quantity}`,
      '',t(status==='approved'?'Your supply request was approved.':'Your supply request was rejected.'),
      '',t('This is a prototype email draft. Press Send in your email app to deliver it.'),
    ].join('\n'));
  };

  const statusColor = (status: SupplyRequest['status']) => status === 'approved' ? C.green : status === 'rejected' ? C.red : '#f59e0b';
  const inputStyle: CSSProperties = { width: '100%', boxSizing: 'border-box', minHeight: 40, padding: '9px 11px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.card, color: C.text, fontSize: 13, fontFamily: 'inherit' };
  const labelStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, color: C.muted, fontSize: 11, fontWeight: 700 };

  return (
    <div className="workforce-page" style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <Package size={21} color={C.gold} />
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.text }}>{t('Supply Requests')}</h1>
      </div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>{t('Request supplies for your work site')}</div>
      {emailNotice&&<div role="status" aria-live="polite" style={{marginBottom:12,padding:'10px 12px',border:`1px solid ${C.blue}55`,borderRadius:8,background:`${C.blue}0A`,color:C.text,fontSize:11,lineHeight:1.5}}>{emailNotice}</div>}

      <Card style={{ marginBottom: 18 }}>
        <h2 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 800, color: C.text }}>{t('New supply request')}</h2>
        <form onSubmit={submit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,210px),1fr))', gap: 12 }}>
            <label style={labelStyle}>{t('Site')}
              {canApprove
                ? <select value={siteId} onChange={event => setSiteId(event.target.value)} required style={inputStyle}>
                    <option value="">{t('Select a site')}</option>
                    {sites.filter(site => site.active).map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
                  </select>
                : <div aria-readonly="true" style={{ ...inputStyle, display: 'flex', alignItems: 'center' }}>{sites.find(site => site.id === user.site)?.name ?? t('No site assigned to your account')}</div>}
            </label>
            <label style={labelStyle}>{t('Category')}
              <select value={category} onChange={event => setCategory(event.target.value as SupplyRequest['category'])} style={inputStyle}>
                {CATEGORIES.map(value => <option key={value} value={value}>{t(value)}</option>)}
              </select>
            </label>
            <label style={labelStyle}>{t('Supply item')}
              <input value={item} onChange={event => setItem(event.target.value)} maxLength={100} required placeholder={t('Enter the item name')} style={inputStyle} />
            </label>
            <label style={labelStyle}>{t('Quantity')}
              <input type="number" value={quantity} onChange={event => setQuantity(event.target.value)} min={1} max={999} step={1} required style={inputStyle} />
            </label>
          </div>
          <label style={{ ...labelStyle, marginTop: 12 }}>{t('Details (optional)')}
            <textarea value={details} onChange={event => setDetails(event.target.value)} maxLength={500} rows={3} placeholder={t('Add details about the request')} style={{ ...inputStyle, resize: 'vertical' }} />
          </label>
          {duplicateRequest && <div role="alert" style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.gold}66`, background: `${C.gold}12`, color: C.text, fontSize: 12, lineHeight: 1.5 }}>{t('Open duplicate supply request warning')}</div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
            <button type="submit" disabled={!requestSiteId || !!duplicateRequest} style={{ padding: '9px 16px', border: 0, borderRadius: 7, background: !requestSiteId || duplicateRequest ? C.border : C.gold, color: !requestSiteId || duplicateRequest ? C.muted : '#fff', fontSize: 12, fontWeight: 700, cursor: !requestSiteId || duplicateRequest ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>{t('Submit supply request')}</button>
            {sent && <span role="status" style={{ color: C.green, fontSize: 12, fontWeight: 700 }}>{t('Supply request submitted.')}</span>}
            {error && <span role="alert" style={{ color: C.red, fontSize: 12 }}>{error}</span>}
          </div>
        </form>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.text }}>{canApprove ? t('Supply requests') : t('My supply requests')}</h2>
        <span style={{ color: C.muted, fontSize: 11 }}>{visibleRequests.length}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visibleRequests.map(request => {
          const employee = employees.find(person => person.id === request.employeeId);
          const site = sites.find(location => location.id === request.siteId);
          return <Card key={request.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 220, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{request.item}</span>
                <Badge label={t(request.status[0].toUpperCase() + request.status.slice(1))} color={statusColor(request.status)} />
              </div>
              <div style={{ color: C.muted, fontSize: 12 }}>{t(request.category)} · {t('Quantity')}: {request.quantity}</div>
              <div style={{ color: C.muted, fontSize: 12, marginTop: 3 }}>{site?.name ?? t('Unknown site')} · {employee?.name ?? t('Unknown employee')} · {new Intl.DateTimeFormat(localeOf(lang), { dateStyle: 'medium', timeZone: 'Europe/Dublin' }).format(new Date(request.createdAt))}</div>
              {request.details && <div style={{ color: C.text, fontSize: 12, marginTop: 6, whiteSpace: 'pre-wrap' }}>{request.details}</div>}
            </div>
            {canApprove && request.status === 'pending' && <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => updateStatus(request.id, 'approved')} aria-label={t('Approve supply request')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 6, border: `1px solid ${C.green}`, background: `${C.green}18`, color: C.green, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}><Check size={14}/>{t('Approve')}</button>
              <button onClick={() => updateStatus(request.id, 'rejected')} aria-label={t('Reject supply request')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 6, border: `1px solid ${C.red}`, background: `${C.red}12`, color: C.red, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}><X size={14}/>{t('Reject')}</button>
            </div>}
          </Card>;
        })}
        {visibleRequests.length === 0 && <Card><div style={{ color: C.muted, fontSize: 13 }}>{t('No supply requests yet.')}</div></Card>}
      </div>
    </div>
  );
}
