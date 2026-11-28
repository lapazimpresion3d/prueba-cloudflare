// Private policy adapter; no public provisioning or automatic grant.
export async function crearControlGoogle(env,{nucleo,reloj=Date.now}={}){
 const db=env.COMMERCE_DB;if(!db||[env.DB,env.DEMO_DB,env.PROVIDER_DB].includes(db)||!nucleo)throw Error("Control no configurado.");
 if(!(await db.prepare("SELECT clave FROM comercio_identidad WHERE clave='lapaz-comercios-v1'").first()))throw Error("Esquema inválido.");
 const q=(s,...a)=>db.prepare(s).bind(...a).first();
 async function habilitacion(empresa){return q("SELECT s.plan FROM google_calendar_autorizaciones g JOIN empresas e ON e.id=g.empresa JOIN comercial_suscripciones s ON s.empresa=e.id WHERE e.id=? AND e.activa=1 AND g.habilitado=1 AND s.estado IN ('activa','prueba') AND s.inicio<=? AND s.vence>? AND s.plan IN ('p2','p3','p4')",empresa,reloj(),reloj());}
 async function autorizar(r,empresa){const a=await nucleo.autorizar(r,{empresa,permiso:"empresa.administrar"});const p=await habilitacion(empresa);if(a?.empresa!==empresa||a.rol!=="propietario"||!p)throw Error("Integración no autorizada.");return {...a,plan:p.plan};}
 const guard="id=1 AND reserva=? AND revision=?";
 const cursor={async reservar(){return q("UPDATE google_calendar_cursor SET reserva=?,reservado=?,revision=revision+1 WHERE id=1 AND reserva IS NULL RETURNING valor,reserva,revision",crypto.randomUUID(),reloj());},async confirmar(l,v){if(typeof v!=="string"||v.length>128||!await q("UPDATE google_calendar_cursor SET valor=? WHERE "+guard+" RETURNING id",v,l.reserva,l.revision))throw Error("Cursor inválido.");},async liberar(l){if(!await q("UPDATE google_calendar_cursor SET reserva=NULL,reservado=NULL WHERE "+guard+" RETURNING id",l.reserva,l.revision))throw Error("Cursor inválido.");}};
 return {autorizar,habilitacion,cursor};
}
