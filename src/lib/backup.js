export const KEYS=['movements','lists','reminders'];
export const makeBackup=d=>({app:'mi-casa',version:1,exported:new Date().toISOString(),data:Object.fromEntries(KEYS.map(k=>[k,d[k]]))});
export function validateBackup(o){
  if(!o||o.app!=='mi-casa'||o.version!==1||typeof o.data!=='object'||!o.data)throw new Error('El archivo no es una copia de seguridad de Mi Casa.');
  for(const k of KEYS){const a=o.data[k];if(!Array.isArray(a)||a.some(x=>!x||typeof x.id!=='string'))throw new Error(`Datos inválidos en "${k}".`)}
  if(o.data.movements.some(m=>!Number.isInteger(m.cents)||m.cents<=0||!/^\d{4}-\d{2}-\d{2}$/.test(m.date)||!['income','expense'].includes(m.type)))
    throw new Error('Hay movimientos con importe o fecha inválidos.');
  return o.data;
}
