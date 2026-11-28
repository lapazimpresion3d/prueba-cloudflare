// Central read-only dossier, isolated from demo and payment services.
const id=x=>typeof x==="string"&&x.length>0&&x.length<=128;
const hash=async t=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t))),x=>x.toString(16).padStart(2,"0")).join("");
const estados=["sin_contratar","programada","vencida","prueba","activa","suspendida","cancelada"];
const giros=["restaurante","cafeteria","tienda","barberia","taller","otro"];
const planes=["p1","p2","p3","p4"];
const estado="CASE WHEN s.empresa IS NULL THEN 'sin_contratar' WHEN s.estado IN ('suspendida','cancelada') THEN s.estado WHEN s.inicio>? THEN 'programada' WHEN s.vence<=? THEN 'vencida' ELSE s.estado END";
const base=" FROM empresas e LEFT JOIN comercio_perfiles_privados f ON f.empresa=e.id LEFT JOIN comercial_suscripciones s ON s.empresa=e.id LEFT JOIN comercial_planes p ON p.id=s.plan AND p.version=s.version LEFT JOIN central_implementaciones i ON i.empresa=e.id";
export async function crearDirectorioCentral(env,{habilitado=false,autenticarCentral,reloj=Date.now}={}){
 const db=env.COMMERCE_DB;
 if(!db||[env.DB,env.DEMO_DB,env.PROVIDER_DB].includes(db)||typeof autenticarCentral!=="function")throw Error("Directorio no configurado.");
 if(!(await db.prepare("SELECT clave FROM comercio_identidad WHERE clave='lapaz-comercios-v1'").first()))throw Error("Esquema incorrecto.");
 const guard="EXISTS(SELECT 1 FROM central_operadores o JOIN central_sesiones cs ON cs.operador=o.id WHERE o.emisor=? AND o.sujeto=? AND cs.hash=? AND o.activo=1 AND o.rol IN ('administrador','comercial','implementacion','consulta') AND cs.revocado IS NULL AND cs.expira>? AND cs.ultima>?)";
 const q=(sql,...args)=>db.prepare(sql).bind(...args);
 async function contexto(r){
  if(habilitado!==true||r.method!=="GET"||new URL(r.url).protocol!=="https:")throw Error("Consulta no autorizada.");
  const a=await autenticarCentral(r),c=(r.headers.get("Cookie")||"").split(";").map(x=>x.trim()).filter(x=>x.startsWith("__Host-lapaz-central=")),t=c.length===1?c[0].slice("__Host-lapaz-central=".length):"",n=reloj();
  if(!id(a?.emisor)||!id(a?.sujeto)||!/^[a-f0-9]{64}$/.test(t)||!Number.isSafeInteger(n)||n<0)throw Error("Consulta no autorizada.");
  return {n,args:[a.emisor,a.sujeto,await hash(t),n,n-600000]};
 }
 async function lote(a,stm){const rs=await db.batch([q("SELECT 1 AS autorizado WHERE "+guard,...a.args),...stm]);if(rs[0].results?.[0]?.autorizado!==1)throw Error("Consulta no autorizada.");return rs.slice(1).map(x=>x.results);}
 return Object.freeze({
 async listar(r,d={}){
  const a=await contexto(r),{buscar="",giro="",plan="",estado:est="",limite=25,offset=0}=d;
  if(Object.keys(d).some(k=>!["buscar","giro","plan","estado","limite","offset"].includes(k))||typeof buscar!=="string"||buscar.length>120||giro!==""&&!giros.includes(giro)||plan!==""&&!planes.includes(plan)||est!==""&&!estados.includes(est)||!Number.isSafeInteger(limite)||limite<1||limite>50||!Number.isSafeInteger(offset)||offset<0||offset>1000000)throw Error("Filtros inválidos.");
  const filtro=" WHERE "+guard+" AND (?='' OR instr(lower(e.nombre),lower(?))>0 OR instr(lower(COALESCE(f.nombre_publico,'')),lower(?))>0) AND (?='' OR f.giro=?) AND (?='' OR s.plan=?)";
  const sql="SELECT e.id,e.nombre,e.activa,f.nombre_publico,f.giro,s.plan,s.version,p.nombre AS paquete,s.vence,i.estado AS implementacion,"+estado+" AS estado_efectivo"+base+filtro;
  const b=buscar.trim(),args=[a.n,a.n,...a.args,b,b,b,giro,giro,plan,plan,est,est];
  const [total,items]=await lote(a,[q("SELECT count(*) AS total FROM ("+sql+") WHERE (?='' OR estado_efectivo=?)",...args),q("SELECT * FROM ("+sql+") WHERE (?='' OR estado_efectivo=?) ORDER BY nombre COLLATE NOCASE,id LIMIT ? OFFSET ?",...args,limite,offset)]);
  return {fecha:a.n,total:total[0].total,limite,offset,items};
 },
 async expediente(r,{empresa}={}){
  const a=await contexto(r);if(!id(empresa))throw Error("Empresa inválida.");
  const tablas=[
   ["empresa","SELECT e.id,e.nombre,e.activa,f.nombre_publico,f.giro,f.descripcion,f.lema,f.contacto,f.zona_horaria,f.horario_semanal,f.excepciones_horario,f.revision AS revision_perfil,s.plan,s.version,p.nombre AS paquete,p.implementacion,p.mensualidad,p.moneda,p.usuarios,p.sucursales,p.modulos AS contratados,s.estado,s.inicio,s.vence,s.revision,i.estado AS implementacion_estado,i.revision AS implementacion_revision,"+estado+" AS estado_efectivo"+base+" WHERE e.id=?",[a.n,a.n,empresa]],
   ["sucursales","SELECT id,nombre,activa,revision,contacto,horario FROM sucursales WHERE empresa=?",[empresa]," ORDER BY id"],
   ["principal","SELECT sucursal,revision FROM comercio_sucursal_principal WHERE empresa=?",[empresa]],
   ["membresias","SELECT m.usuario AS id_interno,m.rol,m.activa,m.alcance,u.activo AS cuenta_activa FROM membresias m JOIN usuarios u ON u.id=m.usuario WHERE m.empresa=?",[empresa]," ORDER BY m.usuario"],
   ["personal","SELECT id,nombre,codigo,puesto,especialidad,activo,usuario AS id_interno FROM comercio_empleados WHERE empresa=?",[empresa]," ORDER BY id"],
   ["roles","SELECT id,nombre FROM roles WHERE empresa=?",[empresa]," ORDER BY id"],
   ["contrato_inicial","SELECT plan,version,fecha FROM comercial_contratos_iniciales WHERE empresa=?",[empresa]],
   ["activacion","SELECT revision,modulos,fecha FROM comercial_activaciones WHERE empresa=?",[empresa]],
   ["historial","SELECT revision,plan,version,estado,inicio,vence,fecha FROM comercial_suscripcion_historial WHERE empresa=?",[empresa]," ORDER BY revision DESC"],
   ["ciclo","SELECT revision,anterior,posterior,accion,motivo,fecha FROM comercial_ciclo_vida WHERE empresa=?",[empresa]," ORDER BY revision DESC"],
   ["entregas","SELECT revision,estado,validacion,fecha FROM central_entrega_revisiones WHERE empresa=?",[empresa]," ORDER BY revision DESC"]
  ];
  const rs=await lote(a,tablas.map(([,sql,args,orden=""])=>q(sql+" AND "+guard+orden+" LIMIT 101",...args,...a.args)));
  if(rs[0].length!==1)throw Error("Comercio no disponible.");
  const datos=Object.fromEntries(tablas.map(([k],i)=>[k,rs[i].slice(0,100)])),truncados=tablas.filter((_,i)=>rs[i].length>100).map(x=>x[0]);
  return {fecha:a.n,empresa,datos,truncados,pagos:{estado:"no_integrado"},operaciones:{estado:"solo_consulta"}};
 }
 });
}
