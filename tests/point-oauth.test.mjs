import test from "node:test";
import assert from "node:assert/strict";
import {crearOAuthPoint} from "../src/point-oauth.mjs";
function escenario(habilitado=true){
 const estados=new Map();let registro={},ocupado=false,llamadas=[],incierto=false;
 const almacen={
 async crearEstado(e){estados.set(e.hash,e)},
 async consumirEstado(q){const e=estados.get(q.hash);if(!e||e.actor!==q.actor||e.comercio!==q.comercio||e.entorno!==q.entorno||e.expira<=q.ahora)return null;estados.delete(q.hash);return e},
 async reservar(){if(ocupado||incierto)return null;ocupado=true;return {...registro}},
 async confirmar(_,d){registro=d;ocupado=false},
 async marcarIncierto(){incierto=true;ocupado=false}
 };
 const ctx={comercio:"comercio-a",entorno:"prueba",actor:"admin-a"};
 const api=crearOAuthPoint({clientId:"123",clientSecret:"ficticio",redirectUri:"https://example.com/callback",secret:"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",habilitado,almacen,transporte:async(u,o)=>{const b=JSON.parse(o.body);llamadas.push(b);return {ok:true,json:async()=>({access_token:"access-"+llamadas.length,refresh_token:"refresh-"+llamadas.length,user_id:1234,expires_in:3600,live_mode:false,scope:"offline_access read write"})}}});
 return {api,ctx,llamadas};
}
async function iniciar(s){const r=await s.api.iniciar(s.ctx);return {...s.ctx,state:new URL(r.url).searchParams.get("state"),code:"codigo-ficticio"};}
test("OAuth deshabilitado por defecto operativo",async()=>{const s=escenario(false);await assert.rejects(s.api.iniciar(s.ctx));assert.equal(s.llamadas.length,0)});
test("intercambio y estado de un solo uso",async()=>{const s=escenario(),q=await iniciar(s);assert.equal((await s.api.completar(q)).vendedor,"1234");assert.equal(s.llamadas[0].grant_type,"authorization_code");assert.ok(s.llamadas[0].code_verifier);await assert.rejects(s.api.completar(q));assert.equal(s.llamadas.length,1)});
test("estado aislado por actor y comercio",async()=>{const s=escenario(),q=await iniciar(s);await assert.rejects(s.api.completar({...q,actor:"otro"}));await assert.rejects(s.api.completar({...q,comercio:"otro"}));assert.equal(s.llamadas.length,0);await s.api.completar(q)});
test("renovación conserva refresh token rotado",async()=>{const s=escenario();await s.api.completar(await iniciar(s));await s.api.renovar(s.ctx);await s.api.renovar(s.ctx);assert.equal(s.llamadas[1].refresh_token,"refresh-1");assert.equal(s.llamadas[2].refresh_token,"refresh-2")});
test("renovaciones simultáneas excluidas por adaptador",async()=>{const s=escenario();await s.api.completar(await iniciar(s));const r=await Promise.allSettled([s.api.renovar(s.ctx),s.api.renovar(s.ctx)]);assert.equal(r.filter(x=>x.status==="fulfilled").length,1);assert.equal(s.llamadas.length,2)});
