import {inspeccionarJpeg} from "./seguridad-imagen.mjs";
// Módulo de práctica local: no es un repositorio SaaS ni una autorización.
import { obtenerEstablecimiento } from "./establecimientos.mjs";
import { validarImagenPerfil } from "./perfil-local.mjs";
export const LIMITE_CATALOGO_BYTES=300000;
export const LIMITE_FOTO=45000;
export function validarTamanoCatalogo(lista){
  // UTF-8: encodeURIComponent devuelve caracteres escapados para cada byte no ASCII.
  const bytes=encodeURIComponent(JSON.stringify(lista)).replace(/%[0-9A-F]{2}/g,"x").length;
  if(bytes>LIMITE_CATALOGO_BYTES)throw Error("El catálogo supera el espacio de práctica. Reduce o elimina algunas fotos.");
  return lista;
}
export function imagenOfertaSegura(valor){
  if(typeof valor==="string"&&/^\/imagenes\/[a-z0-9_-]+\.webp$/i.test(valor))return true;
  try{inspeccionarJpeg(valor,{maximo:LIMITE_FOTO,lado:640});return true;}catch{return false;}
}
const PREFIJO = "lapaz:demo:catalogo:v1:";
const tipos = new Set(["fisico","alimento","servicio"]);
const MAX = 100;
const copiar = x => JSON.parse(JSON.stringify(x));
const texto = (x,max,obligatorio=true) => {
  if(typeof x !== "string") throw Error("Escribe un texto válido.");
  const s=x.trim();
  if((obligatorio&&!s)||s.length>max) throw Error("Revisa los campos de texto.");
  return s;
};
export function validarOferta(datos,id,anterior=null) {
  if(!datos||typeof datos!=="object"||!tipos.has(datos.tipo)) throw Error("Selecciona un tipo válido.");
  if(typeof id!=="string"||!/^[a-z0-9-]{1,80}$/.test(id)) throw Error("Identificador inválido.");
  const precio=datos.precioCentavos;
  if(!Number.isSafeInteger(precio)||precio<0||precio>100000000) throw Error("Precio inválido.");
  const oferta={id,nombre:texto(datos.nombre,100),categoria:texto(datos.categoria,60),tipo:datos.tipo,
    descripcion:texto(datos.descripcion??"",300,false),precioCentavos:precio,disponible:datos.disponible!==false};
  if(datos.tipo==="servicio"){
    if(!Number.isSafeInteger(datos.duracionMinutos)||datos.duracionMinutos<5||datos.duracionMinutos>1440) throw Error("Duración de 5 a 1440 minutos.");
    oferta.duracionMinutos=datos.duracionMinutos;
  }
  // Una cadena vacía conserva la eliminación explícita al recargar o importar.
  const imagen=datos.imagen===undefined?anterior?.imagen:datos.imagen;
  if(imagen==="")oferta.imagen="";
  else if(imagen!==undefined){
    if(imagen===anterior?.imagen&&/^\/imagenes\/[a-z0-9_-]+\.webp$/i.test(imagen))oferta.imagen=imagen;
    else if(typeof imagen==="string"&&imagen.length<=LIMITE_FOTO&&imagen.startsWith("data:image/jpeg;base64,"))oferta.imagen=validarImagenPerfil(imagen,640);
    else if(imagen===anterior?.imagen&&imagenOfertaSegura(imagen))oferta.imagen=imagen;
    else if(datos.imagen!==undefined)throw Error("Selecciona una foto local válida y optimizada.");
  }
  return oferta;
}
export function centavosDesdeTexto(valor){
  const s=String(valor).trim();
  if(!/^\d{1,7}(?:\.\d{1,2})?$/.test(s)) throw Error("Escribe un precio con hasta dos decimales.");
  const [entero,decimal=""]=s.split(".");
  const c=Number(entero)*100+Number(decimal.padEnd(2,"0"));
  if(c>100000000) throw Error("Precio máximo de práctica: $1,000,000.");
  return c;
}
function semilla(id){
  const e=obtenerEstablecimiento(id);
  if(!e)throw Error("Establecimiento desconocido.");
  return e;
}
export function crearCatalogosLocales(almacen) {
  const memoria=new Map();
  const key=id=>PREFIJO+id;
  function leer(id){
    const e=semilla(id);
    if(memoria.has(id))return copiar(memoria.get(id));
    let lista=null;
    try{
      const raw=almacen?.getItem(key(id));
      if(raw){
        if(raw.length>310000)throw Error("Catálogo demasiado grande.");
        const v=JSON.parse(raw);
        if(v.version!==1||v.establecimiento!==id||!Array.isArray(v.catalogo)||v.catalogo.length>MAX)throw Error("Formato inválido.");
        const vistos=new Set();
        lista=v.catalogo.map(p=>{
          if(vistos.has(p.id))throw Error("Duplicado.");
          vistos.add(p.id);
          return validarOferta(p,p.id,e.catalogo.find(x=>x.id===p.id));
        });
      }
    }catch{lista=null;}
    if(lista){try{validarTamanoCatalogo(lista);}catch{lista=null;}}
    if(!lista)lista=copiar(e.catalogo);
    memoria.set(id,lista);return copiar(lista);
  }
  function guardar(id,lista){
    validarTamanoCatalogo(lista);
    memoria.set(id,copiar(lista));
    try{
      if(!almacen) return false;
      almacen.setItem(key(id),JSON.stringify({version:1,establecimiento:id,catalogo:lista}));
      return true;
    }catch{return false;}
  }
  function crear(id,datos){
    const lista=leer(id);
    if(lista.length>=MAX)throw Error("Límite de 100 elementos de práctica.");
    let n=1;while(lista.some(p=>p.id==="local-"+n))n++;
    const p=validarOferta(datos,"local-"+n);lista.push(p);
    return guardar(id,lista);
  }
  function editar(id,producto,datos){
    const lista=leer(id),i=lista.findIndex(p=>p.id===producto);
    if(i<0)throw Error("No existe ese elemento en el catálogo seleccionado.");
    lista[i]=validarOferta(datos,producto,lista[i]);return guardar(id,lista);
  }
  function eliminar(id,producto){
    const lista=leer(id);
    if(!lista.some(p=>p.id===producto))throw Error("No existe ese elemento.");
    return guardar(id,lista.filter(p=>p.id!==producto));
  }
  function restaurar(id){
    const lista=copiar(semilla(id).catalogo);
    // Sobrescribir en vez de borrar: si el almacenamiento falla, conservar la copia en memoria.
    return guardar(id,lista);
  }
  function importar(id,datos){
    const e=semilla(id);
    if(!Array.isArray(datos)||datos.length>MAX)throw Error("Catálogo de servidor inválido.");
    const vistos=new Set();
    const lista=datos.map(p=>{
      if(!p||vistos.has(p.id))throw Error("Identificador duplicado.");
      vistos.add(p.id);
      return validarOferta(p,p.id,e.catalogo.find(x=>x.id===p.id));
    });
    return guardar(id,lista);
  }
  return {leer,crear,editar,eliminar,restaurar,importar};
}
