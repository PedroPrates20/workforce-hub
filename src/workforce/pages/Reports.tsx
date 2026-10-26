import { useState } from 'react';
import { Clock, MapPin, FileBadge, TriangleAlert, ArrowLeftRight } from 'lucide-react';
import { Card } from '../components/Card';
import { C } from '../constants';
import { useI18n } from '../context/AppContext';
import { ReportPreviewModal, type ReportKey } from '../components/ReportPreviewModal';

export function Reports() {
  const {t}=useI18n();
  const [activeReport,setActiveReport]=useState<ReportKey|null>(null);
  const reports = [
    {title:"Hours per Employee",desc:"Employee hours and configured limits for review",icon:Clock},
    {title:"Site Coverage",desc:"Post occupancy rate per site",icon:MapPin},
    {title:"Visa Compliance",desc:"Stamp 2 / Stamp 4 — limits and alerts",icon:FileBadge},
    {title:"Monthly Incidents",desc:"Incidents by severity and location",icon:TriangleAlert},
    {title:"Expiring Certificates",desc:"Staff members with critical documents expiring",icon:FileBadge},
    {title:"Swap Requests",desc:"Approval rates and common reasons",icon:ArrowLeftRight},
  ] as const;
  return (
    <div className="workforce-page" style={{padding:24}}>
      {activeReport && <ReportPreviewModal report={activeReport} onClose={()=>setActiveReport(null)}/>}
      <div style={{fontSize:20,fontWeight:800,color:C.text,marginBottom:4}}>{t("Reports")}</div>
      <div style={{fontSize:12,color:C.muted,marginBottom:20}}>{t("Operational and compliance summaries for Ireland")}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12,marginBottom:24}}>
        {reports.map(r=>(
          <Card key={r.title} style={{cursor:"pointer",transition:"border-color .15s"}} >
            <div style={{marginBottom:10,color:C.gold}}><r.icon size={26}/></div>
            <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:4}}>{t(r.title)}</div>
            <div style={{fontSize:12,color:C.muted,marginBottom:12}}>{t(r.desc)}</div>
            <button onClick={()=>setActiveReport(r.title)} aria-haspopup="dialog" style={{width:"100%",padding:"8px",borderRadius:6,border:`1px solid ${C.gold}`,background:`${C.gold}15`,color:C.gold,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              {t("Generate Report →")}
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}
