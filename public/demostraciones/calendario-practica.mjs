// Adaptador local simulado: sin red, OAuth ni credenciales.
const negocios=["bahia-tours","barberia-elite","auto-servicio-bahia","taqueria-el-comal"];
export const admiteCalendario=(id,plan)=>negocios.includes(id)&&["p2","p3","p4"].includes(plan);
export const zonaCalendario="America/Mazatlan";
const texto=(v,max)=>typeof v==="string"&&v.length>0&&v.length<=max;
const fecha=v=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v+"T00:00:00Z").toISOString().slice(0,10)===v;
export function intervaloCalendario(d,inicio,duracion){if(!fecha(d)||!Number.isInteger(inicio)||inicio<0||inicio>=1440||!Number.isInteger(duracion)||duracion<1||duracion>1440)throw Error("Intervalo inválido.");const base=Date.parse(d+"T00:00:00Z");return {inicio:new Date(base+inicio*60000).toISOString().slice(0,19),fin:new Date(base+(inicio+duracion)*60000).toISOString().slice(0,19)};}
const local=v=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00$/.test(v)&&Number.isFinite(Date.parse(v+"Z"))&&new Date(v+"Z").toISOString().slice(0,19)===v;
export function eventoCalendario(d){if(!d||!texto(d.id,160)||!texto(d.titulo,140)||!local(d.inicio)||!local(d.fin)||d.fin<=d.inicio||Date.parse(d.fin+"Z")-Date.parse(d.inicio+"Z")>86400000||!Array.isArray(d.recursos)||d.recursos.length>8||d.recursos.some(x=>!texto(x,100)))throw Error("Evento inválido.");return {id:d.id,titulo:d.titulo,inicio:d.inicio,fin:d.fin,recursos:[...new Set(d.recursos)].sort(),zona:zonaCalendario};}
const solapa=(a,b)=>a.inicio<b.fin&&b.inicio<a.fin;
export function crearCalendarioPractica(storage,id,plan){
 if(!admiteCalendario(id,plan))throw Error("Calendario no disponible.");
 const key="lapaz:calendario:practica:v1:"+id+":"+plan,base=()=>({version:1,id,plan,conectado:false,porRecurso:false,eventos:[],externos:[],historial:[],fallo:false});
 function leer(){const raw=storage.getItem(key);if(raw===null)return base();if(raw.length>600000)throw Error("Calendario demasiado grande.");const d=JSON.parse(raw);if(d.version!==1||d.id!==id||d.plan!==plan||typeof d.conectado!=="boolean"||typeof d.porRecurso!=="boolean"||typeof d.fallo!=="boolean"||plan==="p2"&&d.porRecurso||!Array.isArray(d.eventos)||d.eventos.length>3000||!Array.isArray(d.externos)||d.externos.length>100||!Array.isArray(d.historial)||d.historial.length>50||plan!=="p4"&&d.externos.length)throw Error("Calendario inválido.");d.eventos=d.eventos.map(x=>{if(!texto(x.calendario,120)||x.clave!==JSON.stringify([x.calendario,x.id]))throw Error("Identificador inválido.");return {...eventoCalendario(x),calendario:x.calendario,clave:x.clave};});d.externos=d.externos.map(eventoCalendario);if(new Set(d.eventos.map(x=>x.clave)).size!==d.eventos.length||new Set(d.externos.map(x=>x.id)).size!==d.externos.length)throw Error("Eventos duplicados.");return d;}
 function guardar(d){const raw=JSON.stringify(d);if(raw.length>600000)throw Error("Límite local.");storage.setItem(key,raw);}
 function registro(d,x){d.historial=[x,...d.historial].slice(0,50);}
 function conectar(porRecurso=false){if(typeof porRecurso!=="boolean"||plan==="p2"&&porRecurso)throw Error("Calendarios por recurso desde P3.");const d=leer();d.conectado=true;d.porRecurso=porRecurso;guardar(d);}
 function desconectar(){const d=leer();d.conectado=false;d.eventos=[];d.externos=[];d.fallo=false;registro(d,{estado:"desconectado"});guardar(d);}
 function simularFallo(){const d=leer();if(!d.conectado)throw Error("Conecta la demostración.");d.fallo=true;guardar(d);}
 function sincronizar(lista){const d=leer();if(!d.conectado)throw Error("Conecta la demostración.");if(!Array.isArray(lista)||lista.length>500)throw Error("Lista inválida.");const fuente=lista.map(eventoCalendario);if(new Set(fuente.map(x=>x.id)).size!==fuente.length)throw Error("Fuente duplicada.");if(d.fallo){d.fallo=false;registro(d,{estado:"error_simulado"});guardar(d);return {estado:"error_simulado"};}
 const destino=fuente.flatMap(e=>["general",...(d.porRecurso?e.recursos.map(r=>"recurso:"+r):[])].map(calendario=>({...e,calendario,clave:JSON.stringify([calendario,e.id])})));if(destino.length>3000)throw Error("Demasiados eventos.");
 const antes=new Map(d.eventos.map(x=>[x.clave,x])),despues=new Map(destino.map(x=>[x.clave,x]));let creados=0,actualizados=0,eliminados=0;for(const e of destino){const a=antes.get(e.clave);if(!a)creados++;else if(JSON.stringify(a)!==JSON.stringify(e))actualizados++;}for(const k of antes.keys())if(!despues.has(k))eliminados++;
 d.eventos=destino;const resultado={estado:"sincronizado",creados,actualizados,eliminados};registro(d,resultado);guardar(d);return resultado;}
 function agregarExterno(x){if(plan!=="p4")throw Error("Disponible desde P4.");const d=leer();if(!d.conectado)throw Error("Conecta la demostración.");const e=eventoCalendario(x);if(d.externos.length>=100||d.externos.some(y=>y.id===e.id))throw Error("Bloqueo duplicado o límite.");d.externos.push(e);guardar(d);}
 function conflictos(lista){const d=leer();if(plan!=="p4"||!d.conectado)return [];return lista.map(eventoCalendario).flatMap(e=>d.externos.filter(b=>solapa(e,b)&&(!b.recursos.length||b.recursos.some(r=>e.recursos.includes(r)))).map(b=>({evento:e.id,bloqueo:b.id,titulo:e.titulo,inicio:e.inicio}))); }
 function quitarExterno(id){if(plan!=="p4")throw Error("Disponible desde P4.");const d=leer();d.externos=d.externos.filter(x=>x.id!==id);guardar(d);}
 return {key,leer,conectar,desconectar,simularFallo,sincronizar,agregarExterno,quitarExterno,conflictos};
}
// Enlace voluntario: no crea el evento ni transmite datos personales hasta que el visitante lo abre.
export function enlaceGoogleCalendario(e){const x=eventoCalendario(e),fmt=v=>v.replace(/[-:]/g,"");return "https://calendar.google.com/calendar/render?"+new URLSearchParams({action:"TEMPLATE",text:x.titulo,dates:fmt(x.inicio)+"/"+fmt(x.fin),ctz:zonaCalendario,details:"Evento ficticio de demostración. No es una reserva real."});}
