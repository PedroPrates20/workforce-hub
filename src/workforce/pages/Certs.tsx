import type { Certificate } from '../types';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { C, MOCK_CERTS } from '../constants';
import { useApp, useI18n } from '../context/AppContext';

export function Certs() {
  const {t}=useI18n();
  const {employees}=useApp();
  const statusColor=(s:Certificate["status"])=>s==="valid"?C.green:s==="expiring"?"#f59e0b":C.red;

  return (
    <div className="workforce-page" style={{padding:24}}>
      <div style={{fontSize:20,fontWeight:800,color:C.text,marginBottom:4}}>{t("Certificates")}</div>
      <div style={{fontSize:12,color:C.muted,marginBottom:20}}>{t("Certification validity and compliance")}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
        {MOCK_CERTS.filter(c=>employees.some(employee=>employee.id===c.empId)).map((c,i)=>(
          <Card key={i}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div>
                <div style={{fontWeight:700,fontSize:14,color:C.text}}>{employees.find(employee=>employee.id===c.empId)?.name||c.name}</div>
                <div style={{fontSize:12,color:C.muted}}>{t(c.type)}</div>
              </div>
              <Badge label={t(c.status==="valid"?"✓ Valid":c.status==="expiring"?"Expiring":"✗ Expired")} color={statusColor(c.status)}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,borderTop:`1px solid ${C.border}`,paddingTop:10}}>
              <span style={{color:C.muted}}>{t("Expires on")}</span>
              <span style={{fontWeight:700,color:statusColor(c.status)}}>{c.expiry}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
