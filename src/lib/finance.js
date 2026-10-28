// Fórmula del saldo estimado:
//   saldo = ingresos acumulados hasta fin del mes − gastos PAGADOS acumulados hasta fin del mes.
// Las cuentas pendientes NO se descuentan hasta que se marcan como pagadas (así nunca se restan dos veces).
const sum=a=>a.reduce((t,m)=>t+m.cents,0);
export function summarize(ms,month,today){
  const inM=ms.filter(m=>m.date.startsWith(month));
  const exp=inM.filter(m=>m.type==='expense');
  const upto=ms.filter(m=>m.date.slice(0,7)<=month);
  const income=sum(inM.filter(m=>m.type==='income'));
  const paid=sum(exp.filter(m=>m.status==='paid'));
  return {
    income,paid,
    pending:sum(exp.filter(m=>m.status==='pending')),
    overdue:sum(ms.filter(m=>m.type==='expense'&&m.status==='pending'&&m.date<today)),
    monthBalance:income-paid,
    balance:sum(upto.filter(m=>m.type==='income'))-sum(upto.filter(m=>m.type==='expense'&&m.status==='paid'))
  };
}
export function byCategory(ms,month){
  const t={};
  for(const m of ms)if(m.type==='expense'&&m.status==='paid'&&m.date.startsWith(month))t[m.category]=(t[m.category]||0)+m.cents;
  return Object.entries(t).sort((a,b)=>b[1]-a[1]);
}
