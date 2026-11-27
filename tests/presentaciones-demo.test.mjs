import test from "node:test";
import assert from "node:assert/strict";
import {presentacionDe,enlacesDemo,simbolos,destacadosDisponibles,enlaceGaleria,planesRepresentativos,enlaceConfigurador,enlaceCotizacion} from "../public/demostraciones/presentaciones.mjs";
import {establecimientos} from "../public/demostraciones/establecimientos.mjs";
import {planes} from "../public/demostraciones/config.mjs";
test("cinco identidades sectoriales, textos y símbolos propios",()=>{
  const estilos=new Set();
  for(const e of establecimientos){
    const t=presentacionDe(e.id);assert.ok(t?.titulo&&t.catalogo&&t.accion&&simbolos[t.estilo]);estilos.add(t.estilo);
  }
  assert.equal(estilos.size,5);
  assert.equal(presentacionDe("desconocido"),null);
  assert.equal(presentacionDe("constructor"),null);
});
test("20 combinaciones conservan negocio y plan sin compartir estado de práctica",()=>{
  for(const e of establecimientos)for(const p of planes){
    const links=enlacesDemo(e.id,p.id);
    for(const link of Object.values(links)){
      const u=new URL(link,"https://demo.example");assert.equal(u.searchParams.get("negocio"),e.id);assert.equal(u.searchParams.get("plan"),p.id);assert.equal(u.searchParams.has("practica"),false);
    }
    assert.equal(new URL(links.administracion,"https://demo.example").searchParams.get("vista"),"administracion");
    assert.ok(links.negocio.startsWith("/demostraciones/negocio/"));
    const practica=enlacesDemo(e.id,p.id,true);
    assert.equal(new URL(practica.negocio,"https://demo.example").searchParams.get("practica"),"1");
    assert.equal(practica.administracion,links.administracion);
  }
});

test("especialidades apuntan a categorías existentes de los cinco giros",()=>{
 for(const e of establecimientos){const d=destacadosDisponibles(presentacionDe(e.id),e.catalogo);assert.equal(d.length,3);assert.ok(d.every(x=>e.catalogo.some(p=>p.categoria===x.categoria)));}
 assert.equal(destacadosDisponibles(presentacionDe("cafe-mirador"),[]).length,0);
 assert.deepEqual(destacadosDisponibles(presentacionDe("barberia-elite"),[{categoria:"Productos"}]),[{nombre:"Cuidado personal",categoria:"Productos"}]);
});

test("galería fija y configurador adicional mantienen los cinco negocios y cuatro planes",()=>{
 assert.deepEqual(planesRepresentativos,{"cafe-mirador":"p1","barberia-elite":"p2","mundo-mascotas":"p3","taqueria-el-comal":"p4","auto-servicio-bahia":"p3"});
 assert.equal(enlaceGaleria(),"/demostraciones/ejemplos/");
 for(const e of establecimientos)for(const p of planes){
  const u=new URL(enlaceConfigurador(e.id,p.id),"https://demo.example");
  assert.equal(u.pathname,"/demostraciones/configurar/");
  assert.equal(u.searchParams.get("negocio"),e.id);assert.equal(u.searchParams.get("plan"),p.id);assert.equal(u.searchParams.has("practica"),false);
 }
});

test("cotización de 20 combinaciones sin datos de práctica ni destinos arbitrarios",()=>{const slugs=["presencia-digital","negocio-interactivo","gestion-comercial","gestion-profesional"];const giros={"cafe-mirador":"cafeteria","barberia-elite":"barberia","mundo-mascotas":"mascotas","auto-servicio-bahia":"taller","taqueria-el-comal":"restaurante"};for(const e of establecimientos)for(const [i,p] of planes.entries()){const u=new URL(enlaceCotizacion(e.id,p.id));assert.equal(u.origin,"https://lapazimpresion3d.com");assert.equal(u.pathname,"/cotizacion-web.html");assert.equal(u.searchParams.get("paquete"),slugs[i]);assert.equal(u.searchParams.get("giro"),giros[e.id]);assert.equal([...u.searchParams.keys()].length,2);assert.equal(u.hash,"#precios-paquetes");}assert.equal(enlaceCotizacion("otro","p1"),null);assert.equal(enlaceCotizacion("cafe-mirador","p9"),null);});
