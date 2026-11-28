import test from "node:test";
import assert from "node:assert/strict";
import {validarContacto,proyectarContacto} from "../src/contacto-comercial.mjs";
test("normalización y proyección sin datos ocultos",()=>{
 const c=validarContacto({telefono:"+52 (612) 000-0000",correo:"ventas@example.com",whatsapp:"+526120000001",direccion:"Privada",coordenadas:{latitud:24.1,longitud:-110.3},visibilidad:{telefono:true,coordenadas:true}});
 assert.equal(c.telefono,"+526120000000");
 const p=proyectarContacto(c);assert.equal(p.enlaces.telefono,"tel:+526120000000");assert.ok(p.enlaces.mapa.includes("24.1%2C-110.3"));assert.ok(!JSON.stringify(p).includes("ventas"));assert.ok(!JSON.stringify(p).includes("Privada"));assert.ok(!JSON.stringify(p).includes("526120000001"));
});
test("rechazo de enlaces, contactos, coordenadas y campos inválidos",()=>{
 for(const d of [{telefono:"6120000000"},{correo:"a@b.com\r\nBcc:x"},{coordenadas:{latitud:91,longitud:0}},{coordenadas:{latitud:0,longitud:Infinity}},{instagram:"https://instagram.com.evil.com/u"},{facebook:"https://facebook.com@evil.com/u"},{mapa:"https://www.google.com/url?q=https://evil.com"},{sitio:"javascript:alert(1)"},{sitio:"https://127.0.0.1/x"},{sitio:"https://user:pass@example.com"},{visibilidad:{correo:"true"}},{modalidades:["otro"]},{propietario:"privado"}])assert.throws(()=>validarContacto(d));
});
test("redes, mapa y sitio admitidos, visibilidad por defecto cerrada",()=>{
 const c=validarContacto({facebook:"https://www.facebook.com/negocio",instagram:"https://instagram.com/negocio",tiktok:"https://www.tiktok.com/@negocio",youtube:"https://www.youtube.com/@negocio",linkedin:"https://www.linkedin.com/company/negocio",x:"https://x.com/negocio",mapa:"https://maps.app.goo.gl/ejemplo",sitio:"https://example.com/",correo:"ventas+web@example.com",modalidades:["en_linea"],visibilidad:{correo:true}});
 const p=proyectarContacto(c);assert.deepEqual(Object.keys(p.enlaces),["correo"]);assert.equal(p.enlaces.correo,"mailto:ventas%2Bweb%40example.com");assert.deepEqual(p.modalidades,["en_linea"]);
});
