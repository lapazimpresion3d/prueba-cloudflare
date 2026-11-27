import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { leerJsonLimitado, reservarIntento, ErrorSolicitud } from '../src/seguridad.mjs';

const req = (body, headers = {'Content-Type': 'application/json'}) =>
  new Request('https://comal.test/api/prueba', { method: 'POST', body, headers, duplex: 'half' });
const errorStatus = status => error => error instanceof ErrorSolicitud && error.status === status;

test('acepta JSON y caracteres UTF-8', async () => {
  assert.deepEqual(await leerJsonLimitado(req('{"nombre":"México 🌮"}')), {nombre: 'México 🌮'});
});
test('acepta charset y mayúsculas de Content-Type', async () => {
  assert.deepEqual(await leerJsonLimitado(req('{}', {'Content-Type':'Application/JSON; charset=utf-8'})), {});
});
test('rechaza tipo incorrecto o ausente', async () => {
  for (const h of [{}, {'Content-Type':'text/plain'}]) {
    await assert.rejects(leerJsonLimitado(req('{}', h)), errorStatus(415));
  }
});
test('rechaza Content-Length declarado excesivo', async () => {
  await assert.rejects(leerJsonLimitado(req('{}', {'Content-Type':'application/json','Content-Length':'99'}), 8), errorStatus(413));
});
test('rechaza exceso real aun sin Content-Length', async () => {
  await assert.rejects(leerJsonLimitado(req('{"x":"123456789"}'), 8), errorStatus(413));
});
test('rechaza exceso real con Content-Length falso', async () => {
  await assert.rejects(leerJsonLimitado(req('{"x":"123456789"}', {'Content-Type':'application/json','Content-Length':'2'}), 8), errorStatus(413));
});
test('cuenta bytes UTF-8, no caracteres', async () => {
  await assert.rejects(leerJsonLimitado(req('"🌮"'), 5), errorStatus(413));
  assert.equal(await leerJsonLimitado(req('"🌮"'), 6), '🌮');
});
test('rechaza JSON mal formado y UTF-8 inválido', async () => {
  assert.equal(await leerJsonLimitado(req('{')), null);
  assert.equal(await leerJsonLimitado(req(new Uint8Array([34,255,34]))), null);
});
test('procesa fragmentos y cancela cuerpo excesivo', async () => {
  let cancelado = false;
  const stream = new ReadableStream({pull(c){c.enqueue(new Uint8Array(6));},cancel(){cancelado=true;}});
  await assert.rejects(leerJsonLimitado(req(stream), 10), errorStatus(413));
  assert.equal(cancelado, true);
});
test('acepta cuerpo exactamente en el límite', async () => {
  assert.deepEqual(await leerJsonLimitado(req('{}'), 2), {});
});

// Adaptador mínimo D1 sobre SQLite real; solo para pruebas locales.
function dbLocal() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('CREATE TABLE intentos_acceso (origen TEXT PRIMARY KEY, fallos INTEGER NOT NULL, vence INTEGER NOT NULL)');
  return { sqlite, prepare(sql) { return { bind(...args) { return { async first() { return sqlite.prepare(sql).get(...args) ?? null; } }; } }; } };
}
test('reserva exactamente diez intentos por ventana', async () => {
  const db = dbLocal();
  try {
    const resultados = await Promise.all(Array.from({length:30}, () => reservarIntento(db,'admin:ip',100,60,10)));
    assert.equal(resultados.filter(Boolean).length, 10);
    assert.deepEqual(resultados.filter(Boolean).map(r=>r.fallos), [1,2,3,4,5,6,7,8,9,10]);
    assert.equal(await reservarIntento(db,'admin:ip',159,60,10), null);
  } finally { db.sqlite.close(); }
});
test('reinicia ventana vencida y separa orígenes', async () => {
  const db = dbLocal();
  try {
    assert.equal((await reservarIntento(db,'admin:ip',100,60,1)).fallos, 1);
    assert.equal(await reservarIntento(db,'admin:ip',101,60,1), null);
    assert.equal((await reservarIntento(db,'cocina:ip',101,60,1)).fallos, 1);
    const nuevo = await reservarIntento(db,'admin:ip',160,60,1);
    assert.equal(nuevo.fallos, 1);
    assert.equal(nuevo.vence, 220);
  } finally { db.sqlite.close(); }
});
