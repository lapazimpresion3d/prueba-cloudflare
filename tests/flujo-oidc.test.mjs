import {crearIdentificacionProspecto} from "../src/prospectos-oidc.mjs";
import {crearAltaAutorizada} from "../src/alta-autorizada.mjs";
import {crearRecuperacionCuenta,crearLimiteOidc} from "../src/recuperacion-cuenta.mjs";
import {crearAccesoCentral} from "../src/acceso-central.mjs";
import test from "node:test";import assert from "node:assert/strict";import {DatabaseSync} from "node:sqlite";import {readFileSync,readdirSync} from "node:fs";import {crearAccesoComercial} from "../src/acceso-comercial.mjs";import {crearFlujoOidc} from "../src/flujo-oidc.mjs";
const emisor="https://id.example.invalid",retorno="https://app.example.invalid/callback",audiencia="test";
const keys=await crypto.subtle.generateKey({name:"RSASSA-PKCS1-v1_5",modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:"SHA-256"},true,["sign","verify"]);
const jwk={...await crypto.subtle.exportKey("jwk",keys.publicKey),kid:"test",alg:"RS256",use:"sig"};
const config={emisor,retorno,audiencia,claves:[jwk],acrCentral:"mfa",autorizacion:emisor+"/authorize",intercambio:emisor+"/token",secreto:"test-secret"};
const b64=x=>Buffer.from(x).toString("base64url");
async function fixture(){const sql=new DatabaseSync(":memory:");for(const f of readdirSync(new URL("../migrations-comercios/",import.meta.url)).filter(x=>x.endsWith(".sql")).sort())sql.exec(readFileSync(new URL("../migrations-comercios/"+f,import.meta.url),"utf8"));const db={prepare(q){return {first:async()=>sql.prepare(q).get(),bind(...a){return {first:async()=>sql.prepare(q).get(...a),run:async()=>sql.prepare(q).run(...a),all:async()=>({results:sql.prepare(q).all(...a)})}}}}};let n=1000000000,auth,calls=0,fallo=false,sujeto="u";const transporte=async (url,opt)=>{calls++;assert.equal(url,config.intercambio);assert.equal(opt.redirect,"error");assert.equal(opt.body.get("redirect_uri"),retorno);assert.equal(b64(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(opt.body.get("code_verifier")))),auth.searchParams.get("code_challenge"));if(fallo)throw Error("private error");const c={iss:emisor,aud:audiencia,sub:sujeto,email:"u@example.invalid",email_verified:true,nonce:auth.searchParams.get("nonce"),iat:n/1000,auth_time:n/1000,exp:n/1000+300,acr:"mfa"};const t=b64(JSON.stringify({alg:"RS256",kid:"test"}))+"."+b64(JSON.stringify(c));return Response.json({id_token:t+"."+b64(await crypto.subtle.sign("RSASSA-PKCS1-v1_5",keys.privateKey,new TextEncoder().encode(t))),access_token:"not-returned"});};db.batch=async stm=>{sql.exec("BEGIN");try{const results=[];for(const st of stm){results.push(await st.all());}sql.exec("COMMIT");return results;}catch(e){sql.exec("ROLLBACK");throw e;}};const env={COMMERCE_DB:db},f=await crearFlujoOidc(env,{habilitado:true,config,reloj:()=>n,transporte});const iniciar=async()=>{const x=await f.iniciar(new Request("https://app.example.invalid/login",{method:"POST",headers:{Origin:"https://app.example.invalid"}}),{central:true});auth=new URL(x.url);return x};const req=(x,extra="")=>new Request(retorno+"?code=test&state="+auth.searchParams.get("state")+extra,{headers:{Cookie:x.cookie.split(";")[0]}});return {f,iniciar,req,sql,env,transporte,reloj:()=>n,ponerAuth:u=>auth=new URL(u),calls:()=>calls,expirar:()=>n+=300000,fallar:()=>fallo=true,cambiarSujeto:v=>sujeto=v};}
test("PKCE, navegador, consumo único y verificación firmada",async()=>{const x=await fixture(),inicio=await x.iniciar();assert.match(inicio.cookie,/HttpOnly; SameSite=Lax/);await assert.rejects(x.f.completar(new Request(x.req(inicio).url)));await assert.rejects(x.f.completar(x.req(inicio,"&state=duplicado")));assert.equal(x.calls(),0);const resultados=await Promise.allSettled([x.f.completar(x.req(inicio)),x.f.completar(x.req(inicio))]);assert.equal(resultados.filter(r=>r.status==="fulfilled").length,1);const r=resultados.find(r=>r.status==="fulfilled").value;assert.equal(r.identidad.mfaCentral,true);assert.equal(r.contexto,"central");assert.ok(!JSON.stringify(r).includes("not-returned"));assert.equal(x.calls(),1);});
test("caducidad y fallo de proveedor consumen solo solicitudes válidas",async()=>{const x=await fixture();let i=await x.iniciar();x.expirar();await assert.rejects(x.f.completar(x.req(i)));assert.equal(x.calls(),0);i=await x.iniciar();x.fallar();await assert.rejects(x.f.completar(x.req(i)),/Autenticación no completada/);await assert.rejects(x.f.completar(x.req(i)));assert.equal(x.calls(),1);});

