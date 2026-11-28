// Private only. Callers authenticate owner or trusted scheduler before invoking.
const text=(x,n=4096)=>typeof x==="string"&&x.length>0&&x.length<=n&&!/[\x00-\x1f]/.test(x);
const encrypted=x=>{if(!text(x,30000))throw Error("Cifrado inválido.");const d=JSON.parse(x);if(d.v!==1||!text(d.iv,32)||!text(d.c,30000))throw Error("Cifrado inválido.");return x;};
export async function crearAlmacenGoogleD1(env,{reloj=Date.now}={}){
 const db=env.COMMERCE_DB;if(!db||[env.DB,env.DEMO_DB,env.PROVIDER_DB].includes(db))throw Error("Base comercial no aislada.");
 if(!(await db.prepare("SELECT clave FROM comercio_identidad WHERE clave='lapaz-comercios-v1'").first()))throw Error("Esquema comercial incorrecto.");
 const q=(s,...a)=>db.prepare(s).bind(...a),first=(s,...a)=>q(s,...a).first(),all=async(s,...a)=>(await q(s,...a).all()).results;
 const guard="empresa=? AND reserva=? AND revision=?";
 const args=l=>[l.empresa,l.reserva,l.revision];
 async function exigir(l){const r=await first("SELECT empresa FROM google_calendar_conexiones WHERE "+guard,...args(l));if(!r)throw Error("Reserva inválida.");}
 async function modificar(l,s,...a){const r=await first("UPDATE google_calendar_conexiones SET "+s+" WHERE "+guard+" RETURNING empresa",...a,...args(l));if(!r)throw Error("Reserva inválida.");}
 const vigente=async empresa=>first("SELECT s.plan FROM comercial_suscripciones s JOIN empresas e ON e.id=s.empresa WHERE s.empresa=? AND e.activa=1 AND s.estado IN ('prueba','activa') AND s.inicio<=? AND s.vence>? AND s.plan IN ('p2','p3','p4')",empresa,reloj(),reloj());
 return Object.freeze({
 async crearEstado(e){if(!/^[A-Za-z0-9_-]{43}$/.test(e.hash)||!Number.isSafeInteger(e.expira)||e.expira<=reloj()||e.expira>reloj()+600000)throw Error("Estado inválido.");await q("INSERT INTO google_calendar_estados(hash,empresa,actor,expira,cifrado) VALUES(?,?,?,?,?)",e.hash,e.empresa,e.actor,e.expira,encrypted(e.cifrado)).run();},
 async consumirEstado(e){return first("UPDATE google_calendar_estados SET consumido=? WHERE hash=? AND empresa=? AND actor=? AND expira>? AND consumido IS NULL RETURNING cifrado",e.ahora,e.hash,e.empresa,e.actor,e.ahora);},
 async reservar(empresa){const reserva=crypto.randomUUID();return first("INSERT INTO google_calendar_conexiones(empresa,reserva,reservado,revision) VALUES(?,?,?,1) ON CONFLICT(empresa) DO UPDATE SET reserva=excluded.reserva,reservado=excluded.reservado,revision=google_calendar_conexiones.revision+1 WHERE google_calendar_conexiones.reserva IS NULL RETURNING empresa,reserva,revision,cifrado",empresa,reserva,reloj());},
 async verificarReserva(l){await exigir(l);},
 async liberar(l){await modificar(l,"reserva=NULL,reservado=NULL");},
 async actualizarToken(l,c){await modificar(l,"cifrado=?",encrypted(c));l.cifrado=c;},
 async borrarToken(l){await modificar(l,"cifrado=NULL,activo=0,general=NULL,recursos='{}'");l.cifrado=null;},
 async configurar(l,{general,recursos={},activo=true}){const s=await vigente(l.empresa);if(!s||!l.cifrado||!text(general,1024)||typeof activo!=="boolean"||!recursos||Array.isArray(recursos)||typeof recursos!=="object"||Object.keys(recursos).length>40||s.plan==="p2"&&Object.keys(recursos).length||Object.entries(recursos).some(([k,v])=>!text(k,128)||!text(v,1024)))throw Error("Configuración inválida.");await modificar(l,"general=?,recursos=?,activo=?",general,JSON.stringify(recursos),Number(activo));},
 async configuracion(l){await exigir(l);const s=await vigente(l.empresa),r=await first("SELECT activo,general,recursos FROM google_calendar_conexiones WHERE "+guard,...args(l));return {activo:!!s&&r.activo===1,plan:s?.plan,general:r.general,recursos:JSON.parse(r.recursos)};},
 async eventos(l){await exigir(l);return all("SELECT clave,cal,id FROM google_calendar_eventos WHERE empresa=? ORDER BY clave",l.empresa);},
 async registrar(l,clave,cal,id){if(!/^[0-9a-f]{64}$/.test(id)||!text(cal,1024)||clave!==JSON.stringify([cal,id]))throw Error("Evento inválido.");const r=await first("INSERT INTO google_calendar_eventos(empresa,clave,cal,id) SELECT empresa,?,?,? FROM google_calendar_conexiones WHERE "+guard+" ON CONFLICT(empresa,clave) DO UPDATE SET cal=excluded.cal,id=excluded.id RETURNING id",clave,cal,id,...args(l));if(!r)throw Error("Reserva inválida.");},
 async retirar(l,clave){await exigir(l);await q("DELETE FROM google_calendar_eventos WHERE empresa=? AND clave=? AND EXISTS(SELECT 1 FROM google_calendar_conexiones WHERE "+guard+")",l.empresa,clave,...args(l)).run();},
 async resultado(l,estado){if(!["sincronizado","reintentar","desconectado"].includes(estado))throw Error("Estado inválido.");const r=await first("INSERT INTO google_calendar_historial(empresa,fecha,estado) SELECT empresa,?,? FROM google_calendar_conexiones WHERE "+guard+" RETURNING id",reloj(),estado,...args(l));if(!r)throw Error("Reserva inválida.");},
 async estado(empresa){const r=await first("SELECT cifrado IS NOT NULL AS conectado,activo,general,recursos,reserva IS NOT NULL AS ocupado FROM google_calendar_conexiones WHERE empresa=?",empresa);return r?{conectado:!!r.conectado,activo:!!r.activo,general:r.general,recursos:JSON.parse(r.recursos),ocupado:!!r.ocupado}:{conectado:false,activo:false,ocupado:false};},
 async historial(empresa){return all("SELECT fecha,estado FROM google_calendar_historial WHERE empresa=? ORDER BY id DESC LIMIT 30",empresa);},
 async pendientes(cursor="",limite=10){if(!Number.isSafeInteger(limite)||limite<1||limite>20)throw Error("Límite inválido.");return all("SELECT c.empresa FROM google_calendar_conexiones c JOIN empresas e ON e.id=c.empresa JOIN comercial_suscripciones s ON s.empresa=c.empresa WHERE c.empresa>? AND c.activo=1 AND c.cifrado IS NOT NULL AND c.reserva IS NULL AND e.activa=1 AND s.estado IN ('activa','prueba') AND s.inicio<=? AND s.vence>? AND s.plan IN ('p2','p3','p4') ORDER BY c.empresa LIMIT ?",cursor,reloj(),reloj(),limite);},
 async limpiarEstados(){await q("DELETE FROM google_calendar_estados WHERE expira<=?",reloj()).run();}
 });
}
