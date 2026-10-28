// IndexedDB. Subir VER y agregar una migración en onupgradeneeded cuando cambie la estructura.
const VER=1,STORES=['movements','lists','reminders'];
let dbp;
const open=()=>dbp??=new Promise((res,rej)=>{const r=indexedDB.open('mi-casa',VER);
  r.onupgradeneeded=()=>{for(const s of STORES)if(!r.result.objectStoreNames.contains(s))r.result.createObjectStore(s,{keyPath:'id'})};
  r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const run=async(stores,mode,fn)=>{const db=await open();return new Promise((res,rej)=>{const t=db.transaction(stores,mode);const out=fn(t);t.oncomplete=()=>res(out?.result);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error)})};
export const getAll=s=>run(s,'readonly',t=>t.objectStore(s).getAll());
export const put=(s,o)=>run(s,'readwrite',t=>t.objectStore(s).put(o));
export const del=(s,id)=>run(s,'readwrite',t=>t.objectStore(s).delete(id));
export const replaceAll=data=>run(STORES,'readwrite',t=>{for(const s of STORES){const o=t.objectStore(s);o.clear();for(const x of data[s]||[])o.put(x)}});
