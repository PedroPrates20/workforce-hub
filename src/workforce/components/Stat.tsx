import { Card } from './Card';
import { C } from '../constants';

export function Stat({label, value, sub, accent}:{label:string; value:string|number; sub?:string; accent?:string}) {
  return (
    <Card style={{flex:1,minWidth:140}}>
      <div style={{fontSize:11,color:C.muted,marginBottom:4}}>{label}</div>
      <div style={{fontSize:28,fontWeight:800,color:accent||C.gold,lineHeight:1}}>{value}</div>
      {sub && <div style={{fontSize:11,color:C.muted,marginTop:4}}>{sub}</div>}
    </Card>
  );
}