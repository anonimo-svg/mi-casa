import {getAll,put,del,replaceAll} from './lib/db.js';
import {toCents,fmt,inputValue} from './lib/money.js';
import {today,fmtDate,monthKey,shiftMonth,monthLabel,daysBetween} from './lib/dates.js';
import {summarize,byCategory} from './lib/finance.js';
import {icsFor,gcalLink} from './lib/calendar.js';
import {makeBackup,validateBackup} from './lib/backup.js';

const app=document.querySelector('#app');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CATS=['Alimentos','Servicios','Alquiler','Transporte','Salud','Educación','Hogar','Ropa','Mascotas','Entretenimiento','Otros'];
const S={month:monthKey(today()),movements:[],lists:[],reminders:[],listId:null};
const uid=()=>crypto.randomUUID();
const load=async()=>{[S.movements,S.lists,S.reminders]=await Promise.all(['movements','lists','reminders'].map(getAll))};
const toast=(m,err)=>{const t=document.createElement('div');t.className='toast'+(err?' err':'');t.setAttribute('role',err?'alert':'status');t.textContent=m;document.body.append(t);setTimeout(()=>t.remove(),4000)};
const download=(name,text,type)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};

function ask(title,fields,vals={}){return new Promise(res=>{
  const d=document.createElement('dialog');
  d.innerHTML=`<form method="dialog"><h2>${esc(title)}</h2>${fields.map(f=>`<label>${f.label}${f.type==='select'
    ?`<select name="${f.name}">${f.options.map(([v,l])=>`<option value="${esc(v)}" ${vals[f.name]==v?'selected':''}>${esc(l)}</option>`).join('')}</select>`
    :`<input name="${f.name}" type="${f.type||'text'}" value="${esc(vals[f.name]??'')}" ${f.req?'required':''} ${f.mode?`inputmode="${f.mode}"`:''}>`}</label>`).join('')}
    <div class="row sp"><button value="cancel" class="ghost" formnovalidate>Cancelar</button><button value="ok">Guardar</button></div></form>`;
  document.body.append(d);d.showModal();
  d.onclose=()=>{const ok=d.returnValue==='ok';const fd=Object.fromEntries(new FormData(d.querySelector('form')));d.remove();res(ok?fd:null)};
})}

/* ---------- Vistas ---------- */
const empty=t=>`<div class="empty">${t}</div>`;
const remState=r=>{if(r.done)return['ok','Completado'];const d=daysBetween(today(),r.date);
  if(d<0)return['bad','Vencido'];if(d===0)return['warn','Hoy'];return[d<=r.advance?'warn':'mut',`En ${d} día${d>1?'s':''}`]};
const dueReminders=()=>S.reminders.filter(r=>!r.done&&daysBetween(today(),r.date)<=r.advance).sort((a,b)=>a.date.localeCompare(b.date));
const monthNav=()=>`<div class="row sp"><button class="ghost" data-act="month" data-n="-1" aria-label="Mes anterior">‹</button><strong>${monthLabel(S.month)}</strong><button class="ghost" data-act="month" data-n="1" aria-label="Mes siguiente">›</button></div>`;

function inicio(){
  const s=summarize(S.movements,S.month,today());
  const up=S.movements.filter(m=>m.type==='expense'&&m.status==='pending').sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5);
  const due=dueReminders();
  const buy=S.lists.reduce((n,l)=>n+l.items.filter(i=>!i.done).length,0);
  return `<h1>Mi Casa</h1>${monthNav()}
  <div class="card"><p class="mut">Saldo disponible estimado</p><p class="big ${s.balance<0?'bad':''}">${fmt(s.balance)}</p>
  <p class="mut">Ingresos acumulados menos gastos pagados. Las cuentas pendientes todavía no se descuentan.</p></div>
  <div class="grid"><div class="card"><p class="mut">Ingresos del mes</p><strong>${fmt(s.income)}</strong></div>
  <div class="card"><p class="mut">Gastos pagados</p><strong>${fmt(s.paid)}</strong></div>
  <div class="card"><p class="mut">Cuentas pendientes</p><strong>${fmt(s.pending)}</strong></div>
  <div class="card"><p class="mut">Vencidas (todas)</p><strong class="${s.overdue?'bad':''}">${fmt(s.overdue)}</strong></div></div>
  <div class="row"><button data-act="addMov" data-type="expense">Registrar gasto</button><button data-act="addMov" data-type="income" class="ghost">Agregar ingreso</button>
  <button data-act="newRem" class="ghost">Crear recordatorio</button><button data-act="newList" class="ghost">Nueva lista</button></div>
  <h2>Próximos vencimientos</h2>${up.length?up.map(m=>`<div class="card row sp"><span>${esc(m.desc)}<br><span class="mut ${m.date<today()?'bad':''}">${fmtDate(m.date)}${m.date<today()?' · vencida':''}</span></span><strong>${fmt(m.cents)}</strong></div>`).join(''):empty('No tenés cuentas pendientes. Cuando cargues un gasto como pendiente, aparece acá.')}
  <h2>Avisos</h2>${due.length?due.map(r=>`<div class="card"><strong>${esc(r.title)}</strong><br><span class="${remState(r)[0]}">${remState(r)[1]}</span> · ${fmtDate(r.date)}${r.time?' '+r.time:''}</div>`).join(''):empty('No hay avisos para estos días.')}
  <h2>Compras</h2><div class="card">${buy?`Te faltan comprar <strong>${buy}</strong> producto${buy>1?'s':''} en ${S.lists.length} lista${S.lists.length>1?'s':''}.`:'No hay productos pendientes.'}</div>`;
}

