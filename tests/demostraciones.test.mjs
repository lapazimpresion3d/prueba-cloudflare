import test from "node:test";
import assert from "node:assert/strict";
import { planes, modulos, capacidades } from "../public/demostraciones/config.mjs";
import { establecimientos, obtenerEstablecimiento, filtrarCatalogo } from "../public/demostraciones/establecimientos.mjs";

test("cinco negocios y cuatro planes con importes exactos en centavos",()=>{
  assert.deepEqual(establecimientos.map(e=>e.nombre),["Café Mirador","Barbería Elite","Mundo Mascotas","Taquería El Comal","Auto Servicio Bahía"]);
  assert.deepEqual(planes.map(p=>[p.implementacion,p.mensualidad]),[[75000,14900],[150000,29900],[250000,44900],[350000,64900]]);
  assert.equal(new Set(establecimientos.map(e=>e.id)).size,5);
});
test("20 combinaciones independientes; pedidos de práctica solo en giros y planes compatibles",()=>{
  for(const e of establecimientos)for(const p of planes){
    const lista=capacidades(e,p.id);
    const interactivo=p.id!=="p1"&&["cafeteria","tienda","restaurante"].includes(e.giro);
    const citas=p.id!=="p1"&&["barberia","taller"].includes(e.giro);
    assert.deepEqual(lista.filter(m=>m.estadoEfectivo==="disponible").map(m=>m.id),interactivo?["web","catalogo","pedidos","seguimiento",...(e.giro==="restaurante"?["reservaciones","qr_mesa"]:[]),...(["restaurante","cafeteria"].includes(e.giro)?["cocina"]:[]),"pagos",...(["p3","p4"].includes(p.id)?["pos","caja","comprobantes","inventario","almacen"]:[]),...(e.giro==="restaurante"&&["p3","p4"].includes(p.id)?["mesas"]:[])]:citas?["web","catalogo","citas","agendas",...(["p3","p4"].includes(p.id)?["pos","caja","comprobantes","inventario","almacen"]:[])]:["web","catalogo"]);
    assert.ok(lista.every(m=>m.estadoEfectivo==="otro_plan" || m.desde<=planes.indexOf(p)+1));
    assert.ok(lista.every(m=>!m.giros||m.giros.includes(e.giro)));
  }
});
test("el plan superior no activa una función sin implementar",()=>{
  const taller=obtenerEstablecimiento("auto-servicio-bahia");
  assert.equal(capacidades(taller,"p4").find(m=>m.id==="ordenes_servicio").estadoEfectivo,"en_desarrollo");
  assert.equal(capacidades(taller,"p1").find(m=>m.id==="ordenes_servicio").estadoEfectivo,"otro_plan");
  assert.ok(!capacidades(taller,"p4").some(m=>m.id==="cocina"));
});
test("los módulos disponibles exigen dependencias disponibles y sin ciclos",()=>{
  const e=establecimientos[0], base={id:"a",desde:1,estado:"disponible"}, otro={id:"b",desde:1,estado:"disponible",depende:["a"]};
  assert.equal(capacidades(e,"p1",[base,otro])[1].estadoEfectivo,"disponible");
  assert.equal(capacidades(e,"p1",[{...base,estado:"en_desarrollo"},otro])[1].estadoEfectivo,"en_desarrollo");
  assert.equal(capacidades(e,"p1",[{...base,depende:["b"]},otro])[1].estadoEfectivo,"en_desarrollo");
  assert.equal(capacidades(e,"p1",[otro])[0].estadoEfectivo,"en_desarrollo");
});
test("giro y plan desconocidos no activan capacidades",()=>{
  assert.equal(obtenerEstablecimiento("no-existe"),null);
  assert.deepEqual(capacidades(null,"p1"),[]);
  assert.deepEqual(capacidades(establecimientos[0],"no-existe"),[]);
});
test("catálogos separados, IDs locales, datos tipados y filtros",()=>{
  const barberia=obtenerEstablecimiento("barberia-elite");
  const taller=obtenerEstablecimiento("auto-servicio-bahia");
  const cafe=obtenerEstablecimiento("cafe-mirador");
  const tienda=obtenerEstablecimiento("mundo-mascotas");
  const comal=obtenerEstablecimiento("taqueria-el-comal");
  assert.equal(filtrarCatalogo(barberia,{tipo:"servicio"}).length,3);
  assert.equal(filtrarCatalogo(taller,{busqueda:"diagnostico"})[0].id,"diagnostico");
  assert.equal(filtrarCatalogo(cafe,{busqueda:"cafe",tipo:"fisico"})[0].id,"cafe-grano");
  assert.equal(filtrarCatalogo(tienda,{tipo:"alimento"}).length,0);
  assert.equal(filtrarCatalogo(comal,{categoria:"Tacos"}).length,4);
  assert.equal(filtrarCatalogo(barberia,{busqueda:"taco"}).length,0);
  for(const e of establecimientos){
    assert.equal(new Set(e.catalogo.map(p=>p.id)).size,e.catalogo.length);
    assert.ok(e.catalogo.every(p=>["fisico","alimento","servicio"].includes(p.tipo)&&Number.isSafeInteger(p.precioCentavos)&&p.precioCentavos>=0));
  }
});
test("la configuración central propaga disponibilidad a todos los giros compatibles",()=>{
  const nuevo=modulos.map(m=>m.id==="clientes"?{...m,estado:"disponible"}:m);
  for(const e of establecimientos){
    assert.equal(capacidades(e,"p2",nuevo).find(m=>m.id==="clientes").estadoEfectivo,"disponible");
    assert.equal(capacidades(e,"p1",nuevo).find(m=>m.id==="clientes").estadoEfectivo,"otro_plan");
  }
});
