import test from "node:test";
import assert from "node:assert/strict";
import {presentacionDe,enlacesDemo,simbolos} from "../public/demostraciones/presentaciones.mjs";
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
