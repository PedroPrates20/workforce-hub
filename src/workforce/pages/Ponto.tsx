import { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { C } from '../constants';
import { useApp, useI18n } from '../context/AppContext';
import { localeOf } from '../i18n';

type AttendanceEntry = { type: 'Clock In' | 'Clock Out' | 'Break'; at: string; siteId: string; locationVerified: boolean };

const distanceInMeters = (lat1:number,lon1:number,lat2:number,lon2:number) => {
  const radians=(degrees:number)=>degrees*Math.PI/180;
  const earthRadius=6_371_000;
  const dLat=radians(lat2-lat1);
  const dLon=radians(lon2-lon1);
  const a=Math.sin(dLat/2)**2+Math.cos(radians(lat1))*Math.cos(radians(lat2))*Math.sin(dLon/2)**2;
  return earthRadius*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
};

export function Ponto() {
  const {lang,t}=useI18n();
  const {user,sites,setTab}=useApp();
  const canConfigureSites=user.role==='hr'||user.role==='director';
  const storageKey=`epm_attendance_${user.id}`;
  const [now,setNow]=useState(()=>new Date());
  const [log,setLog]=useState<AttendanceEntry[]>(()=>{
    try {
      const stored=localStorage.getItem(storageKey);
      if(!stored)return [];
      const parsed:unknown=JSON.parse(stored);
      return Array.isArray(parsed)?parsed.filter((entry):entry is AttendanceEntry=>entry&&['Clock In','Clock Out','Break'].includes(entry.type)&&typeof entry.at==='string'&&typeof entry.siteId==='string'):[];
    } catch { return []; }
  });
  const [checkingLocation,setCheckingLocation]=useState(false);
  const [locationMessage,setLocationMessage]=useState("");
  const lastPunch=log.find(entry=>entry.type==='Clock In'||entry.type==='Clock Out');
  const clocked=lastPunch?.type==='Clock In';
  const activeSite=clocked?sites.find(site=>site.id===lastPunch?.siteId):undefined;
  const todayLog=log.filter(entry=>new Date(entry.at).toLocaleDateString('en-IE',{timeZone:'Europe/Dublin'})===now.toLocaleDateString('en-IE',{timeZone:'Europe/Dublin'}));

  useEffect(()=>{
    const timer=window.setInterval(()=>setNow(new Date()),15_000);
    return ()=>window.clearInterval(timer);
  },[]);

  useEffect(()=>{
    try { localStorage.setItem(storageKey,JSON.stringify(log)); } catch { /* local attendance history is optional */ }
  },[log,storageKey]);

  const punchWithLocation=(type:'Clock In'|'Clock Out')=>{
    setLocationMessage("");
    if(checkingLocation)return;
    const configuredSites=sites.filter(site=>site.active&&Number.isFinite(site.latitude)&&Number.isFinite(site.longitude));
    if(configuredSites.length===0){setLocationMessage(t('No site geofences are configured. Ask an administrator to configure site locations.'));return;}
    if(!navigator.geolocation){setLocationMessage(t('This browser does not support location.'));return;}

    setCheckingLocation(true);
    navigator.geolocation.getCurrentPosition(position=>{
      const {latitude,longitude,accuracy}=position.coords;
      if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||!Number.isFinite(accuracy)){
        setCheckingLocation(false);
        setLocationMessage(t('Unable to get this device\'s location.'));
        return;
      }
      const nearest=configuredSites.map(site=>({site,distance:distanceInMeters(latitude,longitude,site.latitude!,site.longitude!)})).sort((a,b)=>a.distance-b.distance)[0];
      setCheckingLocation(false);
      if(!nearest){setLocationMessage(t('No site geofences are configured. Ask an administrator to configure site locations.'));return;}
      const radius=nearest.site.geofenceRadius??100;
      if(accuracy>radius){setLocationMessage(t('Location accuracy is too low. Enable precise location and try again.'));return;}
      if(nearest.distance>radius){setLocationMessage(t('You are outside the clocking area for the nearest site: {site}.',{site:nearest.site.name}));return;}
      setLog(entries=>[{type,at:new Date().toISOString(),siteId:nearest.site.id,locationVerified:true},...entries]);
      setNow(new Date());
    },error=>{
      setCheckingLocation(false);
      setLocationMessage(error.code===1?t('Location permission was denied.'):error.code===3?t('Location request timed out. Try again.'):t('Unable to get this device\'s location.'));
    },{enableHighAccuracy:true,timeout:15_000,maximumAge:0});
  };

  const logBreak=()=>{
    if(!clocked||!lastPunch)return;
    setLog(entries=>[{type:'Break',at:new Date().toISOString(),siteId:lastPunch.siteId,locationVerified:false},...entries]);
  };

  return (
    <div className="workforce-page" style={{padding:24}}>
      <div style={{fontSize:20,fontWeight:800,color:C.text,marginBottom:4}}>{t("Clock In / Out")}</div>
      <div style={{fontSize:12,color:C.muted,marginBottom:20}}>{t("Real-time attendance tracking")}</div>
      <div className="workforce-stack" style={{display:"grid",gridTemplateColumns:"320px 1fr",gap:20}}>
        <Card style={{textAlign:"center"}}>
          <div style={{fontSize:11,color:C.muted,marginBottom:4}}>{t("CURRENT TIME")}</div>
          <div style={{fontSize:48,fontWeight:900,color:C.gold,lineHeight:1,marginBottom:4}}>{now.toLocaleTimeString(localeOf(lang),{hour:"2-digit",minute:"2-digit",timeZone:"Europe/Dublin"})}</div>
          <div style={{fontSize:12,color:C.muted,marginBottom:20}}>{now.toLocaleDateString(localeOf(lang),{weekday:"long",day:"numeric",month:"long",timeZone:"Europe/Dublin"})}</div>
          <div style={{fontSize:12,color:C.muted,marginBottom:4}}>{activeSite?.name??t("Site detected by GPS when clocking")}</div>
          <div style={{marginBottom:16}}><Badge label={clocked?t("On Duty"):t("Off Duty")} color={clocked?C.green:C.muted}/></div>
          <div style={{display:"flex",gap:8,justifyContent:"center"}}>
            <button onClick={()=>punchWithLocation('Clock In')} disabled={clocked||checkingLocation}
              style={{flex:1,padding:"12px",borderRadius:8,border:"none",background:clocked||checkingLocation?C.border:C.green,color:clocked||checkingLocation?C.muted:"#fff",fontWeight:800,fontSize:13,cursor:clocked||checkingLocation?"not-allowed":"pointer",fontFamily:"inherit"}}>
              {checkingLocation?t("Checking location..."):t("✓ Clock In")}
            </button>
            <button onClick={()=>punchWithLocation('Clock Out')} disabled={!clocked||checkingLocation}
              style={{flex:1,padding:"12px",borderRadius:8,border:"none",background:!clocked||checkingLocation?C.border:C.red,color:!clocked||checkingLocation?C.muted:"#fff",fontWeight:800,fontSize:13,cursor:!clocked||checkingLocation?"not-allowed":"pointer",fontFamily:"inherit"}}>
              {t("✗ Clock Out")}
            </button>
          </div>
          <button onClick={logBreak} disabled={!clocked}
            style={{width:"100%",marginTop:8,padding:"9px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:clocked?C.muted:C.border,fontWeight:600,fontSize:12,cursor:clocked?"pointer":"not-allowed",fontFamily:"inherit"}}>
            {t("Log Break")}
          </button>
          <div style={{marginTop:12,textAlign:"left",padding:"9px 10px",borderRadius:7,background:C.surface,color:C.muted,fontSize:10,lineHeight:1.45}}>{t("Location is requested only when you clock in or out. Background location tracking is not used.")}</div>
          {locationMessage&&<div role="alert" style={{marginTop:10,padding:"9px 10px",borderRadius:7,border:`1px solid ${C.red}55`,background:`${C.red}0b`,color:C.red,fontSize:11,lineHeight:1.4}}>
            <div>{locationMessage}</div>
            {canConfigureSites&&locationMessage===t('No site geofences are configured. Ask an administrator to configure site locations.')&&<button onClick={()=>setTab('sites')} style={{marginTop:8,padding:"7px 10px",border:0,borderRadius:6,background:C.gold,color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{t('Configure site geofences')}</button>}
          </div>}
        </Card>

        <div>
          <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:12}}>{t("Today's Activity")}</div>
          {todayLog.length===0
            ? <Card style={{textAlign:"center",padding:40,color:C.muted,fontSize:13}}>{t("No records today. Click Clock In to start.")}</Card>
            : todayLog.map((entry,index)=>{
                const site=sites.find(item=>item.id===entry.siteId);
                return <Card key={`${entry.at}-${index}`} style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
                  <div style={{width:36,height:36,borderRadius:8,background:entry.type==="Clock In"?`${C.green}20`:entry.type==="Clock Out"?`${C.red}20`:`${C.gold}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>
                    {entry.type==="Clock In"?"✓":entry.type==="Clock Out"?"↗":"Ⅱ"}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:C.text}}>{t(entry.type)}</div>
                    <div style={{fontSize:11,color:C.muted}}>{site?.name??t("Unknown site")}{entry.locationVerified?` · ${t("Location verified")}`:""}</div>
                  </div>
                  <div style={{fontSize:14,fontWeight:700,color:C.gold}}>{new Date(entry.at).toLocaleTimeString(localeOf(lang),{hour:"2-digit",minute:"2-digit",timeZone:"Europe/Dublin"})}</div>
                </Card>;
              })
          }
        </div>
      </div>
    </div>
  );
}
