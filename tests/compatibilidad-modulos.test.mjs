import test from "node:test";
import assert from "node:assert/strict";
import {catalogoInicial,idsModulos} from "../src/catalogo-contractual.mjs";
import {resolverCompatibilidad,validarModulosContractuales,girosComerciales} from "../src/compatibilidad-modulos.mjs";
const p4=catalogoInicial[3].modulos;
const mapa=(giro,contratados=p4,operativos=[])=>Object.fromEntries(resolverCompatibilidad({giro,contratados,operativos}).modulos.map(m=>[m.id,m]));
test("matriz de seis giros y cuatro planes, sin activación implícita",()=>{
 for(const p of catalogoInicial){assert.ok(validarModulosContractuales(p.modulos));for(const giro of girosComerciales){
  const m=mapa(giro,p.modulos);assert.equal(Object.keys(m).length,idsModulos.length);
  assert.ok(Object.values(m).every(x=>!x.habilitado&&!x.disponibleTecnico));
  assert.equal(m.web.aplicable,true);assert.equal(m.pos.contratado,p.modulos.includes("pos"));
 }}
 assert.equal(mapa("restaurante").mesas.aplicable,true);
 assert.equal(mapa("cafeteria").cocina.aplicable,true);
 assert.equal(mapa("cafeteria").mesas.aplicable,false);
 assert.equal(mapa("tienda").cotizaciones.aplicable,true);
 assert.equal(mapa("barberia").agendas.aplicable,true);
 assert.equal(mapa("taller").ordenes_servicio.aplicable,true);
 assert.equal(mapa("otro").pedidos.aplicable,false);
});
test("dependencias transitivas y disponibilidad privada separadas",()=>{
 assert.equal(mapa("restaurante",["mesas","cocina","qr_mesa"]).mesas.estado,"dependencia_no_aplicable");
 assert.equal(mapa("restaurante",p4,["mesas","cocina","qr_mesa"]).mesas.estado,"pendiente_tecnico");
 assert.equal(mapa("restaurante",p4,["mesas","cocina","qr_mesa","pedidos"]).mesas.estado,"candidato_activacion");
 assert.equal(mapa("restaurante",p4,idsModulos).mesas.habilitado,false);
 assert.equal(validarModulosContractuales(["mesas"]),false);
 assert.equal(validarModulosContractuales(["web","web"]),false);
 assert.throws(()=>mapa("desconocido"));
 assert.throws(()=>mapa("tienda",["inventado"]));
});
