(() => {
  const clave = "elComalSeguimiento";
  const formatoToken = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/;
  let ultimo = null;

  function referenciaValida(datos) {
    return datos && typeof datos.token === "string" && formatoToken.test(datos.token) &&
      Number.isSafeInteger(datos.folio) && datos.folio > 0;
  }

  function mostrar() {
    for (const enlace of document.querySelectorAll("[data-seguimiento-reciente]")) {
      enlace.href = ultimo ? "/seguimiento/#" + ultimo.token : "/seguimiento/";
      enlace.textContent = ultimo ? "Ver seguimiento de mi pedido #" + ultimo.folio : "Ver seguimiento de mi último pedido";
    }
    for (const contenedor of document.querySelectorAll("[data-seguimiento-contenedor]")) {
      contenedor.hidden = ultimo === null;
    }
  }

  function recuperar() {
    try {
      const datos = JSON.parse(localStorage.getItem(clave) || "null");
      ultimo = referenciaValida(datos) ? datos : null;
    } catch {
      // Si el navegador restringe el almacenamiento, conservar el acceso de esta página.
    }
    mostrar();
  }

  function guardar(token, folio) {
    const datos = { token, folio };
    if (!referenciaValida(datos)) return;
    ultimo = datos;
    try {
      localStorage.setItem(clave, JSON.stringify(datos));
    } catch {
      // El enlace de la página permanece disponible durante esta visita.
    }
    mostrar();
  }

  window.seguimientoComal = { guardar, leer: () => ultimo };
  window.addEventListener("pageshow", recuperar);
  window.addEventListener("storage", evento => {
    if (evento.key === clave || evento.key === null) recuperar();
  });
  recuperar();
})();
