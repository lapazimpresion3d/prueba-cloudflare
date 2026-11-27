import {crearPosPractica,admitePos,resumirVenta} from "./pos-practica.mjs";
import {crearPedidosPractica,admitePedidos,ofertaPedible} from "./pedidos-practica.mjs";
import {crearCitasPractica,admiteCitas,serviciosCita,recursosCita,horariosCita,relojLocal,sumarDias} from "./citas-practica.mjs";
import {crearReservasLocales,admiteMesas,horariosMesa} from "./mesas-practica.mjs";
import {obtenerEstablecimiento} from "./establecimientos.mjs";
import {planes} from "./config.mjs";
// Solo almacenamiento local. Preparar en memoria antes de escribir; restauración conservadora.
const marca=(id,plan)=>"lapaz:ejemplos:v1:"+id+":"+plan;
const recetas={
 "taqueria-el-comal":{producto:"pastor",insumos:[["Carne al pastor","g",2000,28000,80],["Tortilla","pza",100,8000,2],["Cebolla","g",1000,2500,10],["Cilantro","g",250,2000,3]]},
 "cafe-mirador":{producto:"espresso",insumos:[["Café molido","g",1000,18000,20]]},
 "barberia-elite":{producto:"corte",insumos:[["Champú","ml",1000,12000,10]]},
 "auto-servicio-bahia":{producto:"aceite",insumos:[["Aceite de motor","ml",20000,240000,4000]]}
};
export function cargarEjemplos(storage,empresaStorage,id,plan,catalogo,{ahora=Date.now,folio=()=>crypto.randomUUID()}={}){
 if(!obtenerEstablecimiento(id)||!planes.some(p=>p.id===plan))throw Error("Demostración desconocida.");
 const key=marca(id,plan);if(storage.getItem(key))throw Error("Ya existe una carga de ejemplo. No se duplicará.");
 const cambios=new Map(),previos=new Map(),resultados=[],opts={ahora,folio};
 const staged={getItem(k){return cambios.has(k)?cambios.get(k):storage.getItem(k);},setItem(k,v){if(!previos.has(k))previos.set(k,storage.getItem(k));cambios.set(k,String(v));}};
 const libre=k=>storage.getItem(k)===null;
 const cat=catalogo.filter(p=>p.disponible!==false);
 if(admitePedidos(id,plan)){
 const k="lapaz:demo:pedidos:v1:"+id;
 if(libre(k)&&cat.some(ofertaPedible)){const repo=crearPedidosPractica(staged,id,plan,opts),productos=cat.filter(ofertaPedible);for(let j=0;j<3;j++){const p=productos[j%productos.length],o=repo.crear(cat,[{id:p.id,cantidad:j+1}],"recoger",{cliente:"cliente-"+(j+1),pago:"efectivo",nota:""});if(j>0)repo.cambiar(o.folio,"recibido","preparando");if(j>1)repo.cambiar(o.folio,"preparando","listo");}resultados.push("3 pedidos");}else resultados.push("Pedidos existentes conservados o catálogo sin productos.");
 }
 if(admiteCitas(id,plan)){
 const k="lapaz:demo:citas:v1:"+id;
 if(libre(k)&&serviciosCita(cat).length){const repo=crearCitasPractica(staged,id,plan,opts),servicio=serviciosCita(cat)[0].id,recurso=recursosCita(id)[0].id;let total=0;for(let j=0;j<2;j++){for(let d=0;d<7;d++){const fecha=sumarDias(relojLocal(ahora()).fecha,d),slot=horariosCita(id,cat,repo.leer(),{servicio,recurso,fecha},ahora())[0];if(!slot)continue;const c=repo.crear(cat,{servicio,recurso,fecha,inicio:slot.inicio,datosCliente:{cliente:"cliente-"+(j+1),nota:""}});if(j)repo.cambiar(c.folio,"pendiente","confirmada");total++;break;}}resultados.push(total+" citas");}else resultados.push("Agenda existente conservada o sin servicios.");
 }
 if(admiteMesas(id,plan)){
 const k="lapaz:demo:reservas:v1:taqueria-el-comal";if(libre(k)){const repo=crearReservasLocales(staged,opts);for(let j=0;j<2;j++){for(let d=0;d<7;d++){const fecha=sumarDias(relojLocal(ahora()).fecha,d),slot=horariosMesa(repo.leer(),fecha,2,ahora())[0];if(!slot)continue;const c=repo.crear({fecha,personas:2,mesa:slot.mesas[0],inicio:slot.inicio,datosCliente:{cliente:"cliente-"+(j+1),nota:""}});if(j)repo.cambiar(c.solicitud,"pendiente","confirmada");break;}}resultados.push("Reservaciones de ejemplo");}else resultados.push("Reservaciones existentes conservadas.");
 }
 if(admitePos(id,plan)){
 const k="lapaz:pos:practica:v1:"+id+":"+plan;
 if(libre(k)&&cat.length){const p=crearPosPractica(staged,id,plan,{...opts,empresaStorage}),s=p.empresa().sucursal,e=0,rec=plan==="p4"?recetas[id]:null;
 const bienes=cat.filter(x=>x.tipo!=="servicio"&&x.id!==rec?.producto&&!(id==="taqueria-el-comal"&&plan==="p4"&&x.id==="combo-el-comal")).slice(0,5);
 for(let j=0;j<bienes.length;j++)p.configurarStock(s,e,cat,bienes[j].id,{activo:true,sku:"DEMO-"+(j+1),minimo:5,inicial:[25,3,0,12,8][j]});
 if(bienes.length){const art=bienes.slice(0,3).map(x=>({id:x.id,costo:Math.round(x.precioCentavos*.55)})),pr=p.proveedor(s,e,"",{nombre:"Distribuidora de ejemplo",activo:true,articulos:art},cat),o=p.ordenar(s,e,pr.id,[{id:art[0].id,cantidad:10}]);p.recibirOrden(s,e,o.folio,art[0].id,4);resultados.push("Inventario, proveedor y compra parcial");}
 if(rec&&cat.some(x=>x.id===rec.producto)){const componentes=rec.insumos.map(([nombre,unidad,stock,valor,cantidad])=>({id:p.nuevoInsumo(s,e,{nombre,unidad,stock,valor}).id,cantidad}));p.editarReceta(s,e,cat,rec.producto,{rendimiento:1,merma:0,indirecto:0,componentes});resultados.push("Receta e insumos");}
 const producto=cat.find(x=>x.id===rec?.producto)??bienes[0]??cat.find(x=>x.tipo==="servicio");if(producto){const lineas=[{id:producto.id,cantidad:1}],total=resumirVenta(id,cat,lineas).total;p.abrir(s,e,50000);p.vender(cat,lineas,{sucursal:s,empleado:e,descuento:0,totalEsperado:total,metodo:"efectivo",recibidoCentavos:total});p.cerrar(s,e,50000+total);p.abrir(s,e,50000);resultados.push("Venta, ticket, corte y caja abierta");}
 }else resultados.push("Operaciones de POS existentes conservadas o catálogo vacío.");
 }
 // No tocar preferencias de servidor: los ejemplos solo se muestran en modo local.
 const escrituras=[...cambios].map(([k,v])=>({k,antes:previos.get(k),despues:v}));
 if(!escrituras.length)return {resultados,creados:0};
 const aplicados=[];try{for(const x of escrituras){storage.setItem(x.k,x.despues);aplicados.push(x);}storage.setItem(key,JSON.stringify(escrituras));}catch(e){for(const x of aplicados.reverse()){if(x.antes===null)storage.removeItem(x.k);else storage.setItem(x.k,x.antes);}throw e;}
 return {resultados,creados:escrituras.length};
}
export function retirarEjemplos(storage,id,plan){const key=marca(id,plan),raw=storage.getItem(key);if(!raw)return {retirados:0,conservados:0};const xs=JSON.parse(raw);if(!Array.isArray(xs)||xs.some(x=>!x||typeof x.k!=="string"||typeof x.despues!=="string"||x.antes!==null))throw Error("Registro de ejemplo inválido.");
 const permitidos=["lapaz:demo:pedidos:v1:"+id,"lapaz:demo:citas:v1:"+id,"lapaz:pos:practica:v1:"+id+":"+plan,...(id==="taqueria-el-comal"?["lapaz:demo:reservas:v1:taqueria-el-comal"]:[])];if(xs.some(x=>!permitidos.includes(x.k)))throw Error("Registro fuera de alcance.");
 let retirados=0,conservados=0;for(const x of xs){if(storage.getItem(x.k)===x.despues){storage.removeItem(x.k);retirados++;}else conservados++;}storage.removeItem(key);return {retirados,conservados};}