test("OIDC comercial integra sesión, empresas, suscripción y revocación",async()=>{const x=await fixture(),a=await crearAccesoComercial(x.env,{habilitado:true,config,reloj:x.reloj,transporte:x.transporte});const post=(path,cookie="")=>new Request("https://app.example.invalid/"+path,{method:"POST",headers:{Origin:"https://app.example.invalid",Cookie:cookie}});const get=(path,cookie="")=>new Request("https://app.example.invalid/"+path,{headers:{Cookie:cookie}});async function iniciar(){const i=await a.iniciar(post("login"));x.ponerAuth(i.url);return i;}
let i=await iniciar();await assert.rejects(a.completar(x.req(i)));assert.equal(x.sql.prepare("SELECT count(*) n FROM comercio_sesiones").get().n,0);
x.sql.exec("INSERT INTO usuarios(id,emisor,sujeto) VALUES('u','https://id.example.invalid','u'); INSERT INTO empresas(id,nombre) VALUES('a','A'),('b','B'); INSERT INTO sucursales(empresa,id,nombre) VALUES('a','s','S'); INSERT INTO roles VALUES('a','propietario','Owner'); INSERT INTO rol_permisos VALUES('a','propietario','empresa.ver'); INSERT INTO membresias VALUES('a','u','propietario',1,'empresa'); INSERT INTO comercial_planes VALUES('p1',1,'P1',0,0,'MXN',1,1,'[]'); INSERT INTO comercial_suscripciones VALUES('a','p1',1,'activa',0,2000000000,1)");
i=await iniciar();const r=await a.completar(x.req(i)),cookie=r.cookies[1].split(";")[0];assert.equal(r.cookies.length,2);assert.match(r.cookies[0],/Max-Age=0/);assert.equal((await a.empresas(get("empresas",cookie))).length,1);assert.equal((await a.seleccionar(post("seleccionar",cookie),{empresa:"a"})).plan,"p1");await assert.rejects(a.seleccionar(post("seleccionar",cookie),{empresa:"b"}));await assert.rejects(a.completar(x.req(i)));const central=await x.iniciar();await assert.rejects(a.completar(x.req(central)));assert.equal(x.sql.prepare("SELECT count(*) n FROM comercio_sesiones").get().n,1);await a.cerrar(post("cerrar",cookie));await assert.rejects(a.empresas(get("empresas",cookie)));});

test("sesión central separada, MFA, rotación, reautenticación y revocación",async()=>{const x=await fixture(),a=await crearAccesoCentral(x.env,{habilitado:true,config,reloj:x.reloj,transporte:x.transporte});const post=(cookie="")=>new Request("https://app.example.invalid/central",{method:"POST",headers:{Origin:"https://app.example.invalid",Cookie:cookie}});const get=(cookie="")=>new Request("https://app.example.invalid/central",{headers:{Cookie:cookie}});async function inicio(){const i=await a.iniciar(post());x.ponerAuth(i.url);return i;}
let i=await inicio();await assert.rejects(a.completar(x.req(i)));x.sql.exec("INSERT INTO central_operadores(id,emisor,sujeto) VALUES('op','https://id.example.invalid','u')");i=await inicio();const r=await a.completar(x.req(i)),c=r.cookies[1].split(";")[0];assert.match(c,/^__Host-lapaz-central=/);assert.equal((await a.autenticarCentral(post(c))).sujeto,"u");assert.equal(await a.autenticarCentral(get(c.replace("lapaz-central","lapaz-comercial"))),null);await assert.rejects(a.completar(x.req(i)));x.expirar();assert.equal(await a.autenticarCentral(post(c)),null);assert.equal((await a.autenticarCentral(get(c))).sujeto,"u");i=await inicio();const next=(await a.completar(x.req(i))).cookies[1].split(";")[0];assert.equal(await a.autenticarCentral(get(c)),null);assert.ok(await a.autenticarCentral(post(next)));x.sql.exec("UPDATE central_operadores SET activo=0 WHERE id='op'; UPDATE central_operadores SET activo=1 WHERE id='op'");assert.equal(await a.autenticarCentral(get(next)),null);i=await inicio();const last=(await a.completar(x.req(i))).cookies[1].split(";")[0];await a.cerrar(post(last));assert.equal(await a.autenticarCentral(get(last)),null);});

