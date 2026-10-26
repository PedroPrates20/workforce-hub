
export function Badge({label, color, bg}:{label:string; color:string; bg?:string}) {
  return (
    <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:99,background:bg||color+"20",color,border:`1px solid ${color}40`,whiteSpace:"nowrap"}}>
      {label}
    </span>
  );
}