import {crearFlujoOidc} from "./flujo-oidc.mjs";
import {crearSesionesComerciales,hashSesionComercial} from "./sesiones-comerciales.mjs";
import {crearNucleoComercial} from "./nucleo-comercial.mjs";
// Internal adapter. No HTTP routes. Identity can only originate from consumed OIDC callback.
export async function crearAccesoComercial(env,{habilitado=false,config,reloj=Date.now,transporte=fetch}={}){
 const flujo=await crearFlujoOidc(env,{habilitado,config,reloj,transporte}),db=env.COMMERCE_DB;
 const sesiones=await crearSesionesComerciales(env,{habilitado,reloj,exigirMembresia:true,verificarIdentidad:async()=>null});
 const nucleo=await crearNucleoComercial(env,{autenticar:sesiones.autenticar});
 const origen=new URL(config.retorno).origin;
 const exigir=(r,metodo)=>{if(habilitado!==true||r.method!==metodo||new URL(r.url).origin!==origen||metodo==="POST"&&r.headers.get("Origin")!==origen)throw Error("Acceso no permitido.");};
 const q=(s,...a)=>db.prepare(s).bind(...a);
 const guard="EXISTS(SELECT 1 FROM comercio_sesiones cs JOIN usuarios u ON u.id=cs.usuario WHERE cs.hash=? AND cs.usuario=m.usuario AND u.activo=1 AND cs.revocado IS NULL AND cs.expira>? AND cs.ultima>?)";
 const alcance="(m.alcance='empresa' OR EXISTS(SELECT 1 FROM membresia_sucursales ms JOIN sucursales b ON b.empresa=ms.empresa AND b.id=ms.sucursal AND b.activa=1 WHERE ms.empresa=m.empresa AND ms.usuario=m.usuario))";
 return Object.freeze({
 async iniciar(r){exigir(r,"POST");return flujo.iniciar(r,{central:false});},
 async completar(r){
  exigir(r,"GET");const resultado=await flujo.completar(r);
  if(resultado.contexto!=="comercial")throw Error("Acceso no permitido.");
  // A private synthetic request is used only to adapt the existing session interface.
  // Verified identity is scoped to this one call; never read it from HTTP data.
  const interno=new Request(origen+"/__interno/sesion",{method:"POST",headers:{Origin:origen}});
  const emisor=await crearSesionesComerciales(env,{habilitado,reloj,exigirMembresia:true,verificarIdentidad:async r=>r===interno?resultado.identidad:null});
  const sesion=await emisor.iniciar(interno);
  return {cookies:[resultado.cookie,sesion.cookie],expira:sesion.expira};
 },
 async empresas(r){
  exigir(r,"GET");const a=await sesiones.autenticar(r);if(!a)throw Error("Autenticación requerida.");const h=await hashSesionComercial(r),n=reloj();
  const filas=await q("SELECT e.id,e.nombre,m.rol,m.alcance,COALESCE(s.estado,'sin_contratar') AS estado,s.plan,s.inicio,s.vence FROM membresias m JOIN empresas e ON e.id=m.empresa LEFT JOIN comercial_suscripciones s ON s.empresa=e.id WHERE m.usuario=? AND m.activa=1 AND e.activa=1 AND "+alcance+" AND "+guard+" ORDER BY e.id LIMIT 101",a.actor,h,n,n-1800000).all();
  if(filas.results.length>100)throw Error("Límite de empresas excedido.");
  return filas.results.map(({inicio,vence,...x})=>({...x,vigente:["prueba","activa"].includes(x.estado)&&inicio<=n&&vence>n}));
 },
 async seleccionar(r,{empresa,sucursal=null}={}){
  exigir(r,"POST");const a=await nucleo.autorizar(r,{empresa,sucursal,permiso:"empresa.ver"});const h=await hashSesionComercial(r),n=reloj();
  const x=await q("SELECT s.plan,s.estado,s.inicio,s.vence FROM comercial_suscripciones s JOIN membresias m ON m.empresa=s.empresa JOIN empresas e ON e.id=m.empresa WHERE s.empresa=? AND m.usuario=? AND m.activa=1 AND e.activa=1 AND "+guard+" AND ((? IS NULL AND m.alcance='empresa') OR (? IS NOT NULL AND EXISTS(SELECT 1 FROM sucursales b WHERE b.empresa=m.empresa AND b.id=? AND b.activa=1) AND (m.alcance='empresa' OR EXISTS(SELECT 1 FROM membresia_sucursales ms WHERE ms.empresa=m.empresa AND ms.usuario=m.usuario AND ms.sucursal=?))))",empresa,a.actor,h,n,n-1800000,sucursal,sucursal,sucursal,sucursal).first();
  if(!x||!["prueba","activa"].includes(x.estado)||x.inicio>n||x.vence<=n)throw Error("Suscripción no vigente.");
  return {empresa,sucursal,plan:x.plan,estado:x.estado};
 },
 async cerrar(r){exigir(r,"POST");return sesiones.cerrar(r);},
 async listarSesiones(r){exigir(r,"GET");return sesiones.listar(r);},
 async revocarOtra(r,id){exigir(r,"POST");return sesiones.revocarOtra(r,id);},
 async revocarTodas(r){exigir(r,"POST");return sesiones.revocarTodas(r);}
 });
}
