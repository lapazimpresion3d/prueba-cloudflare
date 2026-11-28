import test from "node:test";
import assert from "node:assert/strict";
import {proyectarPresentacion,validarPresentacion} from "../src/presentacion-comercial.mjs";
const base={empresa:"empresa-interna",actor:"usuario-privado",revision:1,nombre_publico:"Comercio",giro:"tienda",lema:"Lema",descripcion:"Descripción",color:"#334155",color_secundario:"#475569",color_acento:"#b45309",color_fondo:"#ffffff",color_texto:"#111827",logotipo:null,portada:null,zona_horaria:"America/Mazatlan",horario_semanal:"[[],[],[],[],[],[],[]]",excepciones_horario:"{}",contacto:JSON.stringify({telefono:"+526120000000",correo:"privado@example.com",visibilidad:{telefono:true}}),presentacion:JSON.stringify({estilo:"compacto",secciones:["contacto","descripcion"]})};
test("proyección explícita y orden de secciones en seis giros",()=>{
 for(const giro of ["restaurante","cafeteria","tienda","barberia","taller","otro"]){
  const p=proyectarPresentacion({...base,giro});
  assert.deepEqual(p.secciones,["contacto","descripcion"]);
  assert.equal(p.giro,giro);
  assert.equal(p.contacto.enlaces.telefono,"tel:+526120000000");
  for(const k of ["empresa","actor","revision","horario"])assert.equal(Object.hasOwn(p,k),false);
  assert.ok(!JSON.stringify(p).includes("privado@example.com"));
 }
});
test("configuración inválida y perfil corrupto no se proyectan",()=>{
 for(const x of [{estilo:"externo"},{secciones:["contacto","contacto"]},{secciones:["usuarios"]},{actor:"otro"}])assert.throws(()=>validarPresentacion(x));
 for(const x of [{nombre_publico:" "},{descripcion:"a".repeat(2001)},{lema:"a".repeat(161)},{giro:"desconocido"},{color:"red"},{portada:"data:image/svg+xml;base64,AAAA"}])assert.throws(()=>proyectarPresentacion({...base,...x}));
});
