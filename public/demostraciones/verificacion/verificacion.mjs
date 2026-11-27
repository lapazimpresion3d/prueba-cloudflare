import {admiteCuentas} from "../cuentas-practica.mjs";
import {admiteMesas} from "../mesas-practica.mjs";
import {establecimientos} from "../establecimientos.mjs";
import {admitePedidos} from "../pedidos-practica.mjs";
import {admiteCitas} from "../citas-practica.mjs";
const $=id=>document.getElementById(id);
const el=(tag,t)=>{const e=document.createElement(tag);if(t!==undefined)e.textContent=t;return e;};
async function comprobar(){
 $("comprobar").disabled=true;$("resultados").replaceChildren();$("resumen").textContent="Comprobando este despliegue…";
 let correctos=0,total=0;
 for(const e of establecimientos){
  const card=el("section");card.className="cabecera-admin";card.append(el("h2",e.nombre));
  for(const plan of e.id==="taqueria-el-comal"?["p1","p2","p4"]:["p1","p2"]){
   const q=new URLSearchParams({negocio:e.id,plan});
   const a=el("a",plan.toUpperCase()+" · Abrir página");a.href="../negocio/?"+q;
   const p=el("p");const admin=el("a","Abrir panel");admin.href="../?"+q+"&vista=administracion";p.append(a,el("span"," · "),admin,el("span"," · "));
   total++;
   try{
    const r=await fetch("/api/demo/contexto?"+q,{cache:"no-store",credentials:"same-origin"});
    if(!r.ok)throw Error("HTTP "+r.status);
    const v=await r.json();
    if(v.establecimiento?.id!==e.id||v.plan?.id!==plan)throw Error("Contexto incorrecto");
    const flags=[["Catálogo",v.persistenciaConfigurada],["Identidad",v.perfilConfigurado]];
    if(admitePedidos(e.id,plan))flags.push(["Pedidos",v.pedidosConfigurados]);
    if(admiteCitas(e.id,plan))flags.push(["Citas",v.citasConfiguradas]);
    if(admiteMesas(e.id,plan))flags.push(["Reservaciones",v.reservacionesConfiguradas]);
    if(admiteCuentas(e.id,plan))flags.push(["Cuentas",v.cuentasConfiguradas],["Pagos múltiples",v.pagosMultiplesConfigurados],["Terminales",v.terminalesConfiguradas]);
    const listo=flags.every(x=>x[1]===true);
    if(listo)correctos++;
    p.append(el("strong",listo?"Configuración correcta":"Configuración pendiente"),el("span"," · "+flags.map(([n,b])=>n+": "+(b===true?"sí":"no")).join(" / ")));
   }catch(error){p.append(el("strong","No comprobado · "+error.message));}
   card.append(p);
  }
  $("resultados").append(card);
 }
 $("resumen").textContent=correctos+" de "+total+" contextos con configuración requerida. Las pruebas de uso y publicación siguen pendientes.";$("comprobar").disabled=false;
}
$("comprobar").addEventListener("click",comprobar);comprobar();
