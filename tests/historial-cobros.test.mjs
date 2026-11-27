import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
const sql = name => readFileSync(new URL('../migrations/' + name, import.meta.url), 'utf8');
const migracion = sql('0018_historial_cobros.sql');
function preparar(t) {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  for (const nombre of ['0008_pedidos_demo.sql','0014_cobros_pedidos.sql','0015_metodos_cobro.sql']) db.exec(sql(nombre));
  db.exec("INSERT INTO pedidos_demo (seguimiento_hash,origen_hash,creado,actualizado,estado,detalle_json,total_centavos) VALUES ('uno','origen',1,1,'listo','{}',1000),('dos','origen',1,1,'listo','{}',2000)");
  db.exec("INSERT INTO cobros_pedido (pedido_folio,importe_centavos,registrado,metodo) VALUES (1,1000,100,'efectivo')");
  return db;
}
const historial = db => db.prepare('SELECT * FROM historial_cobros ORDER BY id').all();
test('0018 conserva cobro previo y genera instantánea', t => {
  const db = preparar(t);
  const antes = db.prepare('SELECT * FROM cobros_pedido').all();
  db.exec(migracion);
  assert.deepEqual(db.prepare('SELECT * FROM cobros_pedido').all(), antes);
  assert.equal(historial(db).length, 1);
  assert.equal(historial(db)[0].accion, 'instantanea');
  assert.equal(historial(db)[0].importe_nuevo, 1000);
});
test('0018 registra alta, método, anulación y reactivación', t => {
  const db = preparar(t);
  db.exec(migracion);
  db.exec("INSERT INTO cobros_pedido (pedido_folio,importe_centavos,registrado,metodo) VALUES (2,2000,200,'efectivo')");
  db.exec("UPDATE cobros_pedido SET metodo='tarjeta' WHERE pedido_folio=1");
  db.exec('UPDATE cobros_pedido SET anulado=300 WHERE pedido_folio=1');
  db.exec("UPDATE cobros_pedido SET importe_centavos=1100, registrado=400, anulado=NULL, metodo='transferencia' WHERE pedido_folio=1");
  const filas = historial(db);
  assert.deepEqual(filas.map(r=>r.accion), ['instantanea','registro','metodo','anulacion','reactivacion']);
  assert.equal(filas[2].metodo_anterior, 'efectivo');
  assert.equal(filas[2].metodo_nuevo, 'tarjeta');
  assert.equal(filas[4].importe_anterior, 1000);
  assert.equal(filas[4].importe_nuevo, 1100);
  assert.equal(filas[4].anulado_anterior, 300);
  assert.equal(filas[4].anulado_nuevo, null);
});
test('0018 no duplica instantáneas ni genera evento sin cambio', t => {
  const db = preparar(t);
  db.exec(migracion);
  db.exec(migracion);
  db.exec('UPDATE cobros_pedido SET importe_centavos=importe_centavos WHERE pedido_folio=1');
  assert.equal(historial(db).length, 1);
});
test('0018 mantiene historial dentro de la misma transacción', t => {
  const db = preparar(t);
  db.exec(migracion);
  db.exec("BEGIN; UPDATE cobros_pedido SET metodo='tarjeta' WHERE pedido_folio=1; ROLLBACK;");
  assert.equal(historial(db).length, 1);
  assert.equal(db.prepare('SELECT metodo FROM cobros_pedido WHERE pedido_folio=1').get().metodo, 'efectivo');
});
