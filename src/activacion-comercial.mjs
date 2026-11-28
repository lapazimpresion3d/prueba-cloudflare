import {resolverCompatibilidad,reglasModulosV1} from "./compatibilidad-modulos.mjs";
import {idsModulos} from "./catalogo-contractual.mjs";
const id=x=>typeof x==="string"&&x.length>0&&x.length<=128;
const lista=x=>Array.isArray(x)&&x.length<=idsModulos.length&&new Set(x).size===x.length&&x.every(m=>idsModulos.includes(m));
const hash=async t=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t))),x=>x.toString(16).padStart(2,"0")).join("");
// Closed selection: dependencies must be explicitly included; removing a prerequisite requires removing its dependants.
export function validarSeleccion({giro,contratados,operativos,seleccion}){
 if(!lista(seleccion))throw Error("Selección inválida.");
 const mapa=resolverCompatibilidad({giro,contratados,operativos}).modulos;
 const s=new Set(seleccion);
 if(seleccion.some(m=>!mapa.find(x=>x.id===m)?.disponibleTecnico||!reglasModulosV1[m].depende.every(d=>s.has(d))))throw Error("Módulo o dependencia no disponible.");
 return idsModulos.filter(m=>s.has(m));
}
export async function crearActivacionComercial(env,{habilitado=false,autenticarCentral,reloj=Date.now,operativos=[]}={}){
 const db=env.COMMERCE_DB;
 if(!db||[env.DB,env.DEMO_DB,env.PROVIDER_DB].includes(db)||typeof autenticarCentral!=="function"||!lista(operativos))throw Error("Activación no configurada.");
 if(!(await db.prepare("SELECT clave FROM comercio_identidad WHERE clave='lapaz-comercios-v1'").first()))throw Error("Esquema incorrecto.");
 const disponibles=Object.freeze([...operativos]),q=(s,...a)=>db.prepare(s).bind(...a);
 const guard="SELECT o.id FROM central_operadores o JOIN central_sesiones s ON s.operador=o.id WHERE o.emisor=? AND o.sujeto=? AND s.hash=? AND o.activo=1 AND s.revocado IS NULL AND s.expira>? AND s.ultima>? AND s.creado>?";
 async function central(r){
  if(habilitado!==true||r.method!=="POST"||new URL(r.url).protocol!=="https:"||r.headers.get("Origin")!==new URL(r.url).origin)throw Error("Activación no autorizada.");
  const a=await autenticarCentral(r),c=(r.headers.get("Cookie")||"").split(";").map(x=>x.trim()).filter(x=>x.startsWith("__Host-lapaz-central=")),t=c.length===1?c[0].slice("__Host-lapaz-central=".length):"",n=reloj();
  if(!id(a?.emisor)||!id(a?.sujeto)||!/^[a-f0-9]{64}$/.test(t)||!Number.isSafeInteger(n)||n<0)throw Error("Activación no autorizada.");
  return {n,args:[a.emisor,a.sujeto,await hash(t),n,n-600000,n-300000]};
 }
 const contexto=" FROM comercial_contratos_iniciales k JOIN comercial_planes p ON p.id=k.plan AND p.version=k.version JOIN comercio_altas_pendientes z ON z.id=k.alta AND z.empresa=k.empresa JOIN empresas e ON e.id=k.empresa WHERE k.empresa=? AND e.activa=1 AND z.estado='aceptada' AND EXISTS(SELECT 1 FROM membresias m JOIN usuarios u ON u.id=m.usuario WHERE m.empresa=e.id AND m.rol='propietario' AND m.activa=1 AND m.alcance='empresa' AND u.activo=1) AND (SELECT count(*) FROM membresias WHERE empresa=e.id AND activa=1)<=p.usuarios AND (SELECT count(*) FROM sucursales WHERE empresa=e.id AND activa=1)<=p.sucursales";
 return Object.freeze({async guardar(r,d){
  const {n,args}=await central(r);
  if(!id(d?.empresa)||!Number.isSafeInteger(d.revision)||d.revision<0||!lista(d.modulos)||Object.keys(d).some(k=>!["empresa","revision","modulos","inicio","vence"].includes(k)))throw Error("Activación inválida.");
  if(d.revision===0?(!Number.isSafeInteger(d.inicio)||!Number.isSafeInteger(d.vence)||d.inicio<0||d.inicio>n||d.vence<=n||!d.modulos.length):(Object.hasOwn(d,"inicio")||Object.hasOwn(d,"vence")))throw Error("Vigencia inválida.");
  const x=await q("SELECT k.plan,k.version,p.modulos,z.giro"+contexto+" AND ("+guard+") IS NOT NULL",d.empresa,...args).first();
  if(!x)throw Error("Contrato no disponible.");
  const seleccion=JSON.stringify(validarSeleccion({giro:x.giro,contratados:JSON.parse(x.modulos),operativos:disponibles,seleccion:d.modulos}));
  const filtro="EXISTS(SELECT 1"+contexto+" AND k.plan=? AND k.version=? AND z.giro=?)";
  const f=[d.empresa,x.plan,x.version,x.giro];
  const stm=[];
  if(d.revision===0){
   stm.push(q("INSERT INTO comercial_activaciones(empresa,revision,modulos,operador,fecha) SELECT ?,1,?,("+guard+"),? WHERE "+filtro+" AND NOT EXISTS(SELECT 1 FROM comercial_suscripciones WHERE empresa=?) AND ("+guard+") IS NOT NULL ON CONFLICT(empresa) DO NOTHING RETURNING revision",d.empresa,seleccion,...args,n,...f,d.empresa,...args));
   stm.push(q("INSERT INTO comercial_suscripciones(empresa,plan,version,estado,inicio,vence,revision) SELECT ?,?,?,'activa',?,?,1 WHERE changes()=1",d.empresa,x.plan,x.version,d.inicio,d.vence));
  }else{
   stm.push(q("UPDATE comercial_activaciones SET revision=revision+1,modulos=?,operador=("+guard+"),fecha=? WHERE empresa=? AND revision=? AND "+filtro+" AND ("+guard+") IS NOT NULL AND EXISTS(SELECT 1 FROM comercial_suscripciones s WHERE s.empresa=comercial_activaciones.empresa AND s.plan=? AND s.version=? AND s.estado IN ('activa','prueba') AND s.inicio<=? AND s.vence>?) RETURNING revision",seleccion,...args,n,d.empresa,d.revision,...f,...args,x.plan,x.version,n,n));
  }
  stm.push(q("INSERT INTO central_auditoria(actor,empresa,accion,objetivo,fecha,posterior) SELECT operador,empresa,'modulos.activacion',empresa,fecha,json_object('revision',revision,'modulos',json(modulos)) FROM comercial_activaciones WHERE empresa=? AND revision=? AND changes()=1",d.empresa,d.revision+1));
  const res=await db.batch(stm);
  if(!res[0].results?.length)throw Error("Conflicto de activación o autorización.");
  return {empresa:d.empresa,revision:d.revision+1,modulos:JSON.parse(seleccion)};
 }});
}
