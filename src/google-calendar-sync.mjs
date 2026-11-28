// Server-only reconciliation. Inject authenticated tenant source and durable leased store.
// Never deletes events not owned by this integration.
const enc=new TextEncoder();
const local=x=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(x)&&Number.isFinite(Date.parse(x+"Z"))&&new Date(x+"Z").toISOString().slice(0,19)===x;
const texto=(x,n)=>typeof x==="string"&&x.length>0&&x.length<=n&&!/[\x00-\x1f]/.test(x);
export async function idEventoGoogle(empresa,calendario,origen){const bytes=new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(JSON.stringify(["lapaz-calendar-v1",empresa,calendario,origen]))));return Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");}
export function crearSincronizadorGoogle({almacen,fuente,cliente,crearCliente,habilitado=false}){
 return async function sincronizar(empresa){if(!habilitado)throw Error("Sincronización deshabilitada.");const l=await almacen.reservar(empresa);if(!l)return {estado:"ocupado"};try{
 const cfg=await almacen.configuracion(l);if(!cfg?.activo||!["p2","p3","p4"].includes(cfg.plan))return {estado:"no_disponible"};
 const datos=await fuente(empresa);if(datos?.empresa!==empresa||datos.completa!==true||!Array.isArray(datos.eventos)||datos.eventos.length>500)throw Error("Fuente incompleta.");
 const deseados=new Map();for(const e of datos.eventos){if(!texto(e.id,160)||!texto(e.titulo,140)||!Array.isArray(e.recursos)||e.recursos.length>8||e.recursos.some(r=>!texto(r,128))||!local(e.inicio)||!local(e.fin)||e.fin<=e.inicio)throw Error("Evento inválido.");const destinos=[cfg.general,...(cfg.plan==="p2"?[]:e.recursos.map(r=>Object.hasOwn(cfg.recursos??{},r)?cfg.recursos[r]:null).filter(Boolean))];for(const cal of new Set(destinos)){if(!cal)throw Error("Calendario no seleccionado.");const id=await idEventoGoogle(empresa,cal,e.id),clave=JSON.stringify([cal,id]);if(deseados.has(clave))throw Error("Evento duplicado.");deseados.set(clave,{cal,id,body:{id,summary:e.titulo.slice(0,140),start:{dateTime:e.inicio,timeZone:"America/Mazatlan"},end:{dateTime:e.fin,timeZone:"America/Mazatlan"},extendedProperties:{private:{lapaz:id}}}});}}
 if(deseados.size>100)throw Error("Límite de sincronización; requiere segmentación.");
 const remoto=crearCliente?await crearCliente(empresa,l):cliente;const prev=await almacen.eventos(l);let altas=0,bajas=0;for(const [clave,e] of deseados){await remoto.upsertPropio(empresa,e.cal,e.id,e.body);await almacen.registrar(l,clave,e.cal,e.id);altas++;}for(const p of prev){if(!deseados.has(p.clave)){await remoto.eliminarPropio(empresa,p.cal,p.id);await almacen.retirar(l,p.clave);bajas++;}}
 await almacen.resultado(l,"sincronizado");return {estado:"sincronizado",procesados:altas,retirados:bajas};
 }catch{await almacen.resultado(l,"reintentar");return {estado:"reintentar"};}finally{await almacen.liberar(l);}};
}
