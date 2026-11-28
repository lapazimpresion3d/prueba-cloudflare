import {planes} from "./config.mjs";
import {inspeccionarJpeg} from "./seguridad-imagen.mjs";
// Fuente única del catálogo turístico de práctica, separada por paquete.
export const experiencias=Object.freeze([
 Object.freeze({id:"espiritu",es:"Isla Espíritu Santo",en:"Espíritu Santo Island",descEs:"Recorrido de ejemplo por playas y paisajes insulares.",descEn:"Sample excursion around island beaches and landscapes.",duracion:6,adulto:150000,menor:90000,cupo:10,hora:"09:00"}),
 Object.freeze({id:"bahia",es:"Paseo por la bahía",en:"Bay cruise",descEs:"Recorrido panorámico de ejemplo por la costa.",descEn:"Sample scenic cruise along the coast.",duracion:3,adulto:85000,menor:50000,cupo:8,hora:"10:00"}),
 Object.freeze({id:"atardecer",es:"Atardecer en el mar",en:"Sunset cruise",descEs:"Paseo costero de ejemplo al atardecer.",descEn:"Sample coastal cruise at sunset.",duracion:2,adulto:65000,menor:40000,cupo:6,hora:"17:00"})
]);
export const camposBilingues=["itinerario","incluye","extras","requisitos","encuentro","cancelacion"];
const clone=x=>JSON.parse(JSON.stringify(x));
const texto=(v,max,min=0)=>{if(typeof v!=="string"||v.trim().length<min||v.trim().length>max)throw Error("Revisa los textos bilingües.");return v.trim();};
const entero=(v,min,max)=>{if(!Number.isSafeInteger(v)||v<min||v>max)throw Error("Revisa tarifas, duración y cupos.");return v;};
export function fechaTurismo(v){return typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v+"T00:00:00Z").toISOString().slice(0,10)===v;}
export function validarExperiencia(d){
 if(!d||!(/^[a-z0-9-]{1,60}$/).test(d.id)||!["compartido","privado"].includes(d.modalidad)||typeof d.publicada!=="boolean"||typeof d.disponible!=="boolean"||!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.hora))throw Error("Experiencia inválida.");
 const v={id:d.id,es:texto(d.es,100,1),en:texto(d.en,100,1),descEs:texto(d.descEs,1000,1),descEn:texto(d.descEn,1000,1),duracion:entero(d.duracion,1,24),adulto:entero(d.adulto,0,100000000),menor:entero(d.menor,0,100000000),cupo:entero(d.cupo,1,50),hora:d.hora,modalidad:d.modalidad,publicada:d.publicada,disponible:d.disponible};
 for(const k of camposBilingues){v[k+"Es"]=texto(d[k+"Es"]??"",1500);v[k+"En"]=texto(d[k+"En"]??"",1500);if(Boolean(v[k+"Es"])!==Boolean(v[k+"En"]))throw Error("Completa ambos idiomas de "+k+".");}
 if(!Array.isArray(d.fotos)||d.fotos.length>3)throw Error("Máximo tres fotos.");v.fotos=d.fotos.map(x=>{inspeccionarJpeg(x,{maximo:100000,lado:1000});return x;});
 if(!Array.isArray(d.temporadas)||d.temporadas.length>12)throw Error("Máximo doce temporadas.");v.temporadas=d.temporadas.map(t=>{if(!fechaTurismo(t.inicio)||!fechaTurismo(t.fin)||t.inicio>t.fin)throw Error("Fechas de temporada inválidas.");return {inicio:t.inicio,fin:t.fin,adulto:entero(t.adulto,0,100000000),menor:entero(t.menor,0,100000000)};}).sort((a,b)=>a.inicio.localeCompare(b.inicio));for(let i=1;i<v.temporadas.length;i++)if(v.temporadas[i].inicio<=v.temporadas[i-1].fin)throw Error("Las temporadas no pueden superponerse.");
 return v;
}
export function semillaTurismo(){return experiencias.map(e=>validarExperiencia({...e,modalidad:"compartido",publicada:true,disponible:true,fotos:[],temporadas:[]}));}
export function tarifaTurismo(e,fecha){const t=e.temporadas?.find(x=>fecha>=x.inicio&&fecha<=x.fin);return {adulto:t?.adulto??e.adulto,menor:t?.menor??e.menor};}
export function crearCatalogoTurismo(storage,plan){
 if(!planes.some(p=>p.id===plan))throw Error("Paquete desconocido.");const key="lapaz:turismo:catalogo:v1:"+plan;
 function leer(){const raw=storage.getItem(key);if(raw===null)return semillaTurismo();if(raw.length>1500000)throw Error("Catálogo demasiado grande.");const d=JSON.parse(raw);if(d.version!==1||d.plan!==plan||!Array.isArray(d.items)||d.items.length>30)throw Error("Catálogo inválido.");const items=d.items.map(validarExperiencia);if(new Set(items.map(x=>x.id)).size!==items.length)throw Error("Experiencias duplicadas.");return items;}
 function guardar(d){const items=leer(),v=validarExperiencia(d),i=items.findIndex(x=>x.id===v.id);if(i<0&&items.length>=30)throw Error("Máximo treinta experiencias.");if(i<0)items.push(v);else items[i]=v;const raw=JSON.stringify({version:1,plan,items});if(raw.length>1500000)throw Error("Límite local de imágenes alcanzado.");storage.setItem(key,raw);return clone(v);}
 return {key,leer,guardar,crear(d){const items=leer();let n=1;while(items.some(x=>x.id==="tour-"+n))n++;return guardar({...d,id:"tour-"+n});},publicadas(){return leer().filter(x=>x.publicada);}};
}
