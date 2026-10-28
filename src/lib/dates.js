const TZ='America/Argentina/Cordoba';
const MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const utc=s=>{const [y,m,d]=s.split('-').map(Number);return Date.UTC(y,m-1,d)};
export const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:TZ}).format(new Date());
export const fmtDate=i=>{const [y,m,d]=i.split('-');return `${d}/${m}/${y}`};
export const monthKey=i=>i.slice(0,7);
export const shiftMonth=(k,n)=>{const [y,m]=k.split('-').map(Number);const t=y*12+m-1+n;return `${Math.floor(t/12)}-${String(t%12+1).padStart(2,'0')}`};
export const monthLabel=k=>{const [y,m]=k.split('-');return `${MESES[m-1]} ${y}`};
export const daysBetween=(a,b)=>Math.round((utc(b)-utc(a))/864e5);
