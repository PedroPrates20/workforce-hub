import { useState } from 'react';
import type { Employee, Role } from '../types';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { C, PROFILES, initials, roleColor } from '../constants';
import { useApp, useI18n } from '../context/AppContext';

type Filter = 'all' | Role;
type Confirmation = { type:'save'|'delete'; employeeId:string } | null;
const roleFilters: { value:Filter; label:string; color:string }[] = [
  {value:'all',label:'All',color:C.gold},
  {value:'cleaner',label:'Operational',color:C.blue},
  {value:'supervisor',label:'Supervisor',color:C.green},
  {value:'hr',label:'HR',color:'#f59e0b'},
  {value:'security',label:'Security',color:'#8b5cf6'},
  {value:'director',label:'Director',color:C.gold},
];

const inputStyle:React.CSSProperties={width:'100%',background:C.card,border:`1px solid ${C.border}`,borderRadius:7,padding:'9px 10px',color:C.text,fontSize:12,fontFamily:'inherit',boxSizing:'border-box'};

export function TeamStatus() {
  const {t}=useI18n();
  const {employees,setEmployees,sites,setRoster,setSwaps}=useApp();
  const [filter,setFilter]=useState<Filter>('all');
  const [expanded,setExpanded]=useState<string|null>(null);
  const [draft,setDraft]=useState<Employee|null>(null);
  const [confirmation,setConfirmation]=useState<Confirmation>(null);
  const [formError,setFormError]=useState('');
  const emps=filter==='all'?employees:employees.filter(employee=>employee.role===filter);

  const updateDraft=<K extends keyof Employee>(key:K,value:Employee[K])=>setDraft(current=>current?{...current,[key]:value}:current);
  const beginEdit=(employee:Employee)=>{setDraft({...employee});setFormError('');};
  const confirmAction=()=>{
    if(!confirmation)return;
    const {type,employeeId}=confirmation;
    if(type==='save'&&draft){
      if(!draft.name.trim()||!draft.email.trim()||!/^\S+@\S+\.\S+$/.test(draft.email.trim())){setFormError(t('Enter a name and a valid e-mail address.'));setConfirmation(null);return;}
      const entitlement=draft.holidayEntitlement??30;
      if(entitlement<0||draft.holidayBalance<0||draft.holidayBalance>entitlement){setFormError(t('Holiday balance must be between zero and the annual allowance.'));setConfirmation(null);return;}
      const updated={...draft,holidayEntitlement:entitlement,name:draft.name.trim(),email:draft.email.trim(),phone:draft.phone.trim(),address:draft.address?.trim()||'',nationality:draft.nationality.trim()};
      setEmployees(current=>current.map(employee=>employee.id===employeeId?updated:employee));
      setDraft(null);setExpanded(employeeId);
    }else if(type==='delete'){
      setEmployees(current=>current.filter(employee=>employee.id!==employeeId));
      setRoster(current=>Object.fromEntries(Object.entries(current).map(([day,daySites])=>[day,Object.fromEntries(Object.entries(daySites).map(([siteId,slots])=>[siteId,slots.filter(slot=>slot.empId!==employeeId)])).filter(([,slots])=>slots.length>0)]).filter(([,daySites])=>Object.keys(daySites).length>0)));
      setSwaps(current=>current.filter(swap=>swap.from!==employeeId&&swap.to!==employeeId));
      setExpanded(null);
      setDraft(null);
    }
    setConfirmation(null);setFormError('');
  };

  const field=(label:string,value:string|number,onChange:(value:string)=>void,type='text')=>(
    <label style={{fontSize:11,color:C.muted}}>{t(label)}<input type={type} value={value} onChange={event=>onChange(event.target.value)} style={{...inputStyle,marginTop:5}} /></label>
  );
  const infoBlock=(title:string,items:[string,string|number|null|undefined][])=> (
    <section style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:9,padding:12}}>
      <div style={{fontSize:12,fontWeight:800,color:C.text,marginBottom:9}}>{t(title)}</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:'9px 16px'}}>
        {items.map(([label,value])=><div key={label}><div style={{fontSize:10,color:C.muted,marginBottom:2}}>{t(label)}</div><div style={{fontSize:12,color:C.text,fontWeight:600,overflowWrap:'anywhere'}}>{value||t('Not provided')}</div></div>)}
      </div>
    </section>
  );

  return (
    <div className="workforce-page" style={{padding:24}}>
      <div style={{fontSize:20,fontWeight:800,color:C.text,marginBottom:4}}>{t('Team Status & Compliance')}</div>
      <div style={{fontSize:12,color:C.muted,marginBottom:20}}>{t('Monitoring hours, visas, and alerts')} · {employees.length} {t('employees')}</div>

      <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
        {roleFilters.map(({value,label,color})=><button key={value} onClick={()=>setFilter(value)} aria-pressed={filter===value}
          style={{padding:'6px 14px',borderRadius:7,border:`1.5px solid ${filter===value?color:C.border}`,background:filter===value?`${color}20`:'transparent',color:filter===value?color:C.muted,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{t(label)}</button>)}
      </div>

      <div className="workforce-stack" style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(100%,480px),1fr))',alignItems:'start',gap:12}}>
        {emps.map(employee=>{
          const entitlement=employee.holidayEntitlement??30;
          const daysUsed=Math.max(0,entitlement-employee.holidayBalance);
          const isExpanded=expanded===employee.id;

          return <Card key={employee.id} style={{display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
            <div style={{width:44,height:44,borderRadius:'50%',background:employee.active?roleColor(employee.role):C.muted,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:'#fff',flexShrink:0,opacity:employee.active?1:.5}}>{initials(employee.name)}</div>
            <div style={{flex:1,minWidth:180}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2,flexWrap:'wrap'}}>
                <span style={{fontWeight:700,fontSize:14,color:C.text}}>{employee.name}</span>
                {!employee.active&&<Badge label={t('Inactive')} color={C.muted}/>}
                <Badge label={t(PROFILES[employee.role].label)} color={roleColor(employee.role)}/>
              </div>
              <div style={{fontSize:11,color:C.muted}}>{t(employee.nationality)} · {employee.email}</div>
            </div>
            <div style={{minWidth:115,textAlign:'center',padding:'4px 10px',borderLeft:`1px solid ${C.border}`,borderRight:`1px solid ${C.border}`}}><div style={{fontSize:10,color:C.muted,marginBottom:3}}>{t('Holidays remaining / total')}</div><div style={{fontSize:15,fontWeight:800,color:C.green}}>{employee.holidayBalance}/{entitlement}</div><div style={{fontSize:10,color:C.muted}}>{daysUsed} {t('days used')}</div></div>
            <button onClick={()=>setExpanded(isExpanded?null:employee.id)} aria-expanded={isExpanded} style={{padding:'7px 10px',borderRadius:7,border:`1px solid ${C.border}`,background:C.card,color:C.text,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{t(isExpanded?'Show less':'View more information')}</button>

            {isExpanded&&<div className="workforce-stack" style={{width:'100%',borderTop:`1px solid ${C.border}`,paddingTop:14,display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10}}>
              {infoBlock('Personal information', [['Full name',employee.name],['E-mail',employee.email],['Telephone',employee.phone],['Address',employee.address],['Nationality',employee.nationality]])}
              {infoBlock('Employment information', [['Role',t(PROFILES[employee.role].title)],['Status',t(employee.active?'Active':'Inactive')],['Site',sites.find(site=>site.id===employee.site)?.name],['Contract start date',employee.contractStart]])}
              {infoBlock('Holidays and hours', [['Holiday balance',`${employee.holidayBalance}/${entitlement} ${t('days')}`],['Days used',`${daysUsed} ${t('days')}`],['Annual holiday allowance',`${entitlement} ${t('days')}`]])}
              {infoBlock('Compliance and documents', [['Work permission',employee.stamp||t('Not provided')],['Hours used',`${employee.hoursUsed} h`],['Hours limit',`${employee.hoursLimit} h`],['Visa expiry',employee.visaExpiry],['Certificate expiry',employee.certExpiry]])}
              <div style={{gridColumn:'1 / -1',display:'flex',gap:8,justifyContent:'flex-end',flexWrap:'wrap'}}>
                <button onClick={()=>beginEdit(employee)} style={{padding:'8px 14px',borderRadius:7,border:`1px solid ${C.gold}`,background:`${C.gold}12`,color:C.gold,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{t('Edit employee')}</button>
                <button onClick={()=>setConfirmation({type:'delete',employeeId:employee.id})} style={{padding:'8px 14px',borderRadius:7,border:`1px solid ${C.red}55`,background:`${C.red}0b`,color:C.red,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{t('Delete employee')}</button>
              </div>
            </div>}
          </Card>;
        })}
        {emps.length===0&&<Card><div style={{fontSize:13,color:C.muted}}>{t('No employees found')}</div></Card>}
      </div>

      {draft&&<div role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget){setDraft(null);setFormError('');}}} style={{position:'fixed',inset:0,zIndex:1200,background:'rgba(15,27,45,.5)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
        <form role="dialog" aria-modal="true" aria-labelledby="employee-edit-title" onSubmit={event=>{event.preventDefault();setFormError('');setConfirmation({type:'save',employeeId:draft.id});}} style={{width:'100%',maxWidth:680,maxHeight:'92vh',overflowY:'auto',background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:20,boxShadow:'0 16px 48px rgba(0,0,0,.2)'}}>
          <div id="employee-edit-title" style={{fontSize:17,fontWeight:800,color:C.text,marginBottom:4}}>{t('Edit employee')}</div><div style={{fontSize:12,color:C.muted,marginBottom:14}}>{draft.name}</div>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div style={{fontSize:12,fontWeight:800,color:C.text}}>{t('Personal information')}</div>
            <div className="workforce-stack" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {field('Full name',draft.name,value=>updateDraft('name',value))}
              {field('E-mail',draft.email,value=>updateDraft('email',value),'email')}
              {field('Telephone',draft.phone,value=>updateDraft('phone',value),'tel')}
              {field('Address',draft.address||'',value=>updateDraft('address',value))}
              {field('Nationality',draft.nationality,value=>updateDraft('nationality',value))}
            </div>
            <div style={{fontSize:12,fontWeight:800,color:C.text,marginTop:4}}>{t('Employment information')}</div>
            <div className="workforce-stack" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {field('Contract start date',draft.contractStart||'',value=>updateDraft('contractStart',value),'date')}
              <label style={{fontSize:11,color:C.muted}}>{t('Site')}<select value={draft.site} onChange={event=>updateDraft('site',event.target.value)} style={{...inputStyle,marginTop:5}}>{sites.map(site=><option key={site.id} value={site.id}>{site.name}</option>)}</select></label>
              <label style={{fontSize:11,color:C.muted}}>{t('Role')}<select value={draft.role} onChange={event=>updateDraft('role',event.target.value as Role)} style={{...inputStyle,marginTop:5}}>{Object.entries(PROFILES).map(([role,profile])=><option key={role} value={role}>{t(profile.title)}</option>)}</select></label>
              <label style={{fontSize:11,color:C.muted}}>{t('Status')}<select value={draft.active?'active':'inactive'} onChange={event=>updateDraft('active',event.target.value==='active')} style={{...inputStyle,marginTop:5}}><option value="active">{t('Active')}</option><option value="inactive">{t('Inactive')}</option></select></label>
            </div>
            <div style={{fontSize:12,fontWeight:800,color:C.text,marginTop:4}}>{t('Holidays and hours')}</div>
            <div className="workforce-stack" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {field('Holiday balance (days)',draft.holidayBalance,value=>updateDraft('holidayBalance',Number(value)||0),'number')}
              {field('Annual holiday allowance (days)',draft.holidayEntitlement??30,value=>updateDraft('holidayEntitlement',Number(value)||0),'number')}
              {field('Hours used',draft.hoursUsed,value=>updateDraft('hoursUsed',Number(value)||0),'number')}
              {field('Hours limit',draft.hoursLimit,value=>updateDraft('hoursLimit',Number(value)||0),'number')}
              <label style={{fontSize:11,color:C.muted}}>{t('Work permission')}<select value={draft.stamp||''} onChange={event=>updateDraft('stamp',(event.target.value||null) as Employee['stamp'])} style={{...inputStyle,marginTop:5}}><option value="">{t('Not provided')}</option><option value="Stamp 2">Stamp 2</option><option value="Stamp 4">Stamp 4</option></select></label>
            </div>
            <div style={{fontSize:12,fontWeight:800,color:C.text,marginTop:4}}>{t('Compliance and documents')}</div>
            <div className="workforce-stack" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>{field('Visa expiry',draft.visaExpiry,value=>updateDraft('visaExpiry',value),'date')}{field('Certificate expiry',draft.certExpiry,value=>updateDraft('certExpiry',value),'date')}</div>
          </div>
          {formError&&<div role="alert" style={{color:C.red,fontSize:12,marginTop:12}}>{formError}</div>}
          <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:16}}><button type="button" onClick={()=>{setDraft(null);setFormError('');}} style={{padding:'8px 14px',borderRadius:7,border:`1px solid ${C.border}`,background:'transparent',color:C.muted,fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>{t('Cancel')}</button><button type="submit" style={{padding:'8px 14px',borderRadius:7,border:0,background:C.gold,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{t('Review and confirm')}</button></div>
        </form>
      </div>}

      {confirmation&&<div role="presentation" style={{position:'fixed',inset:0,zIndex:1300,background:'rgba(15,27,45,.6)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
        <div role="alertdialog" aria-modal="true" aria-labelledby="employee-confirm-title" style={{width:'100%',maxWidth:400,background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:20,boxShadow:'0 16px 48px rgba(0,0,0,.25)'}}>
          <div id="employee-confirm-title" style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:8}}>{t(confirmation.type==='delete'?'Confirm employee deletion':'Confirm employee changes')}</div>
          <div style={{fontSize:13,color:C.muted,lineHeight:1.5}}>{t(confirmation.type==='delete'?'This will permanently remove the employee and their assigned shifts.':'Review the employee details before saving these changes.')}</div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:18}}><button onClick={()=>setConfirmation(null)} style={{padding:'8px 14px',borderRadius:7,border:`1px solid ${C.border}`,background:'transparent',color:C.muted,fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>{t('Go back')}</button><button onClick={confirmAction} style={{padding:'8px 14px',borderRadius:7,border:0,background:confirmation.type==='delete'?C.red:C.gold,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{t(confirmation.type==='delete'?'Confirm deletion':'Confirm and save')}</button></div>
        </div>
      </div>}
    </div>
  );
}
