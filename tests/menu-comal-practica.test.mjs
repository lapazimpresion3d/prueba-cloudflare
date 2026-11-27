import test from "node:test";
import assert from "node:assert/strict";
import {obtenerEstablecimiento} from "../public/demostraciones/establecimientos.mjs";
import {normalizarOpciones,claveLinea,textoLinea} from "../public/demostraciones/menu-comal-practica.mjs";
import {resumirCarrito,crearPedidosPractica} from "../public/demostraciones/pedidos-practica.mjs";
import {prepararSolicitudPedido} from "../public/demostraciones/pedidos-remotos.mjs";
const id="taqueria-el-comal",cat=obtenerEstablecimiento(id).catalogo;
const op=(omitir=[],extras=[],variante="")=>({omitir,extras,variante});
const line=(id,opciones,cantidad=1)=>({id,cantidad,opciones});
const resumen=(lineas,catalogo=cat)=>resumirCarrito(id,catalogo,lineas,"recoger");
test("menu completo y producto agotado",()=>{
 assert.equal(cat.length,9);
 assert.equal(cat.find(x=>x.id==="jamaica").disponible,false);
 assert.throws(()=>resumen([{id:"jamaica",cantidad:1}]));
});
test("ingredientes y extras conservan partidas distintas y precios",()=>{
 const r=resumen([line("pastor",op(["cebolla"],["queso"]),2),line("pastor",op())]);
 assert.equal(r.total,9500);assert.equal(r.detalle.length,2);
 assert.ok(textoLinea(r.detalle[0]).includes("Sin Cebolla"));
 assert.ok(textoLinea(r.detalle[0]).includes("Queso extra"));
 assert.notEqual(claveLinea(r.detalle[0]),claveLinea(r.detalle[1]));
 assert.throws(()=>resumen([line("pastor",op()),line("pastor",op())]));
});
test("variantes de combo y tamaño de bebida, disponibilidad dependiente",()=>{
 assert.equal(resumen([line("combo-el-comal",op([],[],"refresco")),line("agua",op([],[],"grande"))]).total,12000);
 const mod=cat.map(p=>p.id==="refresco"?{...p,disponible:false}:p);
 assert.throws(()=>resumen([line("combo-el-comal",op([],[],"refresco"))],mod));
 assert.equal(resumen([line("combo-el-comal",op([],[],"agua"))],mod).total,8500);
});
test("rechaza extras duplicados, desconocidos, excesivos e ingredientes obligatorios",()=>{
 for(const x of [line("pastor",op([],["queso","queso"])),line("pastor",op([],["inventado"])),line("quesadilla",op([],["carne_asada","champiñones","aguacate"])),line("quesadilla",op(["queso"])),line("agua",op([],[],"gigante"))])assert.throws(()=>resumen([x]));
});
test("persiste opciones y las envía al servidor con precio esperado",()=>{
 const m=new Map(),almacen={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};
 const repo=crearPedidosPractica(almacen,id,"p4",{folio:()=>"1"});
 const p=repo.crear(cat,[line("pastor",op(["cilantro"],["queso"])),line("pastor",op())],"recoger");
 assert.equal(crearPedidosPractica(almacen,id,"p4").leer()[0].detalle.length,2);
 assert.equal(repo.cambiar(p.folio,"recibido","preparando").detalle[0].opciones.omitir[0],"cilantro");
 const d=prepararSolicitudPedido(p,false,"id");
 assert.equal(d.lineas[0].precioEsperado,3500);assert.deepEqual(d.lineas[0].opciones,op(["cilantro"],["queso"]));
});
test("otros giros no admiten modificadores de El Comal",()=>{
 const e=obtenerEstablecimiento("cafe-mirador");
 assert.throws(()=>resumirCarrito(e.id,e.catalogo,[line("espresso",op([],["queso"]))],"local"));
 assert.equal(resumirCarrito(e.id,e.catalogo,[{id:"espresso",cantidad:1}],"local").total,4500);
});
