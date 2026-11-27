import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.mjs';

const origin = 'https://comal.test';
function entorno() {
  let assets = 0;
  let consultas = 0;
  const env = {
    ADMIN_PASSWORD: 'test-only-admin-password-1234',
    COCINA_PASSWORD: 'test-only-cocina-password-1234',
    DB: {prepare(sql) {
      consultas++;
      assert.match(sql, /SELECT sal, verificador FROM clave_cocina/);
      return {first: async () => null};
    }},
    ASSETS: {fetch: async () => {
      assets++;
      return new Response('archivo de prueba');
    }}
  };
  return {env, cuentas: () => ({assets, consultas})};
}
const casos = [
  ['API desconocida', '/api/desconocida', 'GET', null, 404],
  ['raíz API', '/api', 'GET', null, 404],
  ['admin sin sesión', '/api/admin/pedidos', 'GET', null, 401],
  ['admin origen ajeno', '/api/admin/pedidos', 'PUT', 'https://otro.test', 403],
  ['admin POST sin origen', '/api/admin/entrar', 'POST', null, 403],
  ['cocina sin sesión', '/api/cocina/pedidos', 'GET', null, 401],
  ['cocina origen ajeno', '/api/cocina/pedidos', 'PUT', 'https://otro.test', 403],
  ['pedido POST origen ajeno', '/api/pedidos', 'POST', 'https://otro.test', 403],
  ['pedido GET no permitido', '/api/pedidos', 'GET', null, 405],
  ['activo estático', '/index.html', 'GET', null, 200]
];
for (const [nombre, ruta, method, origen, estado] of casos) {
  test(nombre, async () => {
    const {env, cuentas} = entorno();
    const headers = origen ? {Origin: origen} : {};
    const respuesta = await worker.fetch(new Request(origin + ruta, {method, headers}), env);
    assert.equal(respuesta.status, estado);
    assert.equal(cuentas().assets, estado === 200 ? 1 : 0);
    assert.equal(cuentas().consultas, nombre === 'cocina sin sesión' ? 1 : 0);
    if (estado !== 200) {
      assert.equal(respuesta.headers.get('Cache-Control'), 'no-store');
      assert.equal(respuesta.headers.get('X-Content-Type-Options'), 'nosniff');
      assert.equal(respuesta.headers.get('Referrer-Policy'), 'no-referrer');
      assert.equal(typeof (await respuesta.json()).error, 'string');
    }
  });
}
