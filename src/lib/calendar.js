const p=(d,t)=>d.replace(/-/g,'')+(t?'T'+t.replace(':','')+'00':'');
const esc=s=>String(s||'').replace(/[\\;,]/g,'\\$&').replace(/\n/g,'\\n');
export const icsFor=r=>['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Mi Casa//ES','BEGIN:VEVENT',`UID:${r.id}@mi-casa`,
  `DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').slice(0,15)}Z`,
  r.time?`DTSTART:${p(r.date,r.time)}`:`DTSTART;VALUE=DATE:${p(r.date)}`,
  `SUMMARY:${esc(r.title)}`,r.place?`LOCATION:${esc(r.place)}`:'','END:VEVENT','END:VCALENDAR'].filter(Boolean).join('\r\n');
const add=(date,time,h,d)=>{const [y,m,dd]=date.split('-').map(Number);const [hh,mm]=(time||'0:0').split(':').map(Number);
  return new Date(Date.UTC(y,m-1,dd+d,hh+h,mm)).toISOString().replace(/[-:]/g,'').slice(0,15)};
export const gcalLink=r=>{
  const dates=r.time?`${add(r.date,r.time,0,0)}/${add(r.date,r.time,1,0)}`:`${add(r.date,'',0,0).slice(0,8)}/${add(r.date,'',0,1).slice(0,8)}`;
  return 'https://calendar.google.com/calendar/render?'+new URLSearchParams({action:'TEMPLATE',text:r.title,dates,ctz:'America/Argentina/Cordoba',location:r.place||''});
};
