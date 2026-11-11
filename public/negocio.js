(async () => {
  try {
    const respuesta = await fetch("/api/negocio", { cache: "no-store" });
    if (!respuesta.ok) return;
    const negocio = await respuesta.json();
    for (const elemento of document.querySelectorAll("[data-nombre-negocio]")) {
      elemento.textContent = negocio.nombre;
    }
    document.title = document.body.dataset.tituloPagina + " · " + negocio.nombre;
  } catch (error) {
    console.warn("No se pudo actualizar el nombre del negocio", error);
  }
})();
