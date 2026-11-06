import type { User, Lang, Employee } from '../types';
import { makeT } from '../i18n';
import { C, DEMO_MODE, PROFILES, roleColor } from '../constants';
import { BrandLogo } from '../components/BrandLogo';

export function Login({employees,onLogin,lang,setLang}:{employees:Employee[]; onLogin:(u:User)=>void; lang:Lang; setLang:(l:Lang)=>void}) {
  const t=makeT(lang);
  const demoMode = DEMO_MODE;
  const demoAdmin:User={id:'demo-admin',name:'Demo Administrator',role:'admin',title:PROFILES.admin.title,email:'administrator@example.com',stamp:null,hoursUsed:0,hoursLimit:0,holidayBalance:0,holidayEntitlement:0,site:employees.find(employee=>employee.active)?.site??''};
  const demoAccounts:User[]=[
    ...employees.filter(employee=>['e2','e6','e1','e5','e9'].includes(employee.id)),
    demoAdmin,
  ];
  const hierarchy:{label:string;details?:string[];role:User['role']}[]=[
    {label:'Employee',details:['Cleaner','Security'],role:'cleaner'},
    {label:'Supervisor',role:'supervisor'},
    {label:'HR',role:'hr'},
    {label:'Director',role:'director'},
    {label:'Administrator',role:'admin'},
  ];

  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:16,boxSizing:"border-box",fontFamily:"inherit"}}>
      <div style={{width:"min(440px,100%)",background:C.card,border:`1px solid ${C.border}`,borderRadius:16,overflow:"hidden",boxShadow:"0 24px 64px #000a"}}>
        <div style={{background:"#1b2638",padding:"14px 24px",display:"flex",alignItems:"center",gap:10}}>
          <BrandLogo />
          <div style={{fontWeight:700,fontSize:14,color:"#fff",flex:1,minWidth:0}}>{t("Operational Management System")}</div>
          <div style={{display:"flex",gap:4,flexShrink:0}}>
            {(["pt","en","ru","ro"] as Lang[]).map(l=>(
              <button key={l} onClick={()=>setLang(l)} aria-pressed={l===lang}
                style={{padding:"4px 9px",borderRadius:6,border:`1px solid ${l===lang?C.gold:"#ffffff55"}`,background:l===lang?C.gold:"transparent",color:"#fff",fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div style={{padding:"clamp(18px,5vw,32px)"}}>
          <div style={{fontSize:22,fontWeight:800,color:C.text,marginBottom:8}}>{demoMode?t("Development preview"):t("Secure sign-in unavailable")}</div>
          <div role="status" style={{fontSize:13,color:C.muted,lineHeight:1.55,marginBottom:demoMode?16:0}}>
            {demoMode?t("Public demo uses fictional data. Changes are saved only in this browser. Do not enter real employee information."):t("Server-side authentication has not been configured. Employee data and app features are disabled until a secure identity provider is connected.")}
          </div>
          {demoMode&&<>
            <div style={{fontSize:11,color:C.muted,marginBottom:8,fontWeight:800}}>{t("ACCESS HIERARCHY")}</div>
            <div aria-label={t("Access levels")} style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:5,marginBottom:16}}>
              {hierarchy.map((level,index)=><span key={level.role} style={{display:'inline-flex',alignItems:'center',gap:5}}>
                <span style={{padding:'4px 7px',borderRadius:99,border:`1px solid ${roleColor(level.role)}45`,background:`${roleColor(level.role)}12`,color:roleColor(level.role),fontSize:10,fontWeight:800}}>{t(level.label)}{level.details&&<span style={{fontWeight:500,opacity:.8}}> · {level.details.map(t).join(' · ')}</span>}</span>
                {index<hierarchy.length-1&&<span aria-hidden="true" style={{fontSize:11,color:C.muted}}>›</span>}
              </span>)}
            </div>
            <div style={{fontSize:11,color:C.muted,marginBottom:9,fontWeight:700}}>{t("DEVELOPMENT DEMO PROFILES")}</div>
            <div style={{display:"grid",gridTemplateColumns:'repeat(auto-fit,minmax(145px,1fr))',gap:8}}>
              {demoAccounts.map(account=>(
                <button key={account.id} onClick={()=>onLogin(account)}
                  style={{display:'flex',flexDirection:'column',alignItems:'flex-start',gap:3,padding:"10px 12px",borderRadius:8,border:`1px solid ${roleColor(account.role)}40`,background:`${roleColor(account.role)}0D`,color:C.text,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",textAlign:'left'}}>
                  <span>{account.name}</span>
                  <span style={{color:roleColor(account.role),fontSize:10}}>{t(PROFILES[account.role].label)} · {t(PROFILES[account.role].title)}</span>
                </button>
              ))}
            </div>
            <div style={{fontSize:10,color:C.muted,lineHeight:1.45,marginTop:12}}>{t("Demo role shortcuts only. Secure individual accounts require an authentication provider.")}</div>
          </>}
        </div>
      </div>
    </div>
  );
}
