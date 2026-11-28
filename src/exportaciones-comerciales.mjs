// Internal, operator-authorized export; not a backup or a restore endpoint.
const id=x=>typeof x==="string"&&x.length>0&&x.length<=128;
const encoder=new TextEncoder(),MAX=1000,MAX_BYTES=2000000;
const hash=async t=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",encoder.encode(t))),x=>x.toString(16).padStart(2,"0")).join("");
// Explicit allowlist. No user identifiers, private employee contacts, invitation data, credentials or internal audit notes.
const tablas=[
 ["empresa","SELECT id,nombre,activa FROM empresas WHERE id=?"],
 ["perfil","SELECT empresa,giro,nombre_publico,descripcion,lema,color,color_secundario,color_acento,color_fondo,color_texto,logotipo,portada,zona_horaria,horario_semanal,excepciones_horario,presentacion,revision FROM comercio_perfiles_privados WHERE empresa=?"],
 ["sucursales","SELECT empresa,id,nombre,activa,revision,horario FROM sucursales WHERE empresa=? ORDER BY id"],
 ["principal","SELECT empresa,sucursal,revision FROM comercio_sucursal_principal WHERE empresa=?"],
 ["personal","SELECT empresa,id,codigo,nombre,puesto,especialidad,incorporacion,activo,revision FROM comercio_empleados WHERE empresa=? ORDER BY id"],
 ["servicios","SELECT empresa,id,codigo,nombre,activo,revision FROM comercio_servicios_personal WHERE empresa=? ORDER BY id"],
 ["asignaciones","SELECT empresa,empleado,revision,principal,sucursales,servicios,fecha FROM comercio_asignaciones_personal WHERE empresa=? ORDER BY empleado,revision"],
 ["turnos","SELECT empresa,empleado,revision,turnos,fecha FROM comercio_turnos_laborales WHERE empresa=? ORDER BY empleado,revision"],
 ["recursos","SELECT empresa,id,sucursal,codigo,nombre,tipo,activo,revision,horario,servicios FROM comercio_recursos_laborales WHERE empresa=? ORDER BY id"],
 ["roles","SELECT empresa,id,nombre FROM roles WHERE empresa=? ORDER BY id"],
 ["permisos","SELECT empresa,rol,permiso FROM rol_permisos WHERE empresa=? ORDER BY rol,permiso"],
 ["contrato","SELECT empresa,plan,version,fecha FROM comercial_contratos_iniciales WHERE empresa=?"],
 ["suscripcion","SELECT empresa,plan,version,estado,inicio,vence,revision FROM comercial_suscripciones WHERE empresa=?"],
 ["historial_contractual","SELECT empresa,revision,plan,version,estado,inicio,vence,fecha FROM comercial_suscripcion_historial WHERE empresa=? ORDER BY revision"],
 ["activacion","SELECT empresa,revision,modulos,fecha FROM comercial_activaciones WHERE empresa=?"],
 ["ciclo","SELECT empresa,revision,anterior,posterior,accion,fecha FROM comercial_ciclo_vida WHERE empresa=? ORDER BY revision"],
 ["finanzas","SELECT empresa,sucursal,id,fecha,tipo,importe,metodo,original FROM comercio_movimientos_financieros WHERE empresa=? ORDER BY fecha,id"]
];
export const politicaConservacionPropuesta=Object.freeze({estado:"borrador",diasDisponibilidadExportacion:90,borradoAutomatico:false,retencionFinanciera:"pendiente_de_validacion_legal"});
// Protect spreadsheet consumers from formula execution, including leading whitespace and control characters.
export function celdaCSV(v){
 let s=v==null?"":String(v);
 if(/^[\s\u0000-\u001f]*[=+@-]/u.test(s)||/^[\t\r\n]/.test(s))s="'"+s;
 return '"'+s.replaceAll('"','""')+'"';
}
function serializar(datos,formato,empresa,fecha){
 if(formato==="json")return JSON.stringify({formato:"lapaz-exportacion-v1",empresa,fecha,moneda:"MXN",importes:"centavos",datos});
 // One rectangular CSV, table discriminator and union of allowlisted fields.
 const campos=[...new Set(Object.values(datos).flatMap(rows=>rows.flatMap(Object.keys)))];
 return [["tabla",...campos].map(celdaCSV).join(","),...Object.entries(datos).flatMap(([tabla,rows])=>rows.map(r=>[tabla,...campos.map(k=>r[k])].map(celdaCSV).join(",")))].join("\r\n");
}
export async function crearExportacionesComerciales(env,{habilitado=false,autenticarCentral,reloj=Date.now}={}){
 const db=env.COMMERCE_DB;
 if(!db||[env.DB,env.DEMO_DB,env.PROVIDER_DB].includes(db)||typeof autenticarCentral!=="function")throw Error("Exportación no configurada.");
 if(!(await db.prepare("SELECT clave FROM comercio_identidad WHERE clave='lapaz-comercios-v1'").first()))throw Error("Esquema incorrecto.");
 const q=(s,...a)=>db.prepare(s).bind(...a);
 const guard="SELECT o.id FROM central_operadores o JOIN central_sesiones s ON s.operador=o.id WHERE o.emisor=? AND o.sujeto=? AND s.hash=? AND o.activo=1 AND o.rol='administrador' AND s.revocado IS NULL AND s.expira>? AND s.ultima>? AND (?=0 OR s.creado>?)";
 async function contexto(r,empresa,metodo){
  if(habilitado!==true||!id(empresa)||r.method!==metodo||new URL(r.url).protocol!=="https:"||metodo==="POST"&&r.headers.get("Origin")!==new URL(r.url).origin)throw Error("Exportación no autorizada.");
  const a=await autenticarCentral(r),c=(r.headers.get("Cookie")||"").split(";").map(x=>x.trim()).filter(x=>x.startsWith("__Host-lapaz-central=")),t=c.length===1?c[0].slice("__Host-lapaz-central=".length):"",n=reloj();
  if(!id(a?.emisor)||!id(a?.sujeto)||!/^[a-f0-9]{64}$/.test(t)||!Number.isSafeInteger(n)||n<0)throw Error("Exportación no autorizada.");
  const args=[a.emisor,a.sujeto,await hash(t),n,n-600000,metodo==="POST"?1:0,n-300000];
  if(!await q(guard,...args).first())throw Error("Exportación no autorizada.");return {n,args};
 }
 return Object.freeze({
 async exportar(r,d){
  const a=await contexto(r,d?.empresa,"POST");
  if(!["json","csv"].includes(d.formato)||typeof d.motivo!=="string"||!d.motivo.trim()||d.motivo.length>1000||Object.keys(d).some(k=>!["empresa","formato","motivo"].includes(k)))throw Error("Solicitud inválida.");
  const permiso=" AND ("+guard+") IS NOT NULL AND EXISTS(SELECT 1 FROM comercial_contratos_iniciales WHERE empresa=?)";
  const rs=await db.batch(tablas.map(([,sql])=>{const i=sql.indexOf(" ORDER BY");const consulta=i<0?sql+permiso:sql.slice(0,i)+permiso+sql.slice(i);return q(consulta+" LIMIT "+(MAX+1),d.empresa,...a.args,d.empresa);}));
  const datos=Object.fromEntries(tablas.map(([k],i)=>[k,rs[i].results]));
  if(datos.empresa.length!==1||datos.contrato.length!==1||Object.values(datos).some(x=>!Array.isArray(x)||x.length>MAX))throw Error("Exportación no disponible o excede límite.");
  const payload=serializar(datos,d.formato,d.empresa,a.n),bytes=encoder.encode(payload).length;
  if(bytes>MAX_BYTES)throw Error("Exportación excede límite.");
  const sha256=await hash(payload),k=crypto.randomUUID();
  // Recheck live authorization before releasing payload. Audit failure means no release.
  const b=await contexto(r,d.empresa,"POST");
  const fila=await q("INSERT INTO comercio_exportaciones(id,empresa,operador,fecha,formato,motivo,sha256,bytes) SELECT ?,k.empresa,("+guard+"),?,?,?,?,? FROM comercial_contratos_iniciales k WHERE k.empresa=? AND ("+guard+") IS NOT NULL RETURNING id",k,...b.args,b.n,d.formato,d.motivo.trim(),sha256,bytes,d.empresa,...b.args).first();
  if(!fila)throw Error("Exportación no autorizada.");
  return {id:k,empresa:d.empresa,formato:d.formato,payload,sha256,bytes,conteos:Object.fromEntries(Object.entries(datos).map(([k,v])=>[k,v.length]))};
 },
 async historial(r,{empresa}={}){const a=await contexto(r,empresa,"GET");return (await q("SELECT id,fecha,formato,motivo,sha256,bytes,operador FROM comercio_exportaciones WHERE empresa=? AND ("+guard+") IS NOT NULL ORDER BY fecha DESC,id LIMIT 50",empresa,...a.args).all()).results;}
 });
}
