import { useApp, useI18n } from '../context/AppContext';
import { DOW, MONTHS, localeOf } from '../i18n';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card } from '../components/Card';
import { Stat } from '../components/Stat';
import { Badge } from '../components/Badge';
import { C, PROFILES, SHIFT_PRESETS, fmt, initials, roleColor, stampColor } from '../constants';

export function Dashboard() {
  const {user,employees,sites,swaps,roster} = useApp();
  const {lang,t} = useI18n();
  const isMobile = useIsMobile();
  const emp = employees.find(e=>e.id===user.id);
  if (!emp) return null;
  const siteObj = sites.find(s=>s.id===emp.site);
  const showManagementStats = user.role === 'hr' || user.role === 'director';
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const weekStart = new Date(todayDate);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const dashboardDays = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return date;
  });
  const today = fmt(todayDate);
  const hoursLeft = emp.hoursLimit - emp.hoursUsed;
  const hoursWarn = emp.stamp==="Stamp 2" && emp.hoursUsed >= 70;
  const weeks = [dashboardDays.slice(0, 7), dashboardDays.slice(7, 14)];
  const shiftsForDay = (date: Date) => Object.entries(roster[fmt(date)] ?? {}).flatMap(([siteId, slots]) =>
    slots.filter(slot => slot.empId === emp.id).map(slot => ({ ...slot, siteId })),
  );
  const shiftHours = (start: string, end: string) => {
    const [startHour, startMinute] = start.split(':').map(Number);
    const [endHour, endMinute] = end.split(':').map(Number);
    let minutes = endHour! * 60 + endMinute! - (startHour! * 60 + startMinute!);
    if (minutes <= 0) minutes += 24 * 60;
    return minutes / 60;
  };
  const hoursForDays = (days: Date[]) => days.reduce((total, date) =>
    total + shiftsForDay(date).reduce((sum, shift) => sum + shiftHours(shift.start, shift.end), 0), 0,
  );
  const formatHours = (hours: number) => `${new Intl.NumberFormat(localeOf(lang), { maximumFractionDigits: 1 }).format(hours)}h`;

  return (
    <div className="workforce-page" style={{padding:24}}>
      <div style={{background:`#ffffff`,border:`1px solid ${C.gold}40`,borderRadius:12,borderLeft:`4px solid ${C.gold}`,padding:"24px 28px",marginBottom:20,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-20,right:-20,width:160,height:160,borderRadius:"50%",background:`${C.gold}10`}}/>
        <div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:2,marginBottom:6}}>{t("WORKFORCE HUB — CONTROL PANEL")}</div>
        <div style={{fontSize:22,fontWeight:800,color:C.text,marginBottom:4}}>{t("Welcome back,")} {user.name.split(" ")[0]}</div>
        <div style={{fontSize:13,color:C.muted}}>{t(PROFILES[user.role].title)} · {siteObj?.name}</div>
      </div>

      {showManagementStats && <div style={{display:"flex",gap:12,marginBottom:24,flexWrap:"wrap"}}>
        <Stat label={t("Active Sites")}          value={sites.filter(s=>s.active).length}        sub={t("operational locations")} />
        <Stat label={t("Today's Shifts")}        value={7}                                              sub={t("currently in progress")} accent={C.green} />
        <Stat label={t("Available Team")}        value={employees.filter(e=>e.active).length}     sub={t("active staff")}          accent={C.blue} />
        <Stat label={t("Pending Approvals")}     value={swaps.filter(s=>s.status==="pending").length} sub={t("awaiting requests")}    accent={C.red} />
      </div>}

      {hoursWarn && (
        <div style={{background:"#7f1d1d20",border:"1px solid #ef444440",borderRadius:8,padding:"12px 16px",marginBottom:20,display:"flex",gap:10,alignItems:"center"}}>
          <span style={{fontSize:20}}></span>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:"#fca5a5"}}>{t("Hour limit warning — Stamp 2")}</div>
            <div style={{fontSize:12,color:C.muted}}>{emp.hoursUsed}h {t("used out of")} {emp.hoursLimit}h {t("allowed this month")}</div>
          </div>
        </div>
      )}

      <div className="workforce-stack" style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 320px",gap:20,alignItems:"start"}}>
        <div style={{minWidth:0}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap',marginBottom:12}}>
            <div style={{fontSize:14,fontWeight:700,color:C.text}}>{t("My Schedule — Next 14 Days")}</div>
            <div style={{padding:'6px 10px',borderRadius:8,background:`${C.gold}14`,border:`1px solid ${C.gold}45`,color:C.gold,fontSize:12,fontWeight:800}}>{t('Two-week total')}: {formatHours(hoursForDays(dashboardDays))}</div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {weeks.map((week, weekIndex)=><section key={weekIndex} style={{border:`1px solid ${C.border}`,borderRadius:10,overflow:'hidden',background:C.card}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,padding:'9px 12px',background:C.surface,borderBottom:`1px solid ${C.border}`}}>
                <strong style={{fontSize:12,color:C.text}}>{t('Week {n}',{n:weekIndex+1})}</strong>
                <span style={{fontSize:11,fontWeight:800,color:C.gold}}>{t('Week total')}: {formatHours(hoursForDays(week))}</span>
              </div>
              {isMobile ? <div style={{display:'flex',flexDirection:'column'}}>{week.map(date=>{
                const key=fmt(date), isToday=key===today, dayShifts=shiftsForDay(date);
                return <div key={key} aria-current={isToday?'date':undefined} style={{display:'flex',gap:9,padding:9,borderBottom:`1px solid ${C.border}`,background:isToday?`${C.gold}20`:[0,6].includes(date.getDay())?'#fffaf4':C.card,boxShadow:isToday?`inset 4px 0 ${C.gold}`:undefined}}>
                  <div style={{width:39,flexShrink:0,textAlign:'center'}}><div style={{fontSize:9,fontWeight:800,color:isToday?C.gold:[0,6].includes(date.getDay())?'#b45309':C.muted,textTransform:'uppercase'}}>{DOW[lang][date.getDay()]}</div><div style={{fontSize:18,fontWeight:900,color:isToday?C.gold:C.text}}>{date.getDate()}</div><div style={{fontSize:9,color:C.muted}}>{MONTHS[lang][date.getMonth()]}</div>{isToday&&<div style={{fontSize:8,fontWeight:900,color:C.gold}}>{t('Today')}</div>}</div>
                  <div style={{flex:1,minWidth:0}}>{dayShifts.length===0?<div style={{fontSize:11,color:C.muted,fontStyle:'italic',paddingTop:9}}>{t('Day Off')}</div>:dayShifts.map((shift,index)=>{const preset=SHIFT_PRESETS.find(item=>item.start===shift.start);return <div key={`${shift.siteId}-${shift.start}-${index}`} style={{padding:'6px 8px',marginBottom:5,borderRadius:6,borderLeft:`3px solid ${preset?.color??C.gold}`,background:`${preset?.bg??C.surface}55`}}><div style={{fontSize:11,fontWeight:800,color:C.text}}>{shift.start}–{shift.end}</div><div style={{fontSize:10,color:C.muted,marginTop:2}}>{sites.find(site=>site.id===shift.siteId)?.name??shift.siteId}</div></div>;})}</div>
                  {dayShifts.length>0&&<div style={{alignSelf:'center',fontSize:10,fontWeight:800,color:C.gold,whiteSpace:'nowrap'}}>{formatHours(dayShifts.reduce((sum,shift)=>sum+shiftHours(shift.start,shift.end),0))}</div>}
                </div>;
              })}</div> : <div style={{display:'grid',gridTemplateColumns:'repeat(7,minmax(0,1fr))'}}>{week.map(date=>{
                const key=fmt(date), isToday=key===today, dayShifts=shiftsForDay(date);
                return <div key={key} aria-current={isToday?'date':undefined} style={{minWidth:0,minHeight:145,padding:7,borderRight:`1px solid ${C.border}`,background:isToday?`${C.gold}20`:[0,6].includes(date.getDay())?'#fffaf4':C.card,boxShadow:isToday?`inset 0 4px ${C.gold}`:undefined}}>
                  <div style={{display:'flex',alignItems:'center',gap:4,flexWrap:'wrap',marginBottom:5}}><span style={{fontSize:9,fontWeight:800,color:isToday?C.gold:[0,6].includes(date.getDay())?'#b45309':C.muted,textTransform:'uppercase'}}>{DOW[lang][date.getDay()]}</span>{isToday&&<span style={{fontSize:8,fontWeight:900,color:C.gold}}>{t('Today')}</span>}</div>
                  <div style={{fontSize:17,lineHeight:'19px',fontWeight:900,color:isToday?C.gold:C.text}}>{date.getDate()}</div><div style={{fontSize:9,color:C.muted,marginBottom:7}}>{MONTHS[lang][date.getMonth()]}</div>
                  {dayShifts.length===0?<div style={{minHeight:63,display:'grid',placeItems:'center',fontSize:9,color:C.muted,fontStyle:'italic',textAlign:'center'}}>{t('Day Off')}</div>:dayShifts.map((shift,index)=>{const preset=SHIFT_PRESETS.find(item=>item.start===shift.start);return <div key={`${shift.siteId}-${shift.start}-${index}`} style={{padding:'5px 5px',marginBottom:5,borderRadius:5,borderLeft:`3px solid ${preset?.color??C.gold}`,background:`${preset?.bg??C.surface}55`}}><div style={{fontSize:9,fontWeight:800,color:C.text,whiteSpace:'nowrap'}}>{shift.start}–{shift.end}</div><div style={{fontSize:8,color:C.muted,marginTop:2,overflowWrap:'anywhere'}}>{sites.find(site=>site.id===shift.siteId)?.name??shift.siteId}</div></div>;})}
                  {dayShifts.length>0&&<div style={{fontSize:9,fontWeight:800,color:C.gold,marginTop:3}}>{formatHours(dayShifts.reduce((sum,shift)=>sum+shiftHours(shift.start,shift.end),0))}</div>}
                </div>;
              })}</div>}
            </section>)}
          </div>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Card>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
              <div style={{width:52,height:52,borderRadius:"50%",background:roleColor(emp.role),display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:800,color:"#fff",flexShrink:0}}>
                {initials(emp.name)}
              </div>
              <div>
                <div style={{fontWeight:800,fontSize:15,color:C.text}}>{emp.name}</div>
                <div style={{fontSize:12,color:C.muted}}>{t(emp.nationality)}</div>
                <Badge label={t(PROFILES[emp.role].label)} color={roleColor(emp.role)}/>
              </div>
            </div>
            {[
              {l:t("Email"),v:emp.email},
              {l:t("Phone"),v:emp.phone},
              {l:t("Site"),v:siteObj?.name||"—"},
            ].map(r=>(
              <div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.border}`,fontSize:12}}>
                <span style={{color:C.muted}}>{r.l}</span>
                <span style={{color:C.text,fontWeight:600,textAlign:"right",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.v}</span>
              </div>
            ))}
            {emp.stamp && (
              <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.border}`,fontSize:12}}>
                <span style={{color:C.muted}}>{t("Visa")}</span>
                <Badge label={emp.stamp} color={stampColor(emp.stamp)}/>
              </div>
            )}
          </Card>

          <Card>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:10}}>{t("HOLIDAY BALANCE")}</div>
            <div style={{fontSize:36,fontWeight:900,color:C.green,lineHeight:1}}>{emp.holidayBalance}<span style={{fontSize:16,fontWeight:400,color:C.muted}}> {t("days")}</span></div>
            <div style={{fontSize:11,color:C.muted,marginTop:4}}>{t("Year 2025")}</div>
          </Card>

          {emp.stamp && (
            <Card>
              <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:10}}>{t("HOURS")} — {emp.stamp}</div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:12,color:C.muted}}>{t("Used")}</span>
                <span style={{fontSize:12,fontWeight:700,color:hoursWarn?C.red:C.text}}>{emp.hoursUsed}h</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                <span style={{fontSize:12,color:C.muted}}>{t("Limit")}</span>
                <span style={{fontSize:12,fontWeight:700,color:C.text}}>{emp.hoursLimit}h</span>
              </div>
              <div style={{height:6,background:C.border,borderRadius:99,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${Math.min(100,(emp.hoursUsed/emp.hoursLimit)*100)}%`,background:hoursWarn?C.red:C.green,borderRadius:99,transition:"width .4s"}}/>
              </div>
              <div style={{fontSize:11,color:C.muted,marginTop:6}}>{hoursLeft}h {t("remaining")}</div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
