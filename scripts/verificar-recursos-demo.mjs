import {readFileSync} from "node:fs";
import {establecimientos} from "../public/demostraciones/establecimientos.mjs";
import {portadaDemo,logoDemo} from "../public/demostraciones/identidad.mjs";
const paths=new Set(establecimientos.flatMap(e=>[portadaDemo(e.id),logoDemo(e.id),...e.catalogo.map(p=>p.imagen)]));
let failed=0;
for(const path of paths){
 try{
  if(typeof path!=="string"||!/^\/(imagenes\/[a-z0-9_-]+\.webp|demostraciones\/identidad\/[a-z0-9_-]+\.svg)$/.test(path))throw Error("Ruta no permitida");
  const b=readFileSync(new URL("../public"+path,import.meta.url));
  if(path.endsWith(".webp")&&(b.length<20||b.toString("ascii",0,4)!=="RIFF"||b.toString("ascii",8,12)!=="WEBP"||b.readUInt32LE(4)+8!==b.length))throw Error("WebP inválido");
  if(path.endsWith(".svg")&&!b.toString("utf8").startsWith("<svg"))throw Error("SVG inválido");
  console.log("OK",path,b.length);
 }catch(e){failed++;console.error("ERROR",path,e.message);}
}
console.log(paths.size-failed+"/"+paths.size+" recursos válidos");
if(failed)process.exitCode=1;
