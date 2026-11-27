import test from "node:test";
import assert from "node:assert/strict";
import {crearCatalogosLocales,validarOferta,centavosDesdeTexto,imagenOfertaSegura,validarTamanoCatalogo} from "../public/demostraciones/catalogo-local.mjs";
import {establecimientos} from "../public/demostraciones/establecimientos.mjs";
const datos={nombre:"Ejemplo de práctica",categoria:"Pruebas",tipo:"fisico",descripcion:"Sin datos reales",precioCentavos:12345,disponible:true};
function almacenamiento(){
  const map=new Map();return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
}
test("CRUD local en los cinco comercios, sin modificar semillas",()=>{
  const store=almacenamiento(),c=crearCatalogosLocales(store);
  for(const e of establecimientos){
    const n=e.catalogo.length;
    assert.equal(c.crear(e.id,datos),true);
    assert.equal(c.leer(e.id).length,n+1);
    const p=c.leer(e.id).at(-1);
    assert.equal(p.id,"local-1");
    assert.equal(c.editar(e.id,p.id,{...datos,precioCentavos:500,disponible:false}),true);
    assert.equal(c.leer(e.id).at(-1).disponible,false);
    assert.equal(c.leer(e.id).at(-1).precioCentavos,500);
    assert.equal(c.eliminar(e.id,p.id),true);
    assert.equal(c.leer(e.id).length,n);
    assert.equal(e.catalogo.length,n);
  }
});
test("mismo ID de oferta no mezcla establecimientos, persistencia y restauración selectiva",()=>{
  const store=almacenamiento(),c=crearCatalogosLocales(store);
  c.crear("cafe-mirador",datos);c.crear("barberia-elite",{...datos,nombre:"Solo barbería"});
  c.editar("cafe-mirador","local-1",{...datos,nombre:"Solo café"});
  const nuevo=crearCatalogosLocales(store);
  assert.equal(nuevo.leer("cafe-mirador").at(-1).nombre,"Solo café");
  assert.equal(nuevo.leer("barberia-elite").at(-1).nombre,"Solo barbería");
  nuevo.restaurar("cafe-mirador");
  assert.ok(!nuevo.leer("cafe-mirador").some(p=>p.id==="local-1"));
  assert.equal(nuevo.leer("barberia-elite").at(-1).nombre,"Solo barbería");
});
test("lecturas devuelven copias y claves desconocidas son rechazadas",()=>{
  const c=crearCatalogosLocales(almacenamiento());
  const a=c.leer("mundo-mascotas");a[0].nombre="Manipulado";
  assert.notEqual(c.leer("mundo-mascotas")[0].nombre,"Manipulado");
  assert.throws(()=>c.crear("desconocido",datos));
  assert.throws(()=>c.editar("mundo-mascotas","inexistente",datos));
  assert.throws(()=>c.eliminar("mundo-mascotas","inexistente"));
});
test("validación monetaria exacta y rechazo de entradas inválidas",()=>{
  for(const [s,n] of [["0",0],["25.10",2510],["1.01",101],["1000000",100000000]])assert.equal(centavosDesdeTexto(s),n);
  for(const s of ["-1","1.001","1e2","NaN","","1000000.01","1,20"])assert.throws(()=>centavosDesdeTexto(s));
  for(const precio of [-1,0.5,Infinity,100000001])assert.throws(()=>validarOferta({...datos,precioCentavos:precio},"a"));
});
test("atributos tipados e imágenes externas rechazadas",()=>{
  assert.throws(()=>validarOferta({...datos,imagen:"https://example.invalid/x"},"a"));
  const p=validarOferta({...datos,tipo:"servicio",duracionMinutos:30},"a");
  assert.equal(p.duracionMinutos,30);assert.equal(p.imagen,undefined);
  assert.equal(validarOferta({...datos,duracionMinutos:30},"a").duracionMinutos,undefined);
  assert.throws(()=>validarOferta({...datos,tipo:"servicio",duracionMinutos:0},"a"));
  assert.throws(()=>validarOferta({...datos,tipo:"desconocido"},"a"));
  assert.throws(()=>validarOferta({...datos,nombre:" "},"a"));
});
test("almacenamiento corrupto o de otro negocio vuelve a semilla",()=>{
  const store=almacenamiento();store.setItem("lapaz:demo:catalogo:v1:cafe-mirador",JSON.stringify({version:1,establecimiento:"barberia-elite",catalogo:[]}));
  assert.equal(crearCatalogosLocales(store).leer("cafe-mirador").length,6);
  store.setItem("lapaz:demo:catalogo:v1:cafe-mirador","{");
  assert.equal(crearCatalogosLocales(store).leer("cafe-mirador").length,6);
});
test("sin almacenamiento, los cambios se conservan en memoria con aviso de no persistencia",()=>{
  const c=crearCatalogosLocales({getItem(){throw Error("blocked")},setItem(){throw Error("quota")}});
  assert.equal(c.crear("auto-servicio-bahia",datos),false);
  assert.equal(c.leer("auto-servicio-bahia").at(-1).nombre,datos.nombre);
  assert.equal(c.restaurar("auto-servicio-bahia"),false);
  assert.equal(c.leer("auto-servicio-bahia").length,5);
});
test("límite y unicidad de IDs, permite restaurar catálogo vacío",()=>{
  const store=almacenamiento(),c=crearCatalogosLocales(store),id="cafe-mirador";
  for(const p of c.leer(id))c.eliminar(id,p.id);
  assert.equal(crearCatalogosLocales(store).leer(id).length,0);
  for(let i=0;i<100;i++)c.crear(id,datos);
  assert.equal(new Set(c.leer(id).map(p=>p.id)).size,100);
  assert.throws(()=>c.crear(id,datos));
  c.restaurar(id);assert.equal(c.leer(id).length,6);
});

test("foto local validada y eliminada explícitamente, incluso en semillas",()=>{
  const id="taqueria-el-comal",store=almacenamiento(),c=crearCatalogosLocales(store),original=c.leer(id)[0];
  assert.ok(imagenOfertaSegura(original.imagen));
  const muestra="data:image/jpeg;base64,/9j/AA==";
  c.editar(id,original.id,{...original,imagen:muestra});
  assert.equal(crearCatalogosLocales(store).leer(id)[0].imagen,muestra);
  c.editar(id,original.id,{...original,imagen:""});
  assert.equal(crearCatalogosLocales(store).leer(id)[0].imagen,"");
  c.restaurar(id);assert.equal(c.leer(id)[0].imagen,original.imagen);
  assert.throws(()=>validarOferta({...datos,imagen:"/imagenes/pastor.webp"},"local-1"));
  assert.throws(()=>validarOferta({...datos,imagen:"data:image/svg+xml;base64,AAAA"},"local-1"));
  assert.throws(()=>validarOferta({...datos,imagen:"data:image/jpeg;base64,/9j/"+"A".repeat(45000)},"local-1"));
  assert.throws(()=>validarTamanoCatalogo(["á".repeat(160000)]));
});
test("límite total mantiene intacta la copia ante una nueva foto demasiado grande",()=>{
  const c=crearCatalogosLocales(almacenamiento()),id="cafe-mirador",foto="data:image/jpeg;base64,/9j/"+"A".repeat(44000);
  for(let i=0;i<6;i++)c.crear(id,{...datos,imagen:foto});
  const antes=c.leer(id);
  assert.throws(()=>c.crear(id,{...datos,imagen:foto}));
  assert.deepEqual(c.leer(id),antes);
});
