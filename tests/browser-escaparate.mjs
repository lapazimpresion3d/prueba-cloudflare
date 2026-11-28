import {chromium} from "playwright";
import assert from "node:assert/strict";
import {mkdir,writeFile} from "node:fs/promises";
import {establecimientos} from "../public/demostraciones/establecimientos.mjs";
import {planes} from "../public/demostraciones/config.mjs";
import {planesRepresentativos,enlaceCotizacion,enlacesDemo,enlacesPublicosDemo} from "../public/demostraciones/presentaciones.mjs";
const base=process.env.DEMO_URL||"http://127.0.0.1:8787",dir="evidencia-visual";
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true}),resultados=[],errores=[];
const url=x=>new URL(x,base).href;
const navegar=async(page,path)=>{const r=await page.goto(url(path),{waitUntil:"domcontentloaded"});assert.ok(r?.ok(),path);};
const link=async(locator,expected)=>assert.equal(await locator.getAttribute("href"),expected);
const ancho=async page=>{const d=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,ancho:document.documentElement.scrollWidth}));assert.ok(d.ancho<=d.viewport+2,JSON.stringify(d));};
const foto=async(page,n)=>{await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:dir+"/"+n+".png",fullPage:true,animations:"disabled"});};
const caso=async(nombre,viewport,fn)=>{const ctx=await browser.newContext({viewport}),page=await ctx.newPage(),err=[];page.on("pageerror",e=>err.push(e.message));page.on("response",r=>{if(r.status()>=400&&/\.(mjs|css|webp|svg)(?:\?|$)/.test(r.url()))err.push(r.status()+" "+r.url());});try{await fn(page);assert.deepEqual(err,[]);resultados.push({nombre,estado:"ok"});console.log("OK",nombre);}catch(e){errores.push(nombre+": "+e.message+" | "+err.join(" | "));resultados.push({nombre,estado:"error",detalle:e.message});try{await foto(page,"error-"+nombre);}catch{}}finally{await ctx.close();}};
try{
 for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
  await caso("galeria-"+viewport.width,viewport,async page=>{
   await navegar(page,"/");await page.locator(".ejemplo").last().waitFor();
   assert.equal(await page.locator(".ejemplo").count(),6);
   for(const e of establecimientos){const p=planesRepresentativos[e.id],card=page.locator(".ejemplo").filter({has:page.getByRole("heading",{name:e.nombre,exact:true})});assert.equal(await card.count(),1);assert.ok((await card.locator(".plan-representativo").textContent()).startsWith(p.toUpperCase()));const n=await card.locator(".funciones-principales li").count();assert.ok(n>=1&&n<=5);assert.equal(await card.locator("details[open]").count(),0);await link(card.getByRole("link",{name:"Explorar "+e.nombre,exact:true}),enlacesDemo(e.id,p).negocio);await link(card.getByRole("link",{name:"Ver panel administrativo de "+e.nombre,exact:true}),enlacesDemo(e.id,p).administracion);await link(card.getByRole("link",{name:"Me interesa este paquete"}),enlaceCotizacion(e.id,p));}
   await ancho(page);await foto(page,"galeria-"+viewport.width);
   await navegar(page,"/torque-automotriz/panel");await page.locator("html[data-demo-lista=si]").waitFor();assert.equal(await page.locator("#nombre-admin").textContent(),"Torque Automotriz");assert.equal(new URL(page.url()).searchParams.get("plan"),"p3");
   await navegar(page,"/auto-servicio-bahia?plan=p2");await page.locator("#pagina").waitFor();assert.equal(await page.locator("#nombre").textContent(),"Torque Automotriz");assert.equal(new URL(page.url()).searchParams.get("plan"),"p2");
   await navegar(page,"/demostraciones/configurar/?negocio=bahia-tours");await page.locator("#plan option").last().waitFor({state:"attached"});assert.equal(await page.locator("#plan").inputValue(),"p4");
   for(const e of establecimientos){await page.locator("#negocio").selectOption(e.id);for(const p of planes){await page.locator("#plan").selectOption(p.id);const l=enlacesDemo(e.id,p.id,true);await link(page.locator("#abrir"),l.negocio);await link(page.locator("#editar"),l.administracion);await link(page.locator("#cotizar-paquete"),enlaceCotizacion(e.id,p.id));const card=page.locator(".comparacion-plan[data-plan="+p.id+"]");assert.equal(await card.locator("button").getAttribute("aria-pressed"),"true");const pub=enlacesPublicosDemo(e.id,p.id);await link(card.getByRole("link",{name:"Ver página web"}),pub.negocio);await link(card.getByRole("link",{name:"Ver panel administrativo"}),pub.administracion);}}await ancho(page);
  });
  for(const e of establecimientos)for(const p of planes)await caso(e.id+"-"+p.id+"-"+viewport.width,viewport,async page=>{
   await navegar(page,"/"+(e.id==="auto-servicio-bahia"?"torque-automotriz":e.id)+"?plan="+p.id);
   const turismo=e.id==="bahia-tours";
   if(turismo){await page.locator("#catalogo .tour").first().waitFor();assert.equal(new URL(page.url()).searchParams.get("plan"),p.id);assert.equal(await page.locator("#gestion,#panel-comun,#agenda-tours,#pasajeros-tours,#editor-tours,#funciones,#pendientes").count(),0);assert.equal(await page.locator("#mis-reservas").isVisible(),p.id!=="p1");assert.equal(await page.locator("#reservar").isVisible(),p.id!=="p1");assert.equal(await page.locator("#promo-campo").isVisible(),p.id==="p4");await page.locator("#idioma").click();assert.equal(await page.locator("html").getAttribute("lang"),"en");assert.equal(await page.locator("h1").textContent(),"The sea, at your own pace.");assert.match(await page.locator("footer .aviso-imagenes-demo").textContent(),/illustrative images and data/);await page.locator("#idioma").click();}
   else{await page.locator("#pagina").waitFor();assert.equal(await page.locator("#nombre").textContent(),e.nombre);assert.ok(await page.locator("#productos").isVisible());assert.equal(await page.locator(".acceso-empresa").isVisible(),false);}
   assert.equal(await page.locator("select#plan,select[name=plan],.demo select,.demo-bar select").count(),0);
   const admin=page.locator(turismo?"#panel-arriba":"#administracion-arriba");await link(admin,enlacesDemo(e.id,p.id).administracion);await link(page.locator("#cotizar-paquete"),enlaceCotizacion(e.id,p.id));assert.equal(await page.locator(".aviso-imagenes-demo").count(),1);assert.ok(await page.locator("footer .aviso-imagenes-demo").isVisible());assert.match(await page.locator("footer .aviso-imagenes-demo").textContent(),/imágenes y datos ilustrativos/);assert.doesNotMatch(await page.locator("body").innerText(),/Imagen generada con IA|generadas mediante IA|AI-generated image/i);await ancho(page);
   if(p.id===planesRepresentativos[e.id])await foto(page,e.id+"-publica-"+viewport.width);
   await admin.click();await page.locator("html[data-demo-lista=si]").waitFor();assert.equal(new URL(page.url()).searchParams.get("plan"),p.id);await navegar(page,enlacesPublicosDemo(e.id,p.id).administracion);await page.locator("html[data-demo-lista=si]").waitFor();assert.equal(await page.locator("#nombre-admin").textContent(),e.nombre);assert.equal(await page.locator("#admin-plan").textContent(),p.nombre);assert.ok(await page.locator("#admin-inicio").isVisible());
   if(await page.locator("#admin-menu").isVisible()&&await page.locator("#admin-menu").getAttribute("aria-expanded")==="false")await page.locator("#admin-menu").click();
   if(turismo){assert.equal(await page.locator("#admin-turismo").isVisible(),p.id!=="p1");assert.equal(await page.locator("#admin-economia-turismo").isVisible(),["p3","p4"].includes(p.id));assert.equal(await page.locator("#admin-rentabilidad-turismo").isVisible(),p.id==="p4");}
   await ancho(page);if(p.id===planesRepresentativos[e.id])await foto(page,e.id+"-panel-"+viewport.width);
  });
 }
}finally{await browser.close();await writeFile(dir+"/resultados.json",JSON.stringify({resultados,errores},null,2));}
assert.deepEqual(errores,[]);
