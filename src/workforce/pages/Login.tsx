import type { User, Lang, Employee } from '../types';
import { makeT } from '../i18n';
import { C, PROFILES, roleColor } from '../constants';
import { BrandLogo } from '../components/BrandLogo';

export function Login({employees,onLogin,lang,setLang}:{employees:Employee[]; onLogin:(u:User)=>void; lang:Lang; setLang:(l:Lang)=>void}) {
  const t=makeT(lang);
  const demoMode = import.meta.env.DEV;

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
            {demoMode?t("Demo profiles are available only in local development. Production access requires server-side authentication."):t("Server-side authentication has not been configured. Employee data and app features are disabled until a secure identity provider is connected.")}
          </div>
          {demoMode&&<>
            <div style={{fontSize:11,color:C.muted,marginBottom:10,fontWeight:700}}>{t("DEVELOPMENT DEMO PROFILES")}</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {employees.filter(e=>["e9","e1","e5","e6","e2"].includes(e.id)).map(e=>(
                <button key={e.id} onClick={()=>onLogin(e)}
                  style={{padding:"7px 11px",borderRadius:6,border:`1px solid ${roleColor(e.role)}40`,background:`${roleColor(e.role)}15`,color:roleColor(e.role),fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                  {t(PROFILES[e.role].label)}
                </button>
              ))}
            </div>
          </>}
        </div>
      </div>
    </div>
  );
}
