import test from "node:test";
import assert from "node:assert/strict";
import {inspeccionarJpeg} from "../src/seguridad-imagen-comercial.mjs";
import {jpegPrueba} from "./fixtures/jpeg-prueba.mjs";
test("JPEG privado: límites, metadatos y contenido adicional",()=>{
 const x=jpegPrueba({ancho:512,alto:512});
 assert.deepEqual(inspeccionarJpeg(x,{lado:512,maximo:120000}),{ancho:512,alto:512});
 const b=Buffer.from(x.split(",")[1],"base64"),url=b=>"data:image/jpeg;base64,"+b.toString("base64");
 for(const y of [url(b.subarray(0,-2)),url(Buffer.concat([b,Buffer.from("extra")])),url(Buffer.concat([b.subarray(0,2),Buffer.from([255,225,0,4,1,2]),b.subarray(2)])),jpegPrueba({ancho:513}),jpegPrueba({relleno:100000}),"data:image/png;base64,AAAA","javascript:alert(1)"])assert.throws(()=>inspeccionarJpeg(y,{lado:512,maximo:120000}));
});
