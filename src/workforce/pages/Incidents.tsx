import { useState } from 'react';
import type { Incident } from '../types';
import { useApp, useI18n } from '../context/AppContext';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { C, MOCK_INCIDENTS, fmt } from '../constants';

export function Incidents() {
  const [incidents,setIncidents]=useState(MOCK_INCIDENTS);
  const [showForm,setShowForm]=useState(false);
  const {user,employees,sites}=useApp();
  const {t}=useI18n();
  const [form,setForm]=useState({site:"s1",type:"",description:"",severity:"low"});
  const sevColor=(s:Incident["severity"])=>s==="high"?C.red:s==="medium"?"#f59e0b":C.green;

  const add=()=>{
    if(!form.type) return;
    setIncidents(prev=>[...prev,{id:`i${prev.length+1}`,reportedBy:user.id,site:form.site,date:fmt(new Date()),type:form.type,description:form.description,severity:form.severity as Incident["severity"]}]);
    setForm({site:"s1",type:"",description:"",severity:"low"});
    setShowForm(false);
  };

  return (
    <div className="workforce-page" style={{padding:24}}>
      <div className="workforce-head" style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <div style={{fontSize:20,fontWeight:800,color:C.text}}>{t("Incidents")}</div>
          <div style={{fontSize:12,color:C.muted}}>{t("Operational incident logs")}</div>
        </div>
        <button onClick={()=>setShowForm(s=>!s)} style={{background:C.gold,color:"#fff",border:"none",borderRadius:7,padding:"9px 18px",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{t("+ Log Incident")}</button>
      </div>

      {showForm && (
        <Card style={{marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:12}}>{t("New Incident")}</div>
          <div className="workforce-stack" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <div>
              <div style={{fontSize:11,color:C.muted,marginBottom:5}}>{t("Site")}</div>
              <select value={form.site} onChange={e=>setForm(p=>({...p,site:e.target.value}))}
                style={{width:"100%",background:"#ffffff",border:`1px solid ${C.border}`,borderRadius:7,padding:"8px 10px",color:C.text,fontSize:13,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}>
                {sites.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:11,color:C.muted,marginBottom:5}}>{t("Type")}</div>
              <input value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))} placeholder={t("E.g. Unauthorized access")}
                style={{width:"100%",background:"#ffffff",border:`1px solid ${C.border}`,borderRadius:7,padding:"8px 10px",color:C.text,fontSize:13,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
            </div>
            <div>
              <div style={{fontSize:11,color:C.muted,marginBottom:5}}>{t("Severity")}</div>
              <select value={form.severity} onChange={e=>setForm(p=>({...p,severity:e.target.value}))}
                style={{width:"100%",background:"#ffffff",border:`1px solid ${C.border}`,borderRadius:7,padding:"8px 10px",color:C.text,fontSize:13,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}>
                <option value="low">{t("Low")}</option><option value="medium">{t("Medium")}</option><option value="high">{t("High")}</option>
              </select>
            </div>
            <div>
              <div style={{fontSize:11,color:C.muted,marginBottom:5}}>{t("Description")}</div>
              <input value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder={t("Describe the incident...")}
                style={{width:"100%",background:"#ffffff",border:`1px solid ${C.border}`,borderRadius:7,padding:"8px 10px",color:C.text,fontSize:13,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={add} style={{background:C.gold,color:"#fff",border:"none",borderRadius:7,padding:"8px 18px",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{t("Submit")}</button>
            <button onClick={()=>setShowForm(false)} style={{background:"transparent",color:C.muted,border:`1px solid ${C.border}`,borderRadius:7,padding:"8px 18px",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{t("Cancel")}</button>
          </div>
        </Card>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {incidents.map(inc=>{
          const rep=employees.find(e=>e.id===inc.reportedBy);
          const site=sites.find(s=>s.id===inc.site);
          return (
            <Card key={inc.id} style={{display:"flex",gap:14,alignItems:"flex-start"}}>
              <div style={{width:36,height:36,borderRadius:8,background:`${sevColor(inc.severity)}20`,border:`1px solid ${sevColor(inc.severity)}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>
                {inc.severity==="high"?"":inc.severity==="medium"?"":""}
              </div>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                  <span style={{fontWeight:700,fontSize:14,color:C.text}}>{t(inc.type)}</span>
                  <Badge label={t(inc.severity==="high"?"High":inc.severity==="medium"?"Medium":"Low")} color={sevColor(inc.severity)}/>
                </div>
                <div style={{fontSize:12,color:C.muted,marginBottom:3}}>{t(inc.description)}</div>
                <div style={{fontSize:11,color:C.muted}}>{inc.date} · {site?.name} · {t("Reported by")} {rep?.name}</div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