test("recuperación OIDC separada revoca solo identidad verificada y registra evento",async()=>{const x=await fixture();x.sql.exec("INSERT INTO usuarios(id,emisor,sujeto) VALUES('u','https://id.example.invalid','u'),('v','https://id.example.invalid','v'); INSERT INTO comercio_sesiones(hash,usuario,creado,expira,ultima) VALUES('"+ "a".repeat(64)+"','u',1,2000000000,1),('"+ "b".repeat(64)+"','v',1,2000000000,1)");const a=await crearRecuperacionCuenta(x.env,{habilitado:true,config,reloj:x.reloj,transporte:x.transporte,limitarInicio:async()=>true});const post=new Request("https://app.example.invalid/login",{method:"POST",headers:{Origin:"https://app.example.invalid"}});const i=await a.iniciar(post);x.ponerAuth(i.url);assert.equal(new URL(i.url).searchParams.get("prompt"),"login");await assert.rejects(x.f.completar(x.req(i)));const r=await a.completar(x.req(i));assert.equal(r.recuperada,true);assert.equal(x.sql.prepare("SELECT revocado FROM comercio_sesiones WHERE usuario='u'").get().revocado,x.reloj());assert.equal(x.sql.prepare("SELECT revocado FROM comercio_sesiones WHERE usuario='v'").get().revocado,null);assert.equal(x.sql.prepare("SELECT count(*) n FROM comercio_recuperaciones").get().n,1);await assert.rejects(a.completar(x.req(i)));});
test("límite atómico por origen confiable",async()=>{const x=await fixture(),r=new Request("https://app.example.invalid/login");const limite=await crearLimiteOidc(x.env,{habilitado:true,secreto:"s".repeat(32),origenConfiable:()=> "test-origin",reloj:x.reloj});for(let i=0;i<10;i++)assert.equal(await limite(r),true);assert.equal(await limite(r),false);x.expirar();x.expirar();assert.equal(await limite(r),true);assert.ok(!JSON.stringify(x.sql.prepare("SELECT * FROM comercio_limites_oidc").all()).includes("test-origin"));});

test("prospecto: propósito separado, prueba opaca y consumo atómico por central",async()=>{
 const x=await fixture(),op={habilitado:true,config,reloj:x.reloj,transporte:x.transporte,limitarInicio:async()=>true};
 const p=await crearIdentificacionProspecto(x.env,op);
 const post=new Request("https://app.example.invalid/prospecto",{method:"POST",headers:{Origin:"https://app.example.invalid"}});
 const inicio=await p.iniciar(post);x.ponerAuth(inicio.url);
 assert.equal(new URL(inicio.url).searchParams.get("prompt"),"login");
 await assert.rejects(x.f.completar(x.req(inicio)));
 const prueba=await p.completar(x.req(inicio));
 assert.match(prueba.prueba,/^[a-f0-9]{64}$/);
 assert.ok(!JSON.stringify(prueba).includes("u@example.invalid"));
 assert.ok(!JSON.stringify(x.sql.prepare("SELECT * FROM comercio_prospectos_oidc").all()).includes(prueba.prueba));
 await assert.rejects(p.completar(x.req(inicio)));
 assert.equal(x.sql.prepare("SELECT count(*) n FROM usuarios").get().n,0);
 assert.equal(x.sql.prepare("SELECT count(*) n FROM comercio_sesiones").get().n,0);
 const token="a".repeat(64),hash=Buffer.from(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token))).toString("hex");
 x.sql.exec("INSERT INTO central_operadores(id,emisor,sujeto) VALUES('op','issuer','central'); INSERT INTO comercial_planes VALUES('p1',1,'P1',75000,14900,'MXN',1,1,'[]')");
 x.sql.prepare("INSERT INTO central_sesiones(hash,operador,creado,expira,ultima) VALUES(?,'op',?,?,?)").run(hash,x.reloj(),x.reloj()+100000,x.reloj());
 const alta=await crearAltaAutorizada(x.env,{habilitado:true,reloj:x.reloj,autenticarCentral:async()=>({emisor:"issuer",sujeto:"central"}),verificarPropietario:async()=>null});
 const req=new Request(post.url,{method:"POST",headers:{Origin:"https://app.example.invalid",Cookie:"__Host-lapaz-central="+token}});
 const d={nombre:"Tienda",sucursal:"Principal",giro:"tienda",plan:"p1",version:1};
 await assert.rejects(alta.prepararProspecto(req,{...d,sujeto:"impostor"},prueba.prueba));
 await assert.rejects(alta.prepararProspecto(post,d,prueba.prueba));
 const r=await alta.prepararProspecto(req,d,prueba.prueba);
 assert.equal(x.sql.prepare("SELECT sujeto FROM comercio_altas_pendientes WHERE id=?").get(r.id).sujeto,"u");
 assert.equal(x.sql.prepare("SELECT count(*) n FROM comercio_prospectos_oidc").get().n,0);
 await assert.rejects(alta.prepararProspecto(req,d,prueba.prueba));
 assert.equal(x.sql.prepare("SELECT count(*) n FROM empresas").get().n,0);
});

