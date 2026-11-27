import {jpegPrueba} from "./fixtures/jpeg-prueba.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import {crearPerfilesLocales,validarPerfil,perfilPlano,validarImagenPerfil} from "../public/demostraciones/perfil-local.mjs";
import {establecimientos} from "../public/demostraciones/establecimientos.mjs";
const almacen=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
test("cinco perfiles independientes, persistencia y restauración",()=>{
  const a=almacen(),p=crearPerfilesLocales(a);
  for(const e of establecimientos){
    assert.equal(p.leer(e.id).nombre,e.nombre);
    assert.equal(p.guardar(e.id,{...perfilPlano(p.leer(e.id)),nombre:"Práctica "+e.id,color:"#112233"}),true);
  }
  const nuevo=crearPerfilesLocales(a);
  for(const e of establecimientos)assert.equal(nuevo.leer(e.id).nombre,"Práctica "+e.id);
  nuevo.restaurar("cafe-mirador");
  assert.equal(nuevo.leer("cafe-mirador").nombre,"Café Mirador");
  assert.equal(nuevo.leer("barberia-elite").nombre,"Práctica barberia-elite");
});
test("validación de campos e identidad inmutable",()=>{
  const p=crearPerfilesLocales(),id="cafe-mirador",datos=perfilPlano(p.leer(id));
  const v=validarPerfil(id,{...datos,id:"otro",giro:"taller",url:"https://example.invalid"});
  assert.equal(v.id,undefined);assert.equal(v.giro,undefined);assert.equal(v.url,undefined);
  for(const d of [{color:"red"},{fondo:"url(x)"},{icono:"<img>"},{nombre:" "},{horario:"x".repeat(121)}])assert.throws(()=>validarPerfil(id,{...datos,...d}));
  assert.throws(()=>validarPerfil("otro",datos));
});
test("almacenamiento corrupto o ajeno se descarta y copia en memoria",()=>{
  const a=almacen(),id="cafe-mirador",key="lapaz:demo:perfil:v1:"+id;
  a.setItem(key,JSON.stringify({version:1,establecimiento:"barberia-elite",perfil:{}}));
  assert.equal(crearPerfilesLocales(a).leer(id).nombre,"Café Mirador");
  a.setItem(key,"{");
  assert.equal(crearPerfilesLocales(a).leer(id).nombre,"Café Mirador");
  const p=crearPerfilesLocales({getItem(){throw Error("blocked")},setItem(){throw Error("blocked")}});
  assert.equal(p.guardar(id,{...perfilPlano(p.leer(id)),nombre:"Prueba"}),false);
  const c=p.leer(id);c.nombre="otro";assert.equal(p.leer(id).nombre,"Prueba");
  assert.equal(p.restaurar(id),false);assert.equal(p.leer(id).nombre,"Café Mirador");
});

test("imágenes limitadas, sin URL externa ni SVG, persistencia de campos opcionales",()=>{
  const id="cafe-mirador",a=almacen(),p=crearPerfilesLocales(a);
  const muestra=jpegPrueba();
  // Fixture sintética del formato de transporte, no una fotografía decodificable.
  assert.equal(validarImagenPerfil(muestra),muestra);
  assert.equal(validarImagenPerfil(undefined),"");
  for(const x of ["https://example.invalid/x","data:image/svg+xml;base64,AAAA","data:image/jpeg;base64,AAAA","data:image/jpeg;base64,/9j/"+"A".repeat(100000)])assert.throws(()=>validarImagenPerfil(x));
  assert.equal(p.guardar(id,{...perfilPlano(p.leer(id)),logo:muestra,portada:muestra}),true);
  assert.equal(crearPerfilesLocales(a).leer(id).logo,muestra);
  assert.equal(p.leer("barberia-elite").logo,"");
  p.restaurar(id);assert.equal(p.leer(id).portada,"");
});
