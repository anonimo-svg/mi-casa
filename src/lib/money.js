// Importes siempre en centavos enteros: evita errores de coma flotante.
export const toCents=v=>{const s=String(v??'').trim().replace(/\./g,'').replace(',','.');return /^\d+(\.\d{1,2})?$/.test(s)?Math.round(parseFloat(s)*100):null};
const nf=new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS'});
export const fmt=c=>nf.format(c/100);
export const inputValue=c=>String(c/100).replace('.',',');
