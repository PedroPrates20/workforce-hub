import { useState } from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { C } from '../constants';
import { useApp, useI18n } from '../context/AppContext';

export function Sites() {
  const {sites,setSites,employees}=useApp();
  const {t}=useI18n();
  const [showForm,setShowForm]=useState(false);
  const [locatingSite,setLocatingSite]=useState<string|null>(null);
  const [geoMessage,setGeoMessage]=useState("");
  const [siteSearch,setSiteSearch]=useState("");
  const [radiusDrafts,setRadiusDrafts]=useState<Record<string,string>>({});
  const [expandedSite,setExpandedSite]=useState<string|null>(null);
  const [editingSite,setEditingSite]=useState<string|null>(null);
  const [siteDetailsDraft,setSiteDetailsDraft]=useState({cleanersRequired:"",securityRequired:"",buildingManagerPhone:"",openingHours:""});
  const [form,setForm]=useState({name:"",address:"",client:"",postos:"1"});
  const visibleSites=sites.filter(site=>site.name.toLocaleLowerCase().includes(siteSearch.trim().toLocaleLowerCase()));

  const setSiteLocation = (siteId:string) => {
    setGeoMessage("");
    if(!navigator.geolocation){setGeoMessage(t("This browser does not support location."));return;}
    setLocatingSite(siteId);
    navigator.geolocation.getCurrentPosition(position=>{
      const site=sites.find(item=>item.id===siteId);
      const radius=site?.geofenceRadius??100;
      if(!Number.isFinite(position.coords.latitude)||!Number.isFinite(position.coords.longitude)||!Number.isFinite(position.coords.accuracy)||position.coords.accuracy>radius){
        setLocatingSite(null);
        setGeoMessage(t("Location accuracy is too low. Enable precise location and try again."));
        return;
      }
      setSites(current=>current.map(site=>site.id===siteId?{...site,latitude:position.coords.latitude,longitude:position.coords.longitude,geofenceRadius:site.geofenceRadius??100}:site));
      setLocatingSite(null);
      setGeoMessage(t("Site geofence saved using this device's current location."));
    },error=>{
      setLocatingSite(null);
      setGeoMessage(error.code===1?t("Location permission was denied."):error.code===3?t("Location request timed out. Try again."):t("Unable to get this device's location."));
    },{enableHighAccuracy:true,timeout:15000,maximumAge:0});
  };

  const add = () => {
    if(!form.name) return;
    setSites(s=>{
      const nextId=s.reduce((max,site)=>Math.max(max,Number(site.id.slice(1))||0),0)+1;
      return [...s,{id:`s${nextId}`,name:form.name,address:form.address,client:form.client,active:true,postos:parseInt(form.postos)||1,geofenceRadius:100}];
    });
    setForm({name:"",address:"",client:"",postos:"1"});
    setShowForm(false);
  };

  const beginSiteEdit = (site: (typeof sites)[number]) => {
    setSiteDetailsDraft({cleanersRequired:site.cleanersRequired==null?"":String(site.cleanersRequired),securityRequired:site.securityRequired==null?"":String(site.securityRequired),buildingManagerPhone:site.buildingManagerPhone??"",openingHours:site.openingHours??""});
    setEditingSite(site.id);
    setExpandedSite(site.id);
  };

  const saveSiteDetails = (siteId:string) => {
    const parseCount=(value:string)=>{if(value==="")return undefined;const count=Number(value);return Number.isFinite(count)?Math.max(0,Math.floor(count)):undefined;};
    const cleanersRequired=parseCount(siteDetailsDraft.cleanersRequired);
    const securityRequired=parseCount(siteDetailsDraft.securityRequired);
    const buildingManagerPhone=siteDetailsDraft.buildingManagerPhone.trim();
    const openingHours=siteDetailsDraft.openingHours.trim();
    setSites(current=>current.map(site=>{
      if(site.id!==siteId)return site;
      const {cleanersRequired:_cleaners,securityRequired:_security,buildingManagerPhone:_phone,openingHours:_hours,...base}=site;
      return {...base,...(cleanersRequired!==undefined?{cleanersRequired}:{}),...(securityRequired!==undefined?{securityRequired}:{}),...(buildingManagerPhone?{buildingManagerPhone}:{}),...(openingHours?{openingHours}:{})};
    }));
    setEditingSite(null);
  };

  const detailInputStyle={width:"100%",boxSizing:"border-box" as const,padding:"8px 9px",border:`1px solid ${C.border}`,borderRadius:7,background:C.card,color:C.text,fontSize:12,fontFamily:"inherit"};

  return (
    <div className="workforce-page" style={{padding:24}}>
      <div className="workforce-head" style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <div style={{fontSize:20,fontWeight:800,color:C.text}}>{t("Sites & Posts")}</div>
          <div style={{fontSize:12,color:C.muted}}>{t("{a} active sites · {p} total posts",{a:sites.filter(s=>s.active).length,p:sites.reduce((a,s)=>a+s.postos,0)})}</div>
        </div>
        <button onClick={()=>setShowForm(s=>!s)} style={{background:C.gold,color:"#fff",border:"none",borderRadius:7,padding:"9px 18px",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{t("+ New Site")}</button>
      </div>

      {showForm && (
        <Card style={{marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:12}}>{t("New Site")}</div>
          <div className="workforce-stack" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            {([["name","Site Name"],["address","Address"],["client","Client"],["postos","No. of Posts"]] as [string,string][]).map(([k,l])=>(
              <div key={k}>
                <div style={{fontSize:11,color:C.muted,marginBottom:5}}>{t(l)}</div>
                <input value={(form as any)[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}
                  style={{width:"100%",background:"#ffffff",border:`1px solid ${C.border}`,borderRadius:7,padding:"8px 10px",color:C.text,fontSize:13,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={add} style={{background:C.gold,color:"#fff",border:"none",borderRadius:7,padding:"8px 18px",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{t("Save")}</button>
            <button onClick={()=>setShowForm(false)} style={{background:"transparent",color:C.muted,border:`1px solid ${C.border}`,borderRadius:7,padding:"8px 18px",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{t("Cancel")}</button>
          </div>
        </Card>
      )}

      <div style={{marginBottom:14}}>
        <input type="search" value={siteSearch} onChange={event=>setSiteSearch(event.target.value)} placeholder={t("Search sites...")} aria-label={t("Search sites...")} style={{width:"100%",maxWidth:420,background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",color:C.text,fontSize:13,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}} />
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:12}}>
        {visibleSites.length===0?<Card><div style={{fontSize:13,color:C.muted}}>{t("No sites found")}</div></Card>:visibleSites.map(s=>(
          <Card key={s.id}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div style={{fontWeight:700,fontSize:15,color:C.text}}>{s.name}</div>
              <Badge label={t(s.active?"Active":"Inactive")} color={s.active?C.green:C.muted}/>
            </div>
            <div style={{fontSize:12,color:C.muted,marginBottom:4}}>{s.address}</div>
            <div style={{fontSize:12,color:C.muted,marginBottom:12}}>{s.client}</div>
            <div style={{borderTop:`1px solid ${C.border}`,paddingTop:10,marginBottom:10}}>
              <div style={{fontSize:11,fontWeight:700,color:C.text,marginBottom:5}}>{t("Clock-in geofence")}</div>
              <div style={{fontSize:11,color:C.muted,marginBottom:8}}>{s.latitude!=null&&s.longitude!=null?t("Location configured · radius {n} m",{n:s.geofenceRadius??100}):t("Location not configured. Clocking is disabled for this site until a location is set.")}</div>
              {s.latitude==null&&s.longitude==null&&<div style={{fontSize:10,color:C.muted,marginBottom:8}}>{t("Set the location while physically at this site.")}</div>}
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <button onClick={()=>setSiteLocation(s.id)} disabled={locatingSite===s.id} style={{padding:"7px 10px",borderRadius:7,border:`1px solid ${C.gold}`,background:`${C.gold}12`,color:C.gold,fontSize:11,fontWeight:700,cursor:locatingSite===s.id?"wait":"pointer",fontFamily:"inherit"}}>{locatingSite===s.id?t("Getting location..."):s.latitude!=null?t("Update site location"):t("Set location from this device")}</button>
                <label style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:C.muted}}>{t("Radius (m)")}<input type="number" min={25} max={1000} step={5} value={radiusDrafts[s.id]??String(s.geofenceRadius??100)} aria-label={t("Radius (m)")} onChange={event=>setRadiusDrafts(current=>({...current,[s.id]:event.target.value}))} onBlur={()=>{const draft=radiusDrafts[s.id];if(draft===undefined)return;const radius=Math.max(25,Math.min(1000,Number(draft)||100));setSites(current=>current.map(site=>site.id===s.id?{...site,geofenceRadius:radius}:site));setRadiusDrafts(current=>({...current,[s.id]:String(radius)}));}} style={{width:76,padding:"6px 7px",border:`1px solid ${C.border}`,borderRadius:6,color:C.text,fontFamily:"inherit"}} /></label>
              </div>
            </div>
            <div style={{display:"flex",gap:12,borderTop:`1px solid ${C.border}`,paddingTop:10}}>
              <div style={{textAlign:"center",flex:1}}>
                <div style={{fontSize:20,fontWeight:800,color:C.gold}}>{s.postos}</div>
                <div style={{fontSize:10,color:C.muted}}>{t("Posts")}</div>
              </div>
              <div style={{textAlign:"center",flex:1}}>
                <div style={{fontSize:20,fontWeight:800,color:C.blue}}>{employees.filter(e=>e.site===s.id).length}</div>
                <div style={{fontSize:10,color:C.muted}}>{t("Employees")}</div>
              </div>
            </div>
            <button type="button" aria-expanded={expandedSite===s.id} onClick={()=>{setExpandedSite(current=>current===s.id?null:s.id);setEditingSite(null);}} style={{width:"100%",marginTop:10,padding:"8px",borderRadius:7,border:`1px solid ${C.border}`,background:C.card,color:C.text,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{t(expandedSite===s.id?"Show less":"View more")}</button>
            {expandedSite===s.id&&<div style={{borderTop:`1px solid ${C.border}`,marginTop:10,paddingTop:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:10}}><div style={{fontSize:12,fontWeight:800,color:C.text}}>{t("Site details")}</div>{editingSite!==s.id&&<button type="button" onClick={()=>beginSiteEdit(s)} style={{padding:"6px 9px",borderRadius:6,border:`1px solid ${C.gold}`,background:`${C.gold}10`,color:C.gold,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{t("Edit site details")}</button>}</div>
              {editingSite===s.id?<div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:9}}>
                  <label style={{fontSize:10,color:C.muted}}>{t("Cleaners required")}<input type="number" min={0} step={1} value={siteDetailsDraft.cleanersRequired} onChange={event=>setSiteDetailsDraft(current=>({...current,cleanersRequired:event.target.value}))} style={{...detailInputStyle,marginTop:5}} /></label>
                  <label style={{fontSize:10,color:C.muted}}>{t("Security staff required")}<input type="number" min={0} step={1} value={siteDetailsDraft.securityRequired} onChange={event=>setSiteDetailsDraft(current=>({...current,securityRequired:event.target.value}))} style={{...detailInputStyle,marginTop:5}} /></label>
                  <label style={{fontSize:10,color:C.muted}}>{t("Building manager phone")}<input type="tel" value={siteDetailsDraft.buildingManagerPhone} onChange={event=>setSiteDetailsDraft(current=>({...current,buildingManagerPhone:event.target.value}))} placeholder={t("Not provided")} style={{...detailInputStyle,marginTop:5}} /></label>
                  <label style={{fontSize:10,color:C.muted}}>{t("Operating hours")}<input value={siteDetailsDraft.openingHours} onChange={event=>setSiteDetailsDraft(current=>({...current,openingHours:event.target.value}))} placeholder={t("e.g. Mon–Fri, 07:00–19:00")} style={{...detailInputStyle,marginTop:5}} /></label>
                </div>
                <div style={{display:"flex",gap:7,marginTop:10}}><button type="button" onClick={()=>saveSiteDetails(s.id)} style={{padding:"7px 11px",border:0,borderRadius:6,background:C.gold,color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{t("Save")}</button><button type="button" onClick={()=>setEditingSite(null)} style={{padding:"7px 11px",border:`1px solid ${C.border}`,borderRadius:6,background:C.card,color:C.muted,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>{t("Cancel")}</button></div>
              </div>:<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10}}>
                <div><div style={{fontSize:10,color:C.muted}}>{t("Cleaners required")}</div><div style={{marginTop:3,fontSize:12,fontWeight:700,color:C.text}}>{s.cleanersRequired??t("Not provided")} <span style={{fontSize:10,fontWeight:400,color:C.muted}}>· {employees.filter(employee=>employee.active&&employee.site===s.id&&employee.role==="cleaner").length} {t("currently assigned")}</span></div></div>
                <div><div style={{fontSize:10,color:C.muted}}>{t("Security staff required")}</div><div style={{marginTop:3,fontSize:12,fontWeight:700,color:C.text}}>{s.securityRequired??t("Not provided")} <span style={{fontSize:10,fontWeight:400,color:C.muted}}>· {employees.filter(employee=>employee.active&&employee.site===s.id&&employee.role==="security").length} {t("currently assigned")}</span></div></div>
                <div><div style={{fontSize:10,color:C.muted}}>{t("Building manager phone")}</div><div style={{marginTop:3,fontSize:12,fontWeight:700,color:C.text}}>{s.buildingManagerPhone?<a href={`tel:${s.buildingManagerPhone.replace(/[^+\d]/g,"")}`} style={{color:C.text}}>{s.buildingManagerPhone}</a>:t("Not provided")}</div></div>
                <div><div style={{fontSize:10,color:C.muted}}>{t("Operating hours")}</div><div style={{marginTop:3,fontSize:12,fontWeight:700,color:C.text}}>{s.openingHours||t("Not provided")}</div></div>
              </div>}
            </div>}
            <button onClick={()=>setSites(ss=>ss.map(x=>x.id===s.id?{...x,active:!x.active}:x))}
              style={{width:"100%",marginTop:10,padding:"7px",borderRadius:6,border:`1px solid ${s.active?C.red:C.green}`,background:"transparent",color:s.active?C.red:C.green,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
              {t(s.active?"Deactivate site":"Activate site")}
            </button>
          </Card>
        ))}
      </div>
      {geoMessage&&<div role="status" style={{position:"fixed",bottom:20,right:20,zIndex:1000,maxWidth:360,padding:"12px 16px",border:`1px solid ${C.border}`,borderRadius:9,background:C.card,color:C.text,fontSize:12,boxShadow:"0 4px 16px rgba(0,0,0,.12)"}}>{geoMessage}</div>}
    </div>
  );
}
