import { useRef, useState } from 'react';
import { Card } from '../components/Card';
import { C } from '../constants';
import { useApp, useI18n } from '../context/AppContext';

type AuditPhoto = { name:string; data:string };
type AuditRecord = { siteId:string; date:string; referenceMonth:string; description:string; photos?:AuditPhoto[]; photo?:string };
const MAX_PHOTOS=50;
const STORAGE_KEY='epm_visual_audit_records';

function readPhoto(file:File):Promise<string>{
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onerror=()=>reject(new Error('read'));
    reader.onload=()=>{
      const image=new Image();
      image.onerror=()=>reject(new Error('image'));
      image.onload=()=>{
        const scale=Math.min(1,1400/Math.max(image.width,image.height));
        const canvas=document.createElement('canvas');
        canvas.width=Math.max(1,Math.round(image.width*scale));
        canvas.height=Math.max(1,Math.round(image.height*scale));
        canvas.getContext('2d')?.drawImage(image,0,0,canvas.width,canvas.height);
        resolve(canvas.toDataURL('image/jpeg',0.78));
      };
      image.src=String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function Audit() {
  const {t}=useI18n();
  const {sites}=useApp();
  const [records,setRecords]=useState<AuditRecord[]>(()=>{
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]') as AuditRecord[];}catch{return [];}
  });
  const [activeSite,setActiveSite]=useState<{id:string;name:string}|null>(null);
  const [date,setDate]=useState(()=>new Date().toISOString().slice(0,10));
  const [referenceMonth,setReferenceMonth]=useState(()=>new Date().toISOString().slice(0,7));
  const [description,setDescription]=useState('');
  const [photos,setPhotos]=useState<AuditPhoto[]>([]);
  const [error,setError]=useState('');
  const [saving,setSaving]=useState(false);
  const fileRef=useRef<HTMLInputElement>(null);

  const openUpload=(site:{id:string;name:string})=>{
    setActiveSite(site);setDate(new Date().toISOString().slice(0,10));setReferenceMonth(new Date().toISOString().slice(0,7));setDescription('');setPhotos([]);setError('');
  };
  const selectPhotos=async(fileList?:FileList|null)=>{
    const selected=Array.from(fileList||[]);
    if(!selected.length)return;
    const available=MAX_PHOTOS-photos.length;
    if(selected.some(file=>!file.type.startsWith('image/'))){setError(t('Choose image files only.'));return;}
    if(selected.length>available){setError(t('You can add up to 50 photos per audit.'));return;}
    try{
      const added=await Promise.all(selected.map(async file=>({name:file.name,data:await readPhoto(file)})));
      setPhotos(current=>[...current,...added]);setError('');
    }catch{setError(t('Could not read this photo. Try another image.'));}
  };
  const submit=()=>{
    if(!activeSite||!date||!referenceMonth||!description.trim()||!photos.length){setError(t('Complete the date, reference month, description, and photo.'));return;}
    setSaving(true);
    const next=[{siteId:activeSite.id,date,referenceMonth,description:description.trim(),photos},...records];
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next));setRecords(next);setActiveSite(null);}
    catch{setError(t('Could not save audit. The photo may be too large.'));}
    finally{setSaving(false);}
  };

  return (
    <div className="workforce-page" style={{padding:24}}>
      <div style={{fontSize:20,fontWeight:800,color:C.text,marginBottom:4}}>{t('Visual Audit')}</div>
      <div style={{fontSize:12,color:C.muted,marginBottom:20}}>{t('Photo logs and visual post compliance')}</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:12}}>
        {sites.map(site=>{
          const record=records.find(item=>item.siteId===site.id);
          return <Card key={site.id}>
            <div style={{height:120,background:`linear-gradient(135deg,${C.bg},#e2e6ec)`,borderRadius:6,marginBottom:12,display:'flex',alignItems:'center',justifyContent:'center',border:`1px dashed ${C.border}`,overflow:'hidden'}}>
              {(record?.photos?.[0]?.data||record?.photo)?<img src={record.photos?.[0]?.data||record.photo} alt={record.description} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<div style={{fontSize:11,color:C.muted}}>{t('No photo recorded')}</div>}
            </div>
            <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:4}}>{site.name}</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:record?8:10}}>{site.client}</div>
            {record&&<div style={{fontSize:11,color:C.muted,marginBottom:10}}>{record.date} · {record.referenceMonth}{` · ${(record.photos?.length||Number(Boolean(record.photo)))} ${t('photos')}`}<div style={{marginTop:4,color:C.text}}>{record.description}</div></div>}
            <button onClick={()=>openUpload(site)} style={{width:'100%',padding:'8px',borderRadius:6,border:`1px solid ${C.border}`,background:'transparent',color:C.muted,fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>{t(record?'Update audit':'Upload Photo')}</button>
          </Card>;
        })}
      </div>
      {activeSite&&<div role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setActiveSite(null);}} style={{position:'fixed',inset:0,zIndex:1200,background:'rgba(15,27,45,.48)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
        <div role="dialog" aria-modal="true" aria-labelledby="audit-dialog-title" style={{width:'100%',maxWidth:480,background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:20,boxShadow:'0 16px 48px rgba(0,0,0,.2)'}}>
          <div id="audit-dialog-title" style={{fontSize:17,fontWeight:800,color:C.text,marginBottom:4}}>{t('Upload Photo')}</div>
          <div style={{fontSize:12,color:C.muted,marginBottom:16}}>{activeSite.name}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
            <label style={{fontSize:11,color:C.muted}}>{t('Date')}<input type="date" value={date} onChange={event=>setDate(event.target.value)} style={{display:'block',width:'100%',marginTop:5,padding:'9px 10px',border:`1px solid ${C.border}`,borderRadius:7,color:C.text,fontFamily:'inherit',boxSizing:'border-box'}}/></label>
            <label style={{fontSize:11,color:C.muted}}>{t('Reference month')}<input type="month" value={referenceMonth} onChange={event=>setReferenceMonth(event.target.value)} style={{display:'block',width:'100%',marginTop:5,padding:'9px 10px',border:`1px solid ${C.border}`,borderRadius:7,color:C.text,fontFamily:'inherit',boxSizing:'border-box'}}/></label>
          </div>
          <label style={{display:'block',fontSize:11,color:C.muted,marginBottom:12}}>{t('Description')}<textarea value={description} onChange={event=>setDescription(event.target.value)} rows={3} placeholder={t('Describe the audit...')} style={{display:'block',width:'100%',marginTop:5,padding:'9px 10px',border:`1px solid ${C.border}`,borderRadius:7,color:C.text,fontSize:13,fontFamily:'inherit',resize:'vertical',boxSizing:'border-box'}}/></label>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={event=>{void selectPhotos(event.target.files);event.currentTarget.value='';}} style={{display:'none'}}/>
          <button type="button" onClick={()=>fileRef.current?.click()} style={{width:'100%',padding:10,borderRadius:7,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:12,cursor:'pointer',fontFamily:'inherit',marginBottom:photos.length?8:14}}>{t('Choose photos')} · {photos.length}/{MAX_PHOTOS}</button>
          {photos.length>0&&<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(64px,1fr))',gap:6,maxHeight:150,overflowY:'auto',marginBottom:12}}>{photos.map((item,index)=><div key={`${item.name}-${index}`} style={{position:'relative'}}><img src={item.data} alt={`${t('Photo preview')} ${index+1}`} title={item.name} style={{width:'100%',height:64,objectFit:'cover',borderRadius:6}}/><button type="button" aria-label={t('Remove photo')} onClick={()=>setPhotos(current=>current.filter((_,i)=>i!==index))} style={{position:'absolute',top:2,right:2,width:20,height:20,border:0,borderRadius:'50%',background:'#10213a',color:'#fff',cursor:'pointer'}}>×</button></div>)}</div>}
          {error&&<div role="alert" style={{fontSize:11,color:C.red,marginBottom:12}}>{error}</div>}
          <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
            <button onClick={()=>setActiveSite(null)} style={{padding:'8px 14px',borderRadius:7,border:`1px solid ${C.border}`,background:'transparent',color:C.muted,fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>{t('Cancel')}</button>
            <button onClick={submit} disabled={saving} style={{padding:'8px 14px',borderRadius:7,border:0,background:C.gold,color:'#fff',fontSize:12,fontWeight:700,cursor:saving?'wait':'pointer',fontFamily:'inherit'}}>{saving?t('Saving...'):t('Submit audit')}</button>
          </div>
        </div>
      </div>}
    </div>
  );
}
