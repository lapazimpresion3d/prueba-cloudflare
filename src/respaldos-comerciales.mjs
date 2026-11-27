// Internal, read-only, bounded configuration/financial snapshot. Not a full DB backup.
const id=x=>typeof x==="string"&&x.length>0&&x.length<=128;
const MAX=1000,MAX_BYTES=2000000;
const formato="lapaz-comercio-respaldo-v1";
const encoder=new TextEncoder();
const tablas=Object.freeze([
 ["empresa","SELECT id,nombre,activa FROM empresas WHERE id=?"],
 ["sucursales","SELECT empresa,id,nombre,activa FROM sucursales WHERE empresa=? ORDER BY id"],
 ["roles","SELECT empresa,id,nombre FROM roles WHERE empresa=? ORDER BY id"],
 ["permisos","SELECT empresa,rol,permiso FROM rol_permisos WHERE empresa=? ORDER BY rol,permiso"],
 ["membresias","SELECT empresa,usuario,rol,activa,alcance FROM membresias WHERE empresa=? ORDER BY usuario"],
 ["asignaciones","SELECT empresa,usuario,sucursal FROM membresia_sucursales WHERE empresa=? ORDER BY usuario,sucursal"],
 ["restricciones","SELECT empresa,usuario,permiso FROM membresia_permisos_denegados WHERE empresa=? ORDER BY usuario,permiso"],
 ["suscripcion","SELECT empresa,plan,version,estado,inicio,vence,revision FROM comercial_suscripciones WHERE empresa=?"],
 ["finanzas","SELECT empresa,sucursal,id,actor,fecha,tipo,importe,metodo,original FROM comercio_movimientos_financieros WHERE empresa=? ORDER BY fecha,id"]
]);
async function digest(text){return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",encoder.encode(text))),x=>x.toString(16).padStart(2,"0")).join("");}
function serial(v){const t=JSON.stringify(v);if(typeof t!=="string"||encoder.encode(t).length>MAX_BYTES)throw Error("Respaldo supera el límite.");return t;}
export async function verificarRespaldo(respaldo,empresa){
 if(!id(empresa)||!respaldo||typeof respaldo.payload!=="string"||encoder.encode(respaldo.payload).length>MAX_BYTES||!(/^[a-f0-9]{64}$/).test(respaldo.sha256??"")||await digest(respaldo.payload)!==respaldo.sha256)throw Error("Integridad de respaldo inválida.");
 const d=JSON.parse(respaldo.payload);
 if(d?.formato!==formato||d.empresa!==empresa||!Number.isSafeInteger(d.fecha)||!d.datos||Object.keys(d.datos).length!==tablas.length)throw Error("Formato o destino incompatible.");
 for(const [k] of tablas){const rows=d.datos[k];if(!Array.isArray(rows)||rows.length>MAX||rows.some(r=>!r||typeof r!=="object"||Array.isArray(r)||(k==="empresa"?r.id:r.empresa)!==empresa))throw Error("Datos de respaldo incompatibles.");}
 if(d.datos.empresa.length!==1)throw Error("Empresa no disponible.");
 return {empresa,fecha:d.fecha,formato,conteos:Object.fromEntries(tablas.map(([k])=>[k,d.datos[k].length]))};
}
export async function crearRespaldosComerciales(env,{habilitado=false,reloj=Date.now}={}){
 const db=env.COMMERCE_DB;
 if(!db||[env.DB,env.DEMO_DB,env.PROVIDER_DB].includes(db))throw Error("Base comercial incorrecta.");
 if(!(await db.prepare("SELECT clave FROM comercio_identidad WHERE clave='lapaz-comercios-v1'").first()))throw Error("Esquema incorrecto.");
 const exigir=()=>{if(habilitado!==true)throw Error("Respaldos deshabilitados.");};
 return Object.freeze({
 async exportar(empresa){exigir();if(!id(empresa))throw Error("Empresa inválida.");const fecha=reloj();if(!Number.isSafeInteger(fecha)||fecha<0)throw Error("Fecha inválida.");
 // D1 batch gives one transaction for the selected reads; no arbitrary SQL or table names.
 const rs=await db.batch(tablas.map(([,sql])=>db.prepare(sql+" LIMIT "+(MAX+1)).bind(empresa)));
 const datos=Object.fromEntries(tablas.map(([k],i)=>[k,rs[i].results]));
 if(datos.empresa.length!==1||Object.values(datos).some(x=>!Array.isArray(x)||x.length>MAX))throw Error("Empresa inexistente o respaldo excede el límite.");
 const payload=serial({formato,empresa,fecha,datos});return {payload,sha256:await digest(payload)};
 },
 async prevalidar(respaldo,empresa){exigir();return verificarRespaldo(respaldo,empresa);}
 });
}
