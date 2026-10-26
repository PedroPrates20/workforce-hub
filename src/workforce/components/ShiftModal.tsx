import { useState } from 'react';
import { createPortal } from 'react-dom';
import { C, PROFILES, SHIFT_PRESETS, initials, roleColor } from '../constants';
import { useApp, useI18n } from '../context/AppContext';
import { useIsMobile } from '@/hooks/use-mobile';
import type { RosterStaffFilter } from '../types';

function getShiftPreset(start:string) {
  return SHIFT_PRESETS.find(s=>s.start===start)||SHIFT_PRESETS[0];
}

export function ShiftModal({siteId: _siteId, siteName, dayLabel, assigned, staffFilter, fixedEmployeeId, onAdd, onClose}:{siteId:string; siteName:string; dayLabel:string; assigned:string[]; staffFilter:RosterStaffFilter; fixedEmployeeId?:string; onAdd:(empId:string,start:string,end:string)=>void; onClose:()=>void}) {
  const {t}=useI18n();
  const {employees}=useApp();
  const isMobile=useIsMobile();
  const [search,setSearch]=useState("");
  const [selEmp,setSelEmp]=useState<string|null>(fixedEmployeeId??null);
  const [start,setStart]=useState("09:00");
  const [end,setEnd]=useState("17:00");
  const avail = employees.filter(e=>e.active && ['cleaner','security','supervisor'].includes(e.role) && (staffFilter==='all'||e.role===staffFilter) && (!fixedEmployeeId||e.id===fixedEmployeeId) && !assigned.includes(e.id) && e.name.toLowerCase().includes(search.toLowerCase()));

  return createPortal(
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:9998,background:"rgba(0,0,0,.7)",backdropFilter:"blur(3px)"}}/>
      <div style={{position:"fixed",zIndex:9999,top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"min(560px,96vw)",maxHeight:"92dvh",background:C.card,border:`1px solid ${C.gold}`,borderRadius:14,display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 24px 64px #000c",fontFamily:"inherit"}}>
        <div style={{background:C.surface,padding:"12px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,borderBottom:`1px solid ${C.gold}40`}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:1}}>{t("ADD SHIFT")}</div>
            <div style={{fontSize:14,fontWeight:800,color:C.text}}>{siteName}</div>
            <div style={{fontSize:12,color:C.muted}}>{dayLabel}</div>
          </div>
          <button onClick={onClose} style={{background:`${C.border}`,border:"none",borderRadius:6,color:C.muted,cursor:"pointer",width:28,height:28,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit"}}>×</button>
        </div>

        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",flex:1,overflow:isMobile?"auto":"hidden",minHeight:0}}>
          <div style={{borderRight:isMobile?"none":`1px solid ${C.border}`,borderBottom:isMobile?`1px solid ${C.border}`:"none",display:"flex",flexDirection:"column",overflow:isMobile?"visible":"hidden"}}>
            <div style={{padding:"12px 14px 8px",flexShrink:0}}>
              <div style={{fontSize:10,fontWeight:700,color:C.muted,marginBottom:7,letterSpacing:.8}}>{t("EMPLOYEE")}</div>
              <input autoFocus={!isMobile} value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("Search...")}
                style={{width:"100%",background:"#ffffff",border:`1px solid ${C.border}`,borderRadius:7,padding:"7px 10px",color:C.text,fontSize:13,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
            </div>
            <div style={{flex:1,overflowY:"auto",maxHeight:isMobile?220:undefined,padding:"0 8px 8px"}}>
              {avail.length===0
                ? <div style={{padding:20,textAlign:"center",color:C.muted,fontSize:13}}>{t("No available employees")}</div>
                : avail.map(e=>{
                    const active=selEmp===e.id;
                    return (
                      <div key={e.id} onClick={()=>!fixedEmployeeId&&setSelEmp(active?null:e.id)}
                        style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,cursor:fixedEmployeeId?"default":"pointer",background:active?`${C.gold}18`:"transparent",border:`1.5px solid ${active?C.gold:"transparent"}`,marginBottom:2,transition:"all .1s"}}>
                        <div style={{width:32,height:32,borderRadius:"50%",background:active?C.gold:C.border,color:active?"#000":C.muted,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,flexShrink:0,transition:"all .1s"}}>
                          {initials(e.name)}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:600,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e.name}</div>
                          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3,flexWrap:"wrap"}}>
                            <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:99,background:`${roleColor(e.role)}18`,color:roleColor(e.role),border:`1px solid ${roleColor(e.role)}55`}}>
                              {t(e.role === "cleaner" ? "Cleaner" : e.role === "security" ? "Security" : "Supervisor")}
                            </span>
                            <span style={{fontSize:11,color:C.muted}}>{e.stamp||"EU"}</span>
                          </div>
                        </div>
                        {active && <span style={{color:C.gold,fontWeight:800}}>✓</span>}
                      </div>
                    );
                  })
              }
            </div>
          </div>

          <div style={{padding:"12px 14px",overflowY:"auto"}}>
            <div style={{fontSize:10,fontWeight:700,color:C.muted,marginBottom:10,letterSpacing:.8}}>{t("SHIFT")}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:12}}>
              {SHIFT_PRESETS.map(ps=>{
                const active=start===ps.start&&end===ps.end;
                return (
                  <button key={ps.start} onClick={()=>{setStart(ps.start);setEnd(ps.end);}}
                    style={{padding:"10px 8px",borderRadius:8,cursor:"pointer",border:`2px solid ${active?ps.color:C.border}`,background:active?ps.bg+"22":"transparent",textAlign:"left",fontFamily:"inherit",transition:"all .1s"}}>
                    <div style={{fontSize:12,fontWeight:800,color:active?ps.color:C.muted}}>{t(ps.label)}</div>
                    <div style={{fontSize:10,color:active?ps.color:C.muted,marginTop:1,opacity:.8}}>{ps.start}–{ps.end}</div>
                  </button>
                );
              })}
            </div>
            <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:12}}>
              <div style={{flex:1}}>
                <div style={{fontSize:10,color:C.muted,marginBottom:4,fontWeight:600}}>{t("START")}</div>
                <input type="time" value={start} onChange={e=>setStart(e.target.value)}
                  style={{width:"100%",background:"#ffffff",border:`1px solid ${C.border}`,borderRadius:6,padding:"7px 8px",fontSize:13,fontFamily:"inherit",outline:"none",color:C.text,boxSizing:"border-box"}}/>
              </div>
              <div style={{color:C.muted,fontSize:16,paddingTop:18}}>→</div>
              <div style={{flex:1}}>
                <div style={{fontSize:10,color:C.muted,marginBottom:4,fontWeight:600}}>{t("END")}</div>
                <input type="time" value={end} onChange={e=>setEnd(e.target.value)}
                  style={{width:"100%",background:"#ffffff",border:`1px solid ${C.border}`,borderRadius:6,padding:"7px 8px",fontSize:13,fontFamily:"inherit",outline:"none",color:C.text,boxSizing:"border-box"}}/>
              </div>
            </div>
            {selEmp && (()=>{
              const emp=employees.find(e=>e.id===selEmp);
              if(!emp)return null;
              const ps=getShiftPreset(start)!;
              return (
                <div style={{padding:"10px 12px",borderRadius:8,background:`${C.gold}18`,border:`1px solid ${C.gold}40`}}>
                  <div style={{fontSize:10,fontWeight:700,color:C.gold,marginBottom:3}}>{t("PREVIEW")}</div>
                  <div style={{fontSize:13,fontWeight:700,color:C.text}}>{emp.name.split(" ")[0]} · {start}–{end} ({t(ps.label)})</div>
                </div>
              );
            })()}
          </div>
        </div>

        <div style={{padding:"12px 16px",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"flex-end",gap:8,background:C.surface,flexShrink:0}}>
          <button onClick={onClose} style={{padding:"8px 16px",borderRadius:7,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{t("Cancel")}</button>
          <button disabled={!selEmp} onClick={()=>{if(selEmp){onAdd(selEmp,start,end);onClose();}}}
            style={{padding:"8px 20px",borderRadius:7,border:"none",background:selEmp?C.gold:C.border,color:selEmp?"#000":C.muted,fontWeight:800,fontSize:13,cursor:selEmp?"pointer":"not-allowed",fontFamily:"inherit",transition:"all .15s"}}>
            {selEmp?t("✓ Confirm shift"):t("Select an employee")}
          </button>
        </div>
      </div>
    </>, document.body
  );
}