function dinero(){
  const ms=S.movements.filter(m=>m.date.startsWith(S.month)).sort((a,b)=>b.date.localeCompare(a.date));
  const s=summarize(S.movements,S.month,today()),cats=byCategory(S.movements,S.month);
  const prev=summarize(S.movements,shiftMonth(S.month,-1),today());
  return `<h1>Dinero</h1>${monthNav()}
  <div class="row"><button data-act="addMov" data-type="expense">Nuevo gasto</button><button class="ghost" data-act="addMov" data-type="income">Nuevo ingreso</button></div>
  <div class="card">Balance del mes: <strong class="${s.monthBalance<0?'bad':'ok'}">${fmt(s.monthBalance)}</strong><br><span class="mut">Mes anterior: ${fmt(prev.monthBalance)}</span></div>
  ${cats.length?`<h2>Gastos pagados por categoría</h2>${cats.map(([c,v])=>`<div class="row sp"><span>${esc(c)}</span><strong>${fmt(v)}</strong></div>`).join('')}`:''}
  <h2>Movimientos</h2>${ms.length?ms.map(m=>`<div class="card"><div class="row sp"><strong>${esc(m.desc)}</strong><strong class="${m.type==='income'?'ok':''}">${m.type==='income'?'+':'−'}${fmt(m.cents)}</strong></div>
  <span class="mut">${fmtDate(m.date)} · ${esc(m.category)} · ${m.type==='income'?'Ingreso':m.status==='paid'?'Pagado':`<span class="${m.date<today()?'bad':'warn'}">${m.date<today()?'Vencida':'Pendiente'}</span>`}</span>${m.notes?`<br><span class="mut">${esc(m.notes)}</span>`:''}
  <div class="row">${m.status==='pending'?`<button class="sm" data-act="pay" data-id="${m.id}">Marcar pagada</button>`:''}<button class="sm ghost" data-act="editMov" data-id="${m.id}">Editar</button><button class="sm danger" data-act="delMov" data-id="${m.id}">Eliminar</button></div></div>`).join(''):empty('Todavía no cargaste movimientos este mes. Usá “Nuevo gasto” o “Nuevo ingreso”.')}`;
}

