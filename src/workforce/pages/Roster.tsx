import { useEffect, useState } from 'react';
import type { RosterStaffFilter } from '../types';
import { useApp, useI18n } from '../context/AppContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { DOW, MONTHS, localeOf } from '../i18n';
import { ShiftModal } from '../components/ShiftModal';
import { EmailPreviewModal } from '../components/EmailPreviewModal';
import { Badge } from '../components/Badge';
import { C, SHIFT_PRESETS, DAYS14, fmt, initials } from '../constants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function getShiftPreset(start:string) {
  return SHIFT_PRESETS.find(s=>s.start===start)||SHIFT_PRESETS[0];
}

export function Roster() {
  const {roster, setRoster, employees, sites, user} = useApp();
  const {lang,t} = useI18n();
  const isMobile = useIsMobile();
  const [activeSite, setActiveSite] = useState("s1");
  const [rosterView, setRosterView] = useState<"sites"|"employees">("sites");
  const [staffFilter, setStaffFilter] = useState<RosterStaffFilter>(user.role==='hr'?'cleaner':'all');
  const [activeEmployee, setActiveEmployee] = useState("");
  const [siteFilter, setSiteFilter] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [modal, setModal] = useState<{siteId:string; dayKey:string}|null>(null);
  const [showEmail,setShowEmail]=useState(false);

  useEffect(()=>{
    if(sites.length>0&&!sites.some(item=>item.id===activeSite))setActiveSite(sites[0].id);
  },[sites,activeSite]);

  const addSlot = (empId:string, start:string, end:string) => {
    if(!modal) return;
    if(!staffMatches(empId))return;
    setRoster(r=>{
      const d={...r[modal.dayKey]||{}};
      const slots=[...(d[modal.siteId]||[])];
      if(slots.length>=7||slots.find(s=>s.empId===empId)) return r;
      slots.push({empId,start,end});
      return {...r,[modal.dayKey]:{...d,[modal.siteId]:slots}};
    });
  };

  const removeSlot = (dayKey:string, siteId:string, empId:string) => {
    setRoster(r=>({...r,[dayKey]:{...r[dayKey]||{},[siteId]:(r[dayKey]?.[siteId]||[]).filter(s=>s.empId!==empId)}}));
  };

  const site = sites.find(s=>s.id===activeSite)??{id:'',name:t('No sites configured'),client:''};
  const filteredSites = sites.filter(s=>s.name.toLowerCase().includes(siteFilter.trim().toLowerCase()));
  const staffMatches=(empId:string)=>{
    const employee=employees.find(item=>item.id===empId);
    return !!employee&&['cleaner','security','supervisor'].includes(employee.role)&&(staffFilter==='all'||employee.role===staffFilter);
  };
  const rosterEmployees=employees.filter(employee=>employee.active&&staffMatches(employee.id));
  const filteredEmployees=rosterEmployees.filter(employee=>employee.name.toLowerCase().includes(employeeFilter.trim().toLowerCase()));
  const slotsFor=(dayKey:string,siteId:string)=>
    (roster[dayKey]?.[siteId]||[]).filter(slot=>staffMatches(slot.empId)&&(rosterView==='sites'||slot.empId===activeEmployee));
  const totalSlots=DAYS14.reduce((sum,date)=>sum+Object.values(roster[fmt(date)]||{}).flat().filter(slot=>staffMatches(slot.empId)).length,0);
  const staffFilterOptions: {value:RosterStaffFilter;label:string}[]=user.role==='hr'
    ?[{value:'cleaner',label:'Cleaners'},{value:'security',label:'Security'}]
    :[{value:'all',label:'All staff'},{value:'cleaner',label:'Cleaners'},{value:'security',label:'Security'}];

  // Keep the existing 15-day data, but present it as clear weekly calendar blocks.
  const weeks = Array.from({length: Math.ceil(DAYS14.length / 7)}, (_, i) =>
    DAYS14.slice(i * 7, i * 7 + 7)
  );

  useEffect(()=>{
    if(rosterEmployees.length>0&&!rosterEmployees.some(employee=>employee.id===activeEmployee))setActiveEmployee(rosterEmployees[0].id);
    if(rosterEmployees.length===0&&activeEmployee)setActiveEmployee('');
  },[rosterEmployees,activeEmployee]);

  const formatWeekRange = (week: Date[]) => {
    const first = week[0];
    if (!first) return "";
    const last = week[week.length - 1];
    if (!last) return "";
    const month = first.toLocaleDateString(localeOf(lang), {month:"long"});
    return `${first.getDate()}–${last.getDate()} ${month} ${first.getFullYear()}`;
  };

  return (
    <div className="workforce-page" style={{padding:24, maxWidth:1500, margin:"0 auto"}}>
      {showEmail && <EmailPreviewModal employeeRoleFilter={staffFilter} onClose={()=>setShowEmail(false)}/>}

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,marginBottom:20,flexWrap:"wrap"}}>
        <div>
          <div style={{fontSize:22,fontWeight:800,color:C.text,letterSpacing:"-0.3px"}}>{t("Shift Roster")}</div>
          <div style={{fontSize:13,color:C.muted,marginTop:4}}>
            {t("Plan and manage employee shifts")} · {totalSlots} {t("shifts assigned")}
          </div>
        </div>

        <button
          onClick={()=>setShowEmail(true)}
          style={{
            background:C.gold,color:"#fff",border:"none",borderRadius:8,
            padding:"10px 18px",fontWeight:700,fontSize:13,cursor:"pointer",
            fontFamily:"inherit",boxShadow:"0 2px 6px rgba(0,0,0,.08)"
          }}
        >
          {t("Send Rosters")}
        </button>
      </div>

      <section aria-label={t('Roster staff group')} style={{padding:14,marginBottom:18,background:C.card,border:`1px solid ${C.border}`,borderRadius:10}}>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
          {([['sites',t("By site")],['employees',t("By employee")]] as const).map(([view,label])=><button key={view} onClick={()=>setRosterView(view)} aria-pressed={rosterView===view} style={{padding:"8px 13px",borderRadius:8,border:`1px solid ${rosterView===view?C.gold:C.border}`,background:rosterView===view?`${C.gold}18`:C.card,color:rosterView===view?C.gold:C.text,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{label}</button>)}
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:rosterView==='employees'?14:0}}>
          {staffFilterOptions.map(option=><button key={option.value} onClick={()=>setStaffFilter(option.value)} aria-pressed={staffFilter===option.value}
            style={{padding:'8px 13px',borderRadius:8,border:`1px solid ${staffFilter===option.value?C.gold:C.border}`,background:staffFilter===option.value?`${C.gold}18`:C.card,color:staffFilter===option.value?C.gold:C.text,fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>{t(option.label)}</button>)}
        </div>
        <div style={{display:'grid',gridTemplateColumns:rosterView==='employees'?'repeat(auto-fit,minmax(min(100%,320px),1fr))':'minmax(0,360px)',gap:14}}>
          <div style={{minWidth:0}}>
            <label style={{display:'block',fontSize:11,fontWeight:700,color:C.muted,marginBottom:6}}>{t('Site')}</label>
            <input value={siteFilter} onChange={e=>setSiteFilter(e.target.value)} placeholder={t("Filter sites...")} aria-label={t("Filter sites...")} style={{width:"100%",height:40,boxSizing:"border-box",padding:"0 12px",marginBottom:8,border:`1px solid ${C.border}`,borderRadius:8,background:C.card,color:C.text,fontSize:13,fontFamily:"inherit",outlineColor:C.gold}} />
            <Select value={activeSite} onValueChange={setActiveSite}>
              <SelectTrigger aria-label={t("Sites")} className="h-10 w-full rounded-lg border-[#e2e6ec] bg-white px-3 text-[13px] text-[#1b2638] shadow-none focus:ring-1 focus:ring-[#e8661c]"><SelectValue>{site.name}</SelectValue></SelectTrigger>
              <SelectContent className="border-[#e2e6ec] bg-white text-[#1b2638]">
                {filteredSites.map(s=>{const count=DAYS14.reduce((total,date)=>total+(roster[fmt(date)]?.[s.id]||[]).filter(slot=>staffMatches(slot.empId)).length,0);return <SelectItem key={s.id} value={s.id} className="text-[13px] focus:bg-[#f4f6f9] focus:text-[#1b2638]">{s.name}{count>0?` (${count})`:""}</SelectItem>;})}
                {filteredSites.length===0&&<SelectItem value="__no_sites" disabled className="text-[13px] text-[#5d6b80]">{t("No sites found")}</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          {rosterView==='employees'&&<div style={{minWidth:0}}>
            <label style={{display:'block',fontSize:11,fontWeight:700,color:C.muted,marginBottom:6}}>{t('Employee')}</label>
            <input value={employeeFilter} onChange={e=>setEmployeeFilter(e.target.value)} placeholder={t("Filter employees...")} aria-label={t("Filter employees...")} style={{width:"100%",height:40,boxSizing:"border-box",padding:"0 12px",marginBottom:8,border:`1px solid ${C.border}`,borderRadius:8,background:C.card,color:C.text,fontSize:13,fontFamily:"inherit",outlineColor:C.gold}} />
            <Select value={activeEmployee} onValueChange={setActiveEmployee}>
              <SelectTrigger aria-label={t("Employees")} className="h-10 w-full rounded-lg border-[#e2e6ec] bg-white px-3 text-[13px] text-[#1b2638] shadow-none focus:ring-1 focus:ring-[#e8661c]"><SelectValue>{employees.find(e=>e.id===activeEmployee)?.name||""}</SelectValue></SelectTrigger>
              <SelectContent className="border-[#e2e6ec] bg-white text-[#1b2638]">{filteredEmployees.map(e=><SelectItem key={e.id} value={e.id} className="text-[13px] focus:bg-[#f4f6f9] focus:text-[#1b2638]">{e.name}</SelectItem>)}{filteredEmployees.length===0&&<SelectItem value="__no_employees" disabled className="text-[13px] text-[#5d6b80]">{t("No employees found")}</SelectItem>}</SelectContent>
            </Select>
          </div>}
        </div>
      </section>

      {/* Current site */}
      <div style={{
        display:"flex",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:12,
        padding:"12px 14px",background:C.card,border:`1px solid ${C.border}`,
        borderRadius:10
      }}>
        <div style={{width:4,height:28,background:C.gold,borderRadius:99}}/>
        <div>
          <div style={{fontWeight:800,fontSize:15,color:C.text}}>{site.name}</div>
          <div style={{fontSize:11,color:C.muted,marginTop:2}}>{site.client}</div>
        </div>
        <div style={{fontSize:11,color:C.muted,marginLeft:"auto",textAlign:"right"}}>
          {t("Select a day to add a shift · Maximum 7 shifts per day")}
        </div>
      </div>

      {/* Calendar */}
      {isMobile ? (
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,padding:"0 2px"}}>
                <div style={{fontSize:12,fontWeight:800,color:C.text,textTransform:"uppercase",letterSpacing:"0.5px"}}>{t("Week {n}",{n:weekIndex+1})}</div>
                <div style={{fontSize:12,color:C.muted}}>{formatWeekRange(week)}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {week.map(d=>{
                  const dk=fmt(d);
                  const slots=slotsFor(dk,activeSite);
                  const we=[0,6].includes(d.getDay());
                  return (
                    <div key={dk} style={{background:we?"#fffaf4":C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",display:"flex",gap:12,alignItems:"flex-start"}}>
                      <div style={{width:44,textAlign:"center",flexShrink:0}}>
                        <div style={{fontSize:10,fontWeight:800,color:we?"#c46b00":C.muted,textTransform:"uppercase"}}>{DOW[lang][d.getDay()]}</div>
                        <div style={{fontSize:20,fontWeight:800,color:we?"#c46b00":C.text}}>{d.getDate()}</div>
                        <div style={{fontSize:9,color:C.muted}}>{MONTHS[lang][d.getMonth()]}</div>
                      </div>
                      <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:6}}>
                        {slots.length===0 && <div style={{fontSize:12,fontStyle:"italic",color:C.muted,paddingTop:2}}>{t("Day off")}</div>}
                        {slots.map(sl=>{
                          const emp=employees.find(e=>e.id===sl.empId);
                          const ps=getShiftPreset(sl.start)!;
                          return emp ? (
                            <div key={sl.empId} style={{display:"flex",alignItems:"center",gap:8,border:`1px solid ${ps.color}45`,borderLeft:`4px solid ${ps.color}`,borderRadius:8,background:ps.bg+"16",padding:"6px 8px"}}>
                              <div style={{width:26,height:26,borderRadius:"50%",background:ps.color,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,flexShrink:0}}>{initials(emp.name)}</div>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:13,fontWeight:800,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.name}</div>
                                <div style={{fontSize:11,color:C.muted}}>{t(ps.label)} · {sl.start}–{sl.end}</div>
                              </div>
                              <button onClick={()=>removeSlot(dk,activeSite,sl.empId)} aria-label={t("Remove {name}",{name:emp.name})} title={t("Remove shift")}
                                style={{width:34,height:34,background:"none",border:`1px solid ${C.border}`,borderRadius:8,cursor:"pointer",color:C.muted,fontSize:18,lineHeight:1,fontFamily:"inherit",flexShrink:0}}>×</button>
                            </div>
                          ) : null;
                        })}
                        {(roster[dk]?.[activeSite]||[]).length<7 && (
                          <button onClick={()=>setModal({siteId:activeSite,dayKey:dk})}
                            style={{width:"100%",minHeight:38,border:`1px dashed ${C.border}`,borderRadius:8,background:"transparent",color:C.muted,cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"inherit"}}>
                            {t("+ Add shift")}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
      <div style={{display:"flex",flexDirection:"column",gap:18}}>
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex}>
            <div style={{
              display:"flex",justifyContent:"space-between",alignItems:"center",
              marginBottom:8,padding:"0 2px"
            }}>
              <div style={{fontSize:12,fontWeight:800,color:C.text,textTransform:"uppercase",letterSpacing:"0.5px"}}>
                {t("Week {n}",{n:weekIndex+1})}
              </div>
              <div style={{fontSize:12,color:C.muted}}>{formatWeekRange(week)}</div>
            </div>

            <div style={{
              overflowX:"auto",border:`1px solid ${C.border}`,
              borderRadius:12,background:C.card
            }}>
              <table style={{
                borderCollapse:"separate",borderSpacing:0,
                width:"100%",minWidth:900,tableLayout:"fixed"
              }}>
                <thead>
                  <tr>
                    {week.map(d=>{
                      const we=[0,6].includes(d.getDay());
                      const dk=fmt(d);
                      const count=slotsFor(dk,activeSite).length;
                      return (
                        <th key={dk} style={{
                          padding:"12px 10px",textAlign:"left",
                          background:we?"#fff8ef":C.surface,
                          borderBottom:`1px solid ${C.border}`,
                          borderRight:`1px solid ${C.border}`,
                          verticalAlign:"top"
                        }}>
                          <div style={{
                            fontSize:10,fontWeight:800,
                            color:we?"#c46b00":C.muted,
                            textTransform:"uppercase",letterSpacing:"0.5px"
                          }}>
                            {DOW[lang][d.getDay()]}
                          </div>
                          <div style={{display:"flex",alignItems:"baseline",gap:5,marginTop:2}}>
                            <span style={{fontSize:20,fontWeight:800,color:we?"#c46b00":C.text}}>
                              {d.getDate()}
                            </span>
                            <span style={{fontSize:10,color:C.muted}}>
                              {MONTHS[lang][d.getMonth()]}
                            </span>
                          </div>
                          {count > 0 && (
                            <div style={{fontSize:9,color:C.gold,fontWeight:700,marginTop:3}}>
                              {t("{n} assigned",{n:count})}
                            </div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    {week.map(d=>{
                      const dk=fmt(d);
                      const slots=slotsFor(dk,activeSite);
                      const we=[0,6].includes(d.getDay());

                      return (
                        <td key={dk} style={{
                          padding:"10px",verticalAlign:"top",
                          background:we?"#fffaf4":C.card,
                          borderRight:`1px solid ${C.border}`,
                          minHeight:145,height:150
                        }}>
                          {slots.length === 0 ? (
                            <div style={{
                              minHeight:128,display:"flex",
                              flexDirection:"column",justifyContent:"center",
                              alignItems:"center",gap:10
                            }}>
                              <div style={{
                                fontSize:12,fontStyle:"italic",
                                color:we?"#a56a24":C.muted
                              }}>
                                {t("Day off")}
                              </div>

                              <button
                                onClick={()=>setModal({siteId:activeSite,dayKey:dk})}
                                style={{
                                  border:`1px dashed ${C.border}`,borderRadius:7,
                                  padding:"7px 12px",background:"transparent",
                                  color:C.muted,cursor:"pointer",
                                  fontSize:11,fontWeight:600,fontFamily:"inherit"
                                }}
                                onMouseEnter={e=>{
                                  (e.currentTarget as HTMLButtonElement).style.borderColor=C.gold;
                                  (e.currentTarget as HTMLButtonElement).style.color=C.gold;
                                  (e.currentTarget as HTMLButtonElement).style.background=`${C.gold}10`;
                                }}
                                onMouseLeave={e=>{
                                  (e.currentTarget as HTMLButtonElement).style.borderColor=C.border;
                                  (e.currentTarget as HTMLButtonElement).style.color=C.muted;
                                  (e.currentTarget as HTMLButtonElement).style.background="transparent";
                                }}
                              >
                                {t("+ Add shift")}
                              </button>
                            </div>
                          ) : (
                            <div style={{display:"flex",flexDirection:"column",gap:7}}>
                              {slots.map(sl=>{
                                const emp=employees.find(e=>e.id===sl.empId);
                                const ps=getShiftPreset(sl.start)!;

                                return emp ? (
                                  <div key={sl.empId} style={{
                                    border:`1px solid ${ps.color}45`,
                                    borderLeft:`4px solid ${ps.color}`,
                                    borderRadius:8,background:ps.bg+"16",
                                    padding:"9px 9px 8px"
                                  }}>
                                    <div style={{
                                      display:"flex",alignItems:"center",gap:7,
                                      marginBottom:6
                                    }}>
                                      <div style={{
                                        width:25,height:25,borderRadius:"50%",
                                        background:ps.color,color:"#fff",
                                        display:"flex",alignItems:"center",
                                        justifyContent:"center",
                                        fontSize:9,fontWeight:800,flexShrink:0
                                      }}>
                                        {initials(emp.name)}
                                      </div>

                                      <div style={{
                                        minWidth:0,flex:1,fontSize:11,
                                        fontWeight:800,color:C.text,
                                        overflow:"hidden",textOverflow:"ellipsis",
                                        whiteSpace:"nowrap"
                                      }}>
                                        {emp.name}
                                      </div>

                                      <button
                                        onClick={()=>removeSlot(dk,activeSite,sl.empId)}
                                        aria-label={t("Remove {name}",{name:emp.name})}
                                        title={t("Remove shift")}
                                        style={{
                                          background:"none",border:"none",
                                          cursor:"pointer",color:C.muted,
                                          fontSize:16,padding:"0 2px",lineHeight:1
                                        }}
                                      >
                                        ×
                                      </button>
                                    </div>

                                    <div style={{
                                      fontSize:12,fontWeight:800,
                                      color:ps.color,marginBottom:5
                                    }}>
                                      {sl.start} – {sl.end}
                                    </div>

                                    <Badge label={t(ps.label)} color={ps.color}/>
                                  </div>
                                ) : null;
                              })}

                              {(roster[dk]?.[activeSite]||[]).length<7 && (
                                <button
                                  onClick={()=>setModal({siteId:activeSite,dayKey:dk})}
                                  style={{
                                    width:"100%",border:`1px dashed ${C.border}`,
                                    borderRadius:7,padding:"7px 0",
                                    background:"transparent",color:C.muted,
                                    cursor:"pointer",fontSize:11,fontWeight:600,
                                    fontFamily:"inherit"
                                  }}
                                  onMouseEnter={e=>{
                                    (e.currentTarget as HTMLButtonElement).style.borderColor=C.gold;
                                    (e.currentTarget as HTMLButtonElement).style.color=C.gold;
                                  }}
                                  onMouseLeave={e=>{
                                    (e.currentTarget as HTMLButtonElement).style.borderColor=C.border;
                                    (e.currentTarget as HTMLButtonElement).style.color=C.muted;
                                  }}
                                >
                                  {t("+ Add shift")}
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Legend */}
      <div style={{display:"flex",gap:18,marginTop:14,flexWrap:"wrap",padding:"10px 2px"}}>
        {SHIFT_PRESETS.map(ps=>(
          <div key={ps.label} style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:10,height:10,borderRadius:3,background:ps.color}}/>
            <span style={{fontSize:11,color:C.muted,fontWeight:500}}>
              {t(ps.label)} · {ps.start}
            </span>
          </div>
        ))}
      </div>

      {modal && (
        <ShiftModal
          siteId={modal.siteId}
          siteName={sites.find(s=>s.id===modal.siteId)?.name||""}
          dayLabel={`${DOW[lang][DAYS14.find(d=>fmt(d)===modal.dayKey)?.getDay()||0]}, ${DAYS14.find(d=>fmt(d)===modal.dayKey)?.getDate()} ${MONTHS[lang][DAYS14.find(d=>fmt(d)===modal.dayKey)?.getMonth()||0]}`}
          assigned={(roster[modal.dayKey]?.[modal.siteId]||[]).map(s=>s.empId)}
          staffFilter={staffFilter}
          fixedEmployeeId={rosterView==='employees'?activeEmployee:undefined}
          onAdd={addSlot}
          onClose={()=>setModal(null)}
        />
      )}
    </div>
  );
}