export function recorridos(disponibles){const tiene=k=>disponibles.includes(k);return [
 {nombre:"Personalizar mi página",pasos:[["admin-catalogo","Edita un producto o servicio y guarda."],["admin-perfil","Cambia la información comercial y revisa tu página."]]},
 ...(tiene("admin-pedidos")?[{nombre:"Atender un pedido",pasos:[["admin-pedidos","abre un pedido recibido. Avanza su estado."],...(tiene("admin-cocina")?[["admin-cocina","Consulta las comandas y marca un pedido listo."]]:[])]}]:[]),
 ...(tiene("admin-citas")?[{nombre:"Organizar la agenda",pasos:[["admin-citas","confirma una cita pendiente."]]}]:[]),
 ...(tiene("admin-pos")?[{nombre:"Realizar una venta",pasos:[["admin-caja","Comprueba que la caja esté abierta."],["admin-pos","Agrega un producto y confirma un cobro simulado."],["admin-comprobantes","Consulta el ticket."],["admin-inventario","Revisa el movimiento de existencias."]]}, {nombre:"Abastecer inventario",pasos:[["admin-compras","Abre la orden de ejemplo y recibe unidades pendientes."],["admin-inventario","Comprueba que las existencias aumentaron."]]}]:[]),
 ...(tiene("admin-recetas")?[{nombre:"Consultar costos",pasos:[["admin-recetas","Consulta los insumos y el costo de una receta. Si no existe, crea una."]]}]:[])
 ].filter(t=>t.pasos.every(([k])=>tiene(k)));}
