(() => {
  const claveAnterior = "elComalSeguimiento";
  const prefijo = claveAnterior + ":pedido:";
  const formatoToken = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/;
  let guardados = new Map();
  const temporales = new Map();

  function referenciaValida(datos) {
    return datos && typeof datos.token === "string" && formatoToken.test(datos.token) &&
      Number.isSafeInteger(datos.folio) && datos.folio > 0;
  }

  function leerReferencia(clave, pedidos) {
    let datos;
    try {
      datos = JSON.parse(localStorage.getItem(clave));
    } catch {
      return;
    }
    if (referenciaValida(datos)) pedidos.set(datos.token, { token: datos.token, folio: datos.folio });
  }

  function mostrar() {
    const pedidos = [...guardados.values()].sort((a, b) => b.folio - a.folio);
    for (const contenedor of document.querySelectorAll("[data-seguimiento-contenedor]")) {
      contenedor.hidden = pedidos.length === 0;
    }
    const lista = document.getElementById("pedidos-guardados");
    if (!lista) return;

    lista.replaceChildren(...pedidos.map(({ token, folio }) => {
      const fila = document.createElement("li");
      const enlace = document.createElement("a");
      enlace.href = "/seguimiento/#" + token;
      enlace.textContent = "Ver pedido #" + folio;
      fila.append(enlace);
      return fila;
    }));
    lista.hidden = pedidos.length === 0;
    document.getElementById("sin-pedidos-guardados").hidden = pedidos.length > 0;
  }

  function recuperar() {
    try {
      const pedidos = new Map();
      leerReferencia(claveAnterior, pedidos);
      for (let indice = 0; indice < localStorage.length; indice++) {
        const clave = localStorage.key(indice);
        if (clave?.startsWith(prefijo)) leerReferencia(clave, pedidos);
      }
      guardados = pedidos;
    } catch {
      // Si el navegador bloquea el almacenamiento, conservar los enlaces de esta visita.
    }
    for (const [token, referencia] of temporales) guardados.set(token, referencia);
    mostrar();
  }

  function guardar(token, folio) {
    const datos = { token, folio };
    if (!referenciaValida(datos) || guardados.get(token)?.folio === folio) return;
    guardados.set(token, datos);
    try {
      localStorage.setItem(prefijo + token, JSON.stringify(datos));
      temporales.delete(token);
    } catch {
      temporales.set(token, datos);
    }
    recuperar();
  }

  window.seguimientoComal = { guardar };
  window.addEventListener("pageshow", recuperar);
  window.addEventListener("storage", evento => {
    if (evento.key === null || evento.key === claveAnterior || evento.key.startsWith(prefijo)) recuperar();
  });
  recuperar();
})();
