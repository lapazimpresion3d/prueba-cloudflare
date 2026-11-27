import test from "node:test";
import assert from "node:assert/strict";
import {establecimientos,obtenerEstablecimiento} from "../public/demostraciones/establecimientos.mjs";
import {planes} from "../public/demostraciones/config.mjs";
import {admitePedidos,modalidadesPedido,ofertaPedible,resumirCarrito,crearPedidosPractica,transicionesPedido} from "../public/demostraciones/pedidos-practica.mjs";
const id="cafe-mirador",catalogo=obtenerEstablecimiento(id).catalogo;
const almacen=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
const opciones=()=>{let n=0;return {folio:()=>String(++n),ahora:()=>1700000000000};};
const lineas=[{id:"espresso",cantidad:2},{id:"croissant",cantidad:1}];
test("habilitación de nueve combinaciones compatibles, ninguna P1",()=>{
  let n=0;
  for(const e of establecimientos)for(const p of planes){
    const esperado=p.id!=="p1"&&["cafeteria","restaurante","tienda"].includes(e.giro);
    assert.equal(admitePedidos(e.id,p.id),esperado);if(esperado)n++;
  }
  assert.equal(n,9);assert.equal(admitePedidos("otro","p4"),false);assert.equal(admitePedidos(id,"otro"),false);
  assert.throws(()=>crearPedidosPractica(almacen(),id,"p1"));
});
test("subtotal exacto y cargos ilustrativos por modalidad",()=>{
  const r=resumirCarrito(id,catalogo,lineas,"domicilio");
  assert.equal(r.subtotal,14500);assert.equal(r.cargo,3500);assert.equal(r.total,18000);
  assert.equal(resumirCarrito(id,catalogo,lineas,"local").total,14500);
  assert.equal(resumirCarrito(id,catalogo,[],"domicilio").total,0);
  assert.equal(modalidadesPedido("mundo-mascotas").some(m=>m.id==="local"),false);
  assert.throws(()=>resumirCarrito("mundo-mascotas",[],[],"local"));
});
test("rechazo de servicio, agotado, duplicados, cantidades e ID inválido",()=>{
  for(const l of [[{id:"cata",cantidad:1}],[{id:"otro",cantidad:1}],[{id:"espresso",cantidad:21}],[{id:"espresso",cantidad:1.2}],[{id:"espresso",cantidad:0}],[...lineas,lineas[0]]])assert.throws(()=>resumirCarrito(id,catalogo,l,"local"));
  const agotado=catalogo.map(p=>({...p,disponible:false}));
  assert.throws(()=>resumirCarrito(id,agotado,lineas,"local"));
  assert.equal(ofertaPedible(catalogo.find(p=>p.id==="cata")),false);
});
test("creación, fotografía de precios, seguimiento y estados terminales",()=>{
  const a=almacen(),o=opciones(),r=crearPedidosPractica(a,id,"p2",o);
  assert.throws(()=>r.crear(catalogo,[],"local"));
  const p=r.crear(catalogo,lineas,"domicilio");
  assert.equal(p.estado,"recibido");assert.equal(p.total,18000);
  const otro=crearPedidosPractica(a,id,"p4",o);
  assert.equal(otro.leer()[0].folio,p.folio);
  assert.throws(()=>otro.cambiar(p.folio,"recibido","entregado"));
  otro.cambiar(p.folio,"recibido","preparando");
  assert.throws(()=>r.cambiar(p.folio,"recibido","cancelado"));
  otro.cambiar(p.folio,"preparando","listo");assert.throws(()=>otro.cambiar(p.folio,"listo","entregado"));otro.cobrar(p.folio,{accion:"registrar",revision:0,totalEsperado:p.total,metodo:"efectivo",recibidoCentavos:p.total});otro.cambiar(p.folio,"listo","entregado");
  assert.equal(r.leer()[0].historial.length,4);assert.equal(r.leer()[0].estado,"entregado");
  assert.deepEqual(transicionesPedido("entregado"),[]);
  assert.throws(()=>r.cambiar(p.folio,"entregado","cancelado"));
  const editado=catalogo.map(p=>({...p,precioCentavos:1}));assert.equal(resumirCarrito(id,editado,lineas,"local").total,3);
  assert.equal(r.leer()[0].total,18000);
});
test("aislamiento entre negocios y pestañas, cancelación y borrado selectivo",()=>{
  const a=almacen(),o=opciones(),r=crearPedidosPractica(a,id,"p2",o),b=crearPedidosPractica(a,"mundo-mascotas","p2",o);
  const p=r.crear(catalogo,lineas,"local");b.crear(obtenerEstablecimiento("mundo-mascotas").catalogo,[{id:"correa",cantidad:1}],"recoger");
  assert.throws(()=>b.cambiar(p.folio,"recibido","preparando"));
  assert.equal(crearPedidosPractica(almacen(),id,"p2",o).leer().length,0);
  r.cambiar(p.folio,"recibido","cancelado");assert.throws(()=>r.cambiar(p.folio,"cancelado","recibido"));r.restaurar();
  assert.equal(r.leer().length,0);assert.equal(b.leer().length,1);
});
test("límite de historial, copia rechazada si almacenamiento falla",()=>{
  const a=almacen(),r=crearPedidosPractica(a,id,"p2",opciones());
  for(let i=0;i<30;i++)r.crear(catalogo,lineas,"local");
  assert.throws(()=>r.crear(catalogo,lineas,"local"));assert.equal(r.leer().length,30);
  const b=crearPedidosPractica({getItem(){return null},setItem(){throw Error("quota")}},id,"p2",opciones());
  assert.throws(()=>b.crear(catalogo,lineas,"local"));assert.equal(b.leer().length,0);
});
test("historial corrupto no se representa como pedido válido",()=>{
  const a=almacen();a.setItem("lapaz:demo:pedidos:v1:"+id,JSON.stringify({version:1,establecimiento:id,pedidos:[{folio:"DEMO-1",estado:"listo",detalle:[],total:0}]}));
  assert.equal(crearPedidosPractica(a,id,"p2",opciones()).leer().length,0);
});
