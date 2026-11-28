import {chromium} from "playwright";
import assert from "node:assert/strict";
import {establecimientos} from "../public/demostraciones/establecimientos.mjs";
import {planes} from "../public/demostraciones/config.mjs";
import {enlacesAdmin} from "../public/demostraciones/navegacion-admin.mjs";
const base=process.env.DEMO_URL||"http://127.0.0.1:8787";
const browser=await chromium.launch({headless:true});
const listo=async page=>{await page.locator("html[data-modulo-estado=listo]").waitFor();assert.ok(await page.locator(".admin-sidebar").isVisible());assert.ok(await page.locator("main").isVisible());assert.ok(!(await page.locator("#arranque-modulo").isVisible()));};
const menu=async(page,id)=>{const n=page.locator(id);if(await n.isVisible()&&await n.getAttribute("aria-expanded")==="false")await n.click();};
const abrir=async(page,url)=>{await page.goto(new URL(url,base).href,{waitUntil:"commit"});};
const esperarInicio=async page=>{await page.locator("html[data-demo-lista=si]").waitFor();assert.ok(await page.locator("#cabecera-admin").isVisible());assert.ok(await page.locator("#admin-inicio").isVisible());};
const errores=[];
try{
 // Retener el módulo solicitado, no un retardo artificial de la interfaz.
 const ctx=await browser.newContext({viewport:{width:1280,height:900}});
 try{
  const page=await ctx.newPage();
  for(const [url,patron,loader,ready] of [
   ["/cafe-mirador/panel?plan=p1",/\/demostraciones\/app\.mjs(?:\?|$)/,"#arranque-panel",esperarInicio],
   ["/demostraciones/soporte/?negocio=cafe-mirador&plan=p1",/\/demostraciones\/soporte\/app\.mjs(?:\?|$)/,"#arranque-modulo",listo]
  ]){
   let liberar;const espera=new Promise(r=>{liberar=r;});
   await page.route(patron,async route=>{await espera;await route.continue();});
   try{await abrir(page,url);if(loader==="#arranque-modulo"){await page.locator("html[data-modulo-estado=navegando]").waitFor();assert.ok(await page.locator(".admin-sidebar").isVisible());assert.ok(await page.locator("body>header").isVisible());assert.ok(!(await page.locator("main").isVisible()));assert.ok(!(await page.locator(loader).isVisible()));}
    else{await page.locator(loader).waitFor({state:"attached"});assert.ok(!(await page.locator(loader).isVisible()));assert.ok(!(await page.locator("#introduccion").isVisible()));}
   }finally{liberar();}
   await ready(page);await page.unroute(patron);
  }
  const fallo=/\/demostraciones\/soporte\/app\.mjs(?:\?|$)/;
  await page.route(fallo,route=>route.abort());
  await abrir(page,"/demostraciones/soporte/?negocio=cafe-mirador&plan=p1");
  await page.locator("html[data-modulo-estado=error]").waitFor();
  assert.ok(await page.locator("#arranque-modulo [role=alert]").isVisible());
  assert.ok(await page.locator("#arranque-modulo a").isVisible());
  assert.ok(!(await page.locator("main").isVisible()));
  await page.unroute(fallo);
  await page.getByRole("button",{name:"Reintentar",exact:true}).click();await listo(page);
  console.log("OK arranque retenido, fallo y recuperación");
 }finally{await ctx.close();}
 // Navegación real entre inicio, soporte y suscripción: 24 combinaciones en dos tamaños.
 for(const viewport of [{width:1280,height:900},{width:390,height:844}])for(const e of establecimientos)for(const p of planes){
  const ctx=await browser.newContext({viewport}),page=await ctx.newPage(),errs=[];
  page.on("pageerror",err=>errs.push(err.message));page.on("console",msg=>{if(msg.type()==="error"&&/Inicio de (demostración|módulo):/.test(msg.text()))errs.push(msg.text());});
  page.on("response",res=>{if(res.status()>=400&&/\.(?:mjs|css)(?:\?|$)/.test(res.url()))errs.push(res.status()+" "+res.url());});
  try{
   await abrir(page,"/"+e.id+"/panel?plan="+p.id);await esperarInicio(page);await menu(page,"#admin-menu");
   if(e.id==="bahia-tours"){const grupos=await page.locator("#admin-nav .admin-grupo:not([hidden]) h2").allTextContents();assert.ok(grupos.includes("Experiencias y reservaciones"));assert.equal(grupos.includes("Productos y abastecimiento"),false);assert.equal(grupos.includes("Finanzas"),["p3","p4"].includes(p.id));}
   await page.locator("#admin-soporte").click();await listo(page);if(e.id==="bahia-tours")assert.ok((await page.locator(".admin-sidebar h2").allTextContents()).includes("Experiencias y reservaciones"));assert.ok(await page.locator("#contenido").isVisible());
   assert.ok((await page.locator("#contexto").textContent()).includes(e.nombre));
   assert.equal(await page.locator(".admin-sidebar a[aria-current=page]").count(),1);
   await menu(page,".admin-menu-toggle");await page.locator('.admin-sidebar a[href*="/suscripcion/"]').click();await listo(page);assert.ok(await page.locator("#contenido").isVisible());
   const q=new URL(page.url()).searchParams;assert.equal(q.get("negocio"),e.id);assert.equal(q.get("plan"),p.id);
   await page.locator(".admin-breadcrumb a").click();await esperarInicio(page);
   assert.deepEqual(errs,[]);console.log("OK navegación",viewport.width,e.id,p.id);
  }catch(err){errores.push(viewport.width+" "+e.id+" "+p.id+": "+err.message+" | "+errs.join(" | "));}finally{await ctx.close();}
 }
 // Una visita por ruta administrativa distinta, respetando negocio y plan compatibles.
 const vistos=new Set();
 const ctx2=await browser.newContext({viewport:{width:1280,height:900}});
 try{const page=await ctx2.newPage();
  for(const e of establecimientos)for(const p of planes)for(const url of Object.values(enlacesAdmin(e.id,p.id))){
   const u=new URL(url,base),key=u.pathname+"?vista="+(u.searchParams.get("vista")||"");if(u.pathname==="/demostraciones/"||vistos.has(key))continue;vistos.add(key);
   try{await abrir(page,url);await listo(page);console.log("OK módulo",key);}catch(err){errores.push(key+": "+err.message);}
  }
  // Las rutas de cliente que comparten arranque no adquieren menú administrativo.
  for(const [url,elemento] of [["/demostraciones/citas/?negocio=barberia-elite&plan=p2","#contenido"],["/demostraciones/reservaciones/?negocio=taqueria-el-comal&plan=p4","#contenido"]]){
   await abrir(page,url);await page.locator("html[data-modulo-estado=listo]").waitFor();assert.equal(await page.locator(".admin-sidebar").count(),0);assert.ok(await page.locator(elemento).isVisible());
  }
 }finally{await ctx2.close();}
}finally{await browser.close();}
assert.deepEqual(errores,[]);
