// Pure civil-time rules. Monday=0; intervals [start,end) in minutes.
// end may exceed 1440 for overnight opening; exceptions replace the entire civil date.
const error=()=>{throw Error("Horario inválido.");};
const fechaValida=x=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&x>="1900-01-01"&&x<="9998-12-31"&&Number.isFinite(Date.parse(x+"T00:00:00Z"))&&new Date(x+"T00:00:00Z").toISOString().slice(0,10)===x;
const mover=(f,d)=>new Date(Date.parse(f+"T00:00:00Z")+d*86400000).toISOString().slice(0,10);
const dia=f=>(new Date(f+"T00:00:00Z").getUTCDay()+6)%7;
function intervalos(a,maxFin){
 if(!Array.isArray(a)||a.length>8)error();
 const r=a.map(x=>{
  if(!Array.isArray(x)||x.length!==2||!x.every(Number.isSafeInteger)||x[0]<0||x[0]>=1440||x[1]<=x[0]||x[1]>maxFin||x[1]-x[0]>1440)error();
  return [...x];
 }).sort((a,b)=>a[0]-b[0]);
 if(r.some((x,i)=>i>0&&x[0]<r[i-1][1]))error();
 return r;
}
function formato(z){
 if(typeof z!=="string"||z.length>100||!(/^(?:[A-Za-z_]+(?:\/[A-Za-z0-9_+\-]+)+|UTC)$/.test(z)))error();
 try{return new Intl.DateTimeFormat("en-CA",{timeZone:z,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});}catch{error();}
}
export function validarHorario({zona_horaria,horario_semanal,excepciones_horario}={}){
 const fmt=formato(zona_horaria);
 if(!Array.isArray(horario_semanal)||horario_semanal.length!==7||!excepciones_horario||typeof excepciones_horario!=="object"||Array.isArray(excepciones_horario)||Object.keys(excepciones_horario).length>366)error();
 const semana=horario_semanal.map(a=>intervalos(a,2880));
 for(let i=0;i<7;i++){
  const arrastre=semana[(i+6)%7].filter(x=>x[1]>1440);
  if(arrastre.some(x=>semana[i].some(y=>y[0]<x[1]-1440)))error();
 }
 const excepciones=Object.fromEntries(Object.entries(excepciones_horario).sort().map(([f,a])=>{if(!fechaValida(f))error();return [f,intervalos(a,1440)];}));
 return {zona_horaria:fmt.resolvedOptions().timeZone,horario_semanal:semana,excepciones_horario:excepciones};
}
function tramos(h,f){
 if(Object.hasOwn(h.excepciones_horario,f))return h.excepciones_horario[f];
 const prev=mover(f,-1),a=h.horario_semanal[dia(f)].map(([i,j])=>[i,Math.min(j,1440)]);
 // A previous-day exception has no overnight carry. A current-day exception suppresses all carry.
 if(!Object.hasOwn(h.excepciones_horario,prev))for(const [i,j] of h.horario_semanal[dia(prev)])if(j>1440)a.push([0,j-1440]);
 return a.sort((x,y)=>x[0]-y[0]);
}
const civil=(fmt,t)=>{
 const p=Object.fromEntries(fmt.formatToParts(t).map(x=>[x.type,x.value]));
 return {fecha:p.year+"-"+p.month+"-"+p.day,minuto:Number(p.hour)*60+Number(p.minute)};
};
const abierto=(h,c)=>tramos(h,c.fecha).some(([i,j])=>i<=c.minuto&&c.minuto<j);
// Next opening expressed as actual UTC instant: minute scan only within candidate civil days.
// Bound search to 374 days (366 exceptions + 7 weekly days + margin).
export function estadoHorario(config,instante){
 const h=validarHorario(config),fmt=formato(h.zona_horaria);
 if(!Number.isSafeInteger(instante)||!Number.isFinite(new Date(instante).getTime()))error();
 const c=civil(fmt,instante);if(!fechaValida(c.fecha))error();
 if(abierto(h,c))return {abierto:true,proxima_apertura:null,fecha_local:c.fecha,minuto_local:c.minuto};
 let proxima=null;
 // Use civil candidate days to skip closed days; scan UTC window around candidate date.
 // UTC offsets are within +/- 24h; scan minutes monotonically from now for each candidate.
 for(let d=0;d<=374;d++){
  const f=mover(c.fecha,d),a=tramos(h,f);
  if(!a.length)continue;
  const centro=Date.parse(f+"T00:00:00Z"),inicio=Math.max(Math.floor(instante/60000)*60000+60000,centro-86400000),fin=centro+172800000;
  for(let t=inicio;t<fin;t+=60000){
   const v=civil(fmt,t);
   if(v.fecha===f&&a.some(([i,j])=>i<=v.minuto&&v.minuto<j)){proxima=t;break;}
  }
  if(proxima!==null)break;
 }
 return {abierto:false,proxima_apertura:proxima,fecha_local:c.fecha,minuto_local:c.minuto};
}

// Compile once for bounded availability queries; do not search next opening for each minute.
export function compilarHorario(config){
 const h=validarHorario(config),fmt=formato(h.zona_horaria);
 return instante=>{if(!Number.isSafeInteger(instante)||!Number.isFinite(new Date(instante).getTime()))error();const c=civil(fmt,instante);return abierto(h,c);};
}