test("aceptación OIDC vinculada, identidad exacta, rollback y consumo único",async()=>{
 const x=await fixture(),n=x.reloj(),token="a".repeat(64),h=Buffer.from(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token))).toString("hex");
 x.sql.exec("PRAGMA foreign_keys=ON; INSERT INTO central_operadores(id,emisor,sujeto) VALUES('op','issuer','central'); INSERT INTO comercial_planes VALUES('p1',1,'P1',75000,14900,'MXN',1,1,'[]')");
 x.sql.prepare("INSERT INTO central_sesiones(hash,operador,creado,expira,ultima) VALUES(?,'op',?,?,?)").run(h,n,n+600000,n);
 const a=await crearAltaAutorizada(x.env,{habilitado:true,reloj:x.reloj,autenticarCentral:async()=>({emisor:"issuer",sujeto:"central"}),verificarPropietario:async()=>null,configAlta:config,transporte:x.transporte,limitarInicio:async()=>true});
 const post=new Request("https://app.example.invalid/alta",{method:"POST",headers:{Origin:"https://app.example.invalid",Cookie:"__Host-lapaz-central="+token}});
 const prueba="b".repeat(64),ph=Buffer.from(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(prueba))).toString("hex");
 x.sql.prepare("INSERT INTO comercio_prospectos_oidc VALUES(?,?,?,?,?)").run(ph,emisor,"u",n,n+600000);
 const p=await a.prepararProspecto(post,{nombre:"Tienda",sucursal:"Principal",giro:"tienda",plan:"p1",version:1},prueba);
 let j=await a.emitirInvitacion(post,p.id);
 const anterior=j,viejo=await a.iniciarAceptacion(post,j.token);x.ponerAuth(viejo.url);
 j=await a.renovarInvitacion(post,p.id,j.id);
 await assert.rejects(a.completarAceptacion(x.req(viejo)));
 await assert.rejects(a.iniciarAceptacion(post,anterior.token));
 await assert.rejects(a.iniciarAceptacion(post,"c".repeat(64)));
 async function iniciar(){const i=await a.iniciarAceptacion(post,j.token);x.ponerAuth(i.url);assert.ok(!i.url.includes(j.token));return i;}
 let i=await iniciar();await assert.rejects(x.f.completar(x.req(i)));
 x.cambiarSujeto("otro");await assert.rejects(a.completarAceptacion(x.req(i)));assert.equal(x.sql.prepare("SELECT consumido FROM comercio_invitaciones_propietario").get().consumido,null);
 x.cambiarSujeto("u");i=await iniciar();
 x.sql.exec("CREATE TRIGGER prueba_fallo BEFORE INSERT ON membresias BEGIN SELECT RAISE(ABORT,'rollback'); END");
 await assert.rejects(a.completarAceptacion(x.req(i)));assert.equal(x.sql.prepare("SELECT count(*) n FROM empresas").get().n,0);assert.equal(x.sql.prepare("SELECT consumido FROM comercio_invitaciones_propietario").get().consumido,null);
 x.sql.exec("DROP TRIGGER prueba_fallo");i=await iniciar();
 const r=await Promise.allSettled([a.completarAceptacion(x.req(i)),a.completarAceptacion(x.req(i))]);
 assert.equal(r.filter(v=>v.status==="fulfilled").length,1);
 assert.equal(x.sql.prepare("SELECT count(*) n FROM empresas").get().n,1);
 assert.equal(x.sql.prepare("SELECT consumido FROM comercio_invitaciones_propietario").get().consumido,n);
 assert.equal(x.sql.prepare("SELECT count(*) n FROM comercial_suscripciones").get().n,0);
 assert.equal(x.sql.prepare("SELECT count(*) n FROM comercio_sesiones").get().n,0);
 await assert.rejects(a.iniciarAceptacion(post,j.token));
});