const listText=l=>`${l.name}\n`+l.items.map(i=>`${i.done?'[x]':'[ ]'} ${i.name}${i.qty?` (${i.qty})`:''}`).join('\n');
function compras(){
  const l=S.lists.find(x=>x.id===S.listId);
  if(!l)return `<h1>Compras</h1><button data-act="newList">Nueva lista</button>${S.lists.length?S.lists.map(x=>`<div class="card row sp"><span><strong>${esc(x.name)}</strong><br><span class="mut">${x.items.filter(i=>i.done).length} de ${x.items.length} comprados</span></span><button class="sm ghost" data-act="openList" data-id="${x.id}">Abrir</button></div>`).join(''):empty('Todavía no tenés listas. Creá una para el supermercado, la farmacia o lo que necesites.')}`;
  const done=l.items.filter(i=>i.done).length,est=l.items.reduce((t,i)=>t+(i.price||0),0);
  const row=i=>`<div class="item ${i.done?'done':''}"><input type="checkbox" ${i.done?'checked':''} data-act="toggle" data-id="${i.id}" aria-label="Comprado: ${esc(i.name)}"><div class="grow"><span class="t">${esc(i.name)}</span>${i.qty?` <span class="mut">(${esc(i.qty)})</span>`:''}${i.price?` <span class="mut">${fmt(i.price)}</span>`:''}${i.notes?`<br><span class="mut">${esc(i.notes)}</span>`:''}</div>
  <button class="sm ghost" data-act="editItem" data-id="${i.id}">Editar</button><button class="sm danger" data-act="delItem" data-id="${i.id}" aria-label="Eliminar ${esc(i.name)}">✕</button></div>`;
  return `<div class="noprint"><button class="ghost" data-act="back">‹ Mis listas</button></div><h1>${esc(l.name)}</h1>
  <progress max="${l.items.length||1}" value="${done}"></progress><p class="mut">${done} de ${l.items.length} comprados${est?` · Presupuesto estimado: ${fmt(est)}`:''}</p>
  <form data-form="item" class="row noprint"><input name="name" placeholder="Producto" required aria-label="Producto" style="flex:2;min-width:9rem"><input name="qty" placeholder="Cantidad" aria-label="Cantidad" style="flex:1;min-width:6rem"><button>Agregar</button></form>
  <h2>Pendientes</h2>${l.items.filter(i=>!i.done).map(row).join('')||empty('No falta nada en esta lista.')}
  ${done?`<h2>Comprados</h2>${l.items.filter(i=>i.done).map(row).join('')}`:''}
  <div class="row noprint" style="margin-top:1rem"><button class="sm ghost" data-act="share">Compartir</button><button class="sm ghost" data-act="copy">Copiar texto</button><button class="sm ghost" data-act="wa">WhatsApp</button><button class="sm ghost" data-act="print">Imprimir</button>
  <button class="sm ghost" data-act="dup">Duplicar</button><button class="sm ghost" data-act="clearDone">Vaciar comprados</button><button class="sm danger" data-act="delList">Eliminar lista</button></div>`;
}

function recordatorios(){
  const rs=[...S.reminders].sort((a,b)=>(a.done-b.done)||a.date.localeCompare(b.date));
  return `<h1>Avisos</h1><button data-act="newRem">Nuevo recordatorio</button>
  <p class="mut">Los avisos se muestran al abrir la app. Las notificaciones del navegador solo funcionan con la app abierta. Para que suene aunque esté cerrada, agregalo a tu calendario (.ics o Google Calendar).</p>
  ${rs.length?rs.map(r=>{const[c,t]=remState(r);return `<div class="card ${r.done?'done':''}"><div class="row sp"><strong class="t">${esc(r.title)}</strong><span class="${c}">${t}</span></div>
  <span class="mut">${fmtDate(r.date)}${r.time?' · '+r.time:''}${r.place?' · '+esc(r.place):''} · Avisar ${['el mismo día','1 día antes','','3 días antes','','','','1 semana antes'][r.advance]||r.advance+' días antes'}</span>
  <div class="row"><button class="sm" data-act="remDone" data-id="${r.id}">${r.done?'Reabrir':'Completar'}</button><button class="sm ghost" data-act="ics" data-id="${r.id}">Descargar .ics</button><a class="btn sm ghost" target="_blank" rel="noopener" href="${esc(gcalLink(r))}">Google Calendar</a>
  <button class="sm ghost" data-act="editRem" data-id="${r.id}">Editar</button><button class="sm danger" data-act="delRem" data-id="${r.id}">Eliminar</button></div></div>`}).join(''):empty('No hay recordatorios. Cargá un turno médico, un trámite o un cumpleaños.')}`;
}

function ajustes(){
  const perm=('Notification' in window)?Notification.permission:'no disponible';
  return `<h1>Ajustes</h1>
  <div class="card"><h2>Tema</h2><button class="ghost" data-act="theme">Cambiar entre claro y oscuro</button></div>
  <div class="card"><h2>Notificaciones del navegador</h2><p class="mut">Estado: ${perm}. Solo aparecen mientras Mi Casa está abierta.</p>${perm==='default'?'<button data-act="notif">Activar notificaciones</button>':''}</div>
  <div class="card"><h2>Copia de seguridad</h2><p class="mut">Tus datos viven solo en este navegador y dispositivo. Si borrás los datos del navegador, se pierden. Descargá una copia seguido.</p>
  <div class="row"><button data-act="export">Descargar copia (.json)</button><button class="ghost" data-act="csv">Exportar movimientos (.csv)</button>
  <label class="btn ghost" style="margin:0">Restaurar copia<input id="imp" type="file" accept="application/json" hidden></label></div></div>
  <div class="card"><h2>Reiniciar</h2><button class="danger" data-act="reset">Borrar todos los datos</button></div>
  <p class="mut">Sin cuentas, sin servidores, sin rastreadores. Moneda: ARS. Zona horaria: Córdoba.</p>`;
}

