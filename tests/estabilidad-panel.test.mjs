import test from "node:test";
import assert from "node:assert/strict";
import {readdirSync,readFileSync,existsSync} from "node:fs";
const root=new URL("../public/demostraciones/",import.meta.url);
const leer=p=>readFileSync(new URL(p,root),"utf8");
test("52.T.8f: todos los módulos coordinados nacen protegidos y con recursos versionados",()=>{
 const dirs=readdirSync(root,{withFileTypes:true}).filter(d=>d.isDirectory()&&existsSync(new URL(d.name+"/index.html",root)));
 let total=0;
 for(const d of dirs){const html=leer(d.name+"/index.html");if(!html.includes("inicio-modulo-rol.mjs"))continue;total++;
  assert.match(html,/<html[^>]*data-modulo-estado="cargando"/,d.name);
  assert.match(html,/href="\.\.\/navegacion-admin\.css\?v=52t8k"/,d.name);
  assert.match(html,/href="\.\.\/panel-admin\.css\?v=52t8k"/,d.name);
  assert.match(html,/src="\.\.\/inicio-modulo-rol\.mjs\?v=52t8k"/,d.name);
  assert.ok(html.indexOf('id="arranque-modulo"')<html.indexOf("<main"),d.name);
  assert.match(html,/id="arranque-modulo-texto" role="status"/,d.name);
 }
 assert.equal(total,28);
 for(const p of ["negocio/index.html","ejemplos/index.html","turismo/index.html"])assert.ok(!leer(p).includes("data-modulo-estado="),p);
});
test("52.T.8f: estilos de arranque confinados y publicación después de montar navegación",()=>{
 const css=leer("panel-admin.css"),nav=leer("navegacion-admin.css"),js=leer("inicio-modulo-rol.mjs");
 assert.match(css,/main:has\(>#arranque-panel\)>section/);
 assert.doesNotMatch(css,/html:not\(\[data-demo-lista=si\]\) main>section/);
 assert.match(nav,/html\[data-modulo-estado=cargando\] body>:not\(#arranque-modulo\)/);
 assert.ok(js.indexOf("montarNavegacion();")<js.indexOf('await import("./"+ruta'));
 assert.ok(js.indexOf("montarNavegacion();")<js.indexOf('raiz.dataset.moduloEstado="listo"'));
 assert.match(js,/raiz\.dataset\.moduloEstado="error"/);
 assert.doesNotMatch(js,/setTimeout\s*\(/);
});