const views={inicio,dinero,compras,recordatorios,ajustes};
function render(){
  const v=location.hash.slice(2);const k=views[v]?v:'inicio';
  app.innerHTML=views[k]();
  document.querySelectorAll('nav a').forEach(a=>a.getAttribute('href')==='#/'+k?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current'));
}

/* ---------- Acciones ---------- */
async function editMov(type,m){
  type=type||m.type;const exp=type==='expense';
  const f=await ask(m?'Editar movimiento':exp?'Nuevo gasto':'Nuevo ingreso',[
    {name:'desc',label:exp?'Descripción':'Concepto',req:1},{name:'amount',label:'Importe en pesos (ej: 1500,50)',req:1,mode:'decimal'},
    {name:'date',label:'Fecha',type:'date',req:1},{name:'category',label:'Categoría',type:'select',options:CATS.map(c=>[c,c])},
    ...(exp?[{name:'status',label:'Estado',type:'select',options:[['paid','Pagado'],['pending','Pendiente (cuenta por pagar)']]}]:[]),
    {name:'notes',label:'Notas (opcional)'}],
    m?{...m,amount:inputValue(m.cents)}:{date:today(),category:'Otros',status:'paid'});
  if(!f)return;
  const cents=toCents(f.amount);if(!cents)throw new Error('El importe no es válido. Ejemplo: 1500,50');
  await put('movements',{id:m?.id??uid(),type,desc:f.desc.trim(),cents,date:f.date,category:f.category,status:exp?f.status:'paid',notes:f.notes,paidOn:exp&&f.status==='paid'?(m?.paidOn||today()):null});
}
const remFields=[{name:'title',label:'Título',req:1},{name:'date',label:'Fecha',type:'date',req:1},{name:'time',label:'Hora (opcional)',type:'time'},{name:'place',label:'Lugar (opcional)'},
  {name:'advance',label:'Avisarme',type:'select',options:[[0,'El mismo día'],[1,'Un día antes'],[3,'Tres días antes'],[7,'Una semana antes']]}];
const cur=()=>S.lists.find(l=>l.id===S.listId);
const item=id=>cur().items.find(i=>i.id===id);
const saveList=l=>put('lists',l);

const A={
  month:b=>{S.month=shiftMonth(S.month,+b.dataset.n)},
  addMov:b=>editMov(b.dataset.type),
  editMov:b=>editMov(null,S.movements.find(m=>m.id===b.dataset.id)),
  async delMov(b){if(confirm('¿Eliminar este movimiento?'))await del('movements',b.dataset.id)},
  async pay(b){const m=S.movements.find(m=>m.id===b.dataset.id);await put('movements',{...m,status:'paid',paidOn:today()})},
  async newList(){const f=await ask('Nueva lista',[{name:'name',label:'Nombre (ej: Supermercado)',req:1}]);if(!f)return;const l={id:uid(),name:f.name.trim(),items:[]};await saveList(l);S.listId=l.id;location.hash='#/compras'},
  openList:b=>{S.listId=b.dataset.id},back:()=>{S.listId=null},
  async toggle(b){const l=cur(),i=item(b.dataset.id);i.done=!i.done;await saveList(l)},
  async editItem(b){const l=cur(),i=item(b.dataset.id);const f=await ask('Editar producto',[{name:'name',label:'Producto',req:1},{name:'qty',label:'Cantidad (opcional)'},{name:'price',label:'Precio estimado (opcional)',mode:'decimal'},{name:'notes',label:'Notas (opcional)'}],{...i,price:i.price?inputValue(i.price):''});
    if(!f)return;let price=null;if(f.price.trim()){price=toCents(f.price);if(!price)throw new Error('El precio no es válido.')}Object.assign(i,{name:f.name.trim(),qty:f.qty,price,notes:f.notes});await saveList(l)},
  async delItem(b){const l=cur();l.items=l.items.filter(i=>i.id!==b.dataset.id);await saveList(l)},
  async clearDone(){const l=cur();if(confirm('¿Quitar los productos ya comprados?')){l.items=l.items.filter(i=>!i.done);await saveList(l)}},
  async dup(){const l=cur();const n={id:uid(),name:l.name+' (copia)',items:l.items.map(i=>({...i,id:uid(),done:false}))};await saveList(n);S.listId=n.id},
  async delList(){if(confirm('¿Eliminar la lista completa?')){await del('lists',S.listId);S.listId=null}},
  async share(){const t=listText(cur());if(navigator.share)await navigator.share({title:cur().name,text:t});else{await navigator.clipboard.writeText(t);toast('Tu navegador no puede compartir; copié el texto.')}},
  async copy(){await navigator.clipboard.writeText(listText(cur()));toast('Lista copiada.')},
  wa:()=>{window.open('https://wa.me/?text='+encodeURIComponent(listText(cur())),'_blank','noopener')},
  print:()=>window.print(),
  async newRem(){const f=await ask('Nuevo recordatorio',remFields,{date:today(),advance:1});if(!f)return;await put('reminders',{id:uid(),...f,title:f.title.trim(),advance:+f.advance,done:false});location.hash='#/recordatorios'},
  async editRem(b){const r=S.reminders.find(x=>x.id===b.dataset.id);const f=await ask('Editar recordatorio',remFields,r);if(f)await put('reminders',{...r,...f,advance:+f.advance})},
  async remDone(b){const r=S.reminders.find(x=>x.id===b.dataset.id);await put('reminders',{...r,done:!r.done})},
  async delRem(b){if(confirm('¿Eliminar este recordatorio?'))await del('reminders',b.dataset.id)},
  ics:b=>{const r=S.reminders.find(x=>x.id===b.dataset.id);download(`${r.title.replace(/\W+/g,'-')}.ics`,icsFor(r),'text/calendar')},
  theme:()=>{const t=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=t;localStorage.setItem('theme',t)},
  async notif(){const p=await Notification.requestPermission();toast(p==='granted'?'Notificaciones activadas (solo con la app abierta).':'No se activaron las notificaciones.',p!=='granted')},
  export:()=>download(`mi-casa-copia-${today()}.json`,JSON.stringify(makeBackup(S),null,1),'application/json'),
  csv:()=>{const q=v=>`"${String(v??'').replace(/"/g,'""')}"`;const rows=[['Fecha','Tipo','Descripción','Categoría','Estado','Importe ARS'],...[...S.movements].sort((a,b)=>a.date.localeCompare(b.date)).map(m=>[fmtDate(m.date),m.type==='income'?'Ingreso':'Gasto',m.desc,m.category,m.status==='paid'?'Pagado':'Pendiente',inputValue(m.cents)])];
    download('movimientos.csv','\ufeff'+rows.map(r=>r.map(q).join(';')).join('\r\n'),'text/csv')},
  async reset(){if(confirm('Esto borra TODOS tus datos de este dispositivo. ¿Seguir?')&&prompt('Escribí BORRAR para confirmar')==='BORRAR'){await replaceAll({movements:[],lists:[],reminders:[]});S.listId=null;toast('Datos borrados.')}}
};
const refresh=async()=>{await load();render()};
app.addEventListener('click',async e=>{const b=e.target.closest('[data-act]');if(!b||b.type==='checkbox'||!A[b.dataset.act])return;
  try{await A[b.dataset.act](b);await refresh()}catch(x){if(x.name!=='AbortError')toast(x.message||'No se pudo completar la acción.',true)}});
app.addEventListener('change',async e=>{const b=e.target;try{
  if(b.type==='checkbox'&&b.dataset.act){await A[b.dataset.act](b);await refresh()}
  if(b.id==='imp'&&b.files[0]){const data=validateBackup(JSON.parse(await b.files[0].text()));
    if(confirm(`La copia tiene ${data.movements.length} movimientos, ${data.lists.length} listas y ${data.reminders.length} recordatorios. Esto REEMPLAZA tus datos actuales. ¿Seguir?`)){await replaceAll(data);S.listId=null;await refresh();toast('Copia restaurada.')}}
}catch(x){toast(x instanceof SyntaxError?'El archivo no es un JSON válido.':x.message,true)}});
app.addEventListener('submit',async e=>{if(e.target.dataset.form!=='item')return;e.preventDefault();
  const f=Object.fromEntries(new FormData(e.target));const l=cur();l.items.push({id:uid(),name:f.name.trim(),qty:f.qty.trim(),price:null,notes:'',done:false});
  try{await saveList(l);await refresh();app.querySelector('[name=name]')?.focus()}catch(x){toast(x.message,true)}});

/* ---------- Inicio ---------- */
document.documentElement.dataset.theme=localStorage.getItem('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
addEventListener('hashchange',render);
(async()=>{
  try{await load()}catch(x){app.innerHTML='<p class="bad">No se pudo abrir el almacenamiento del navegador. Revisá que no estés en modo privado.</p>';return}
  render();
  if('Notification' in window&&Notification.permission==='granted'&&localStorage.getItem('notif')!==today()){
    const d=dueReminders();if(d.length){new Notification('Mi Casa',{body:d.map(r=>r.title).slice(0,3).join(', ')});localStorage.setItem('notif',today())}}
  if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
