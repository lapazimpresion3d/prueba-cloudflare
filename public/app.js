
/*
=========================================================
PROYECTO: TAQUERÍA EL COMAL
DESARROLLADOR: LAPAZIMPRESION3D
ARCHIVO: app.js
=========================================================

DESCRIPCIÓN:
Controla el menú interactivo, la personalización de
productos, el carrito y los pedidos por WhatsApp.

ARCHIVOS RELACIONADOS:
- index.html: estructura de la página.
- estilos.css: diseño visual.
- menu.json: productos, categorías, precios y extras.

FUNCIONES PRINCIPALES:

1. Recuperar carrito desde localStorage.
2. actualizarCarrito():
   - Mostrar productos seleccionados.
   - Actualizar cantidades y total.
   - Guardar el pedido.
   - Permitir eliminar productos.

3. cargarMenu():
   - Leer menu.json.
   - Generar tarjetas de productos.
   - Crear filtros por categorías.
   - Calcular ingredientes y extras.
   - Agregar productos al carrito.

4. Control del carrito flotante:
   - Abrir y cerrar el panel.
   - Cerrar al hacer clic fuera.
   - Conservar el panel abierto durante las operaciones.

5. Vaciar carrito.

6. Generar y preparar pedidos para WhatsApp.

REGLAS DE MANTENIMIENTO:
- No modificar los IDs del HTML sin actualizar JavaScript.
- Mantener las categorías y productos en menu.json.
- No escribir productos directamente en app.js.
- Conservar la identificación de combinaciones de extras.
- Probar las modificaciones en la rama desarrollo.
- No cambiar funciones ajenas a la modificación solicitada.

=========================================================
*/


/* =====================================================
   SECCIÓN 1 — ALMACENAMIENTO DEL CARRITO
   Recupera los productos guardados en localStorage.
   ===================================================== */


const carrito = [];
const codigoMesa = new URLSearchParams(window.location.search).get("mesa");
const claveCarritoGeneral = "elComalCarrito";
let claveCarrito = codigoMesa === null ? claveCarritoGeneral : null;
let mesaPedido = null;
let productosCatalogo = null;
let avisoCarrito = "";
let revisandoPedido = false;
let mostrarCatalogo = () => {};
const lineasNoDisponibles = new Map();

function limiteExtras(producto) {
  return Number.isInteger(producto.maxExtras) && producto.maxExtras >= 0
    ? producto.maxExtras
    : Infinity;
}

function precioBase(producto, variante) {
  return (producto.precioEspecial ?? producto.precio) + (variante?.recargo ?? 0);
}

function variantesDe(producto) {
  return producto.variantes ?? producto.tamanos ?? [];
}

function varianteDisponible(variante) {
  if (!variante.productoId) return true;
  const producto = productosCatalogo.get(variante.productoId);
  return Boolean(producto && producto.disponible !== false);
}

function claveProducto(productoId, ingredientes, extras, varianteId) {
  return JSON.stringify({ id: productoId, ingredientes, extras, varianteId });
}

function nombreLinea(item) {
  const opcion = item.variante ?? item.tamano;
  return opcion ? item.nombre + " (" + opcion + ")" : item.nombre;
}

function sincronizarCarrito() {
  lineasNoDisponibles.clear();
  carrito.forEach(item => {
    let productoId = item.productoId || item.id;
    if (!item.productoId && typeof item.id === "string" && item.id.startsWith("{")) {
      try {
        productoId = JSON.parse(item.id).id;
      } catch {
        lineasNoDisponibles.set(item, "No disponible");
        return;
      }
    }

    const producto = productosCatalogo.get(productoId);
    if (!producto || producto.disponible === false) {
      lineasNoDisponibles.set(item, "No disponible");
      return;
    }

    const extrasPorNombre = new Map(
      (producto.extras || []).map(extra => [extra.nombre, extra.precio])
    );
    const extras = item.extras || [];
    if (extras.length > limiteExtras(producto)) {
      lineasNoDisponibles.set(item, "Supera el máximo de extras");
      return;
    }

    if (extras.some(nombre => !extrasPorNombre.has(nombre))) {
      lineasNoDisponibles.set(item, "No disponible");
      return;
    }

    const variantes = variantesDe(producto);
    const varianteId = item.varianteId ?? item.tamanoId;
    const variante = varianteId
      ? variantes.find(opcion => opcion.id === varianteId)
      : variantes[0];

    if ((varianteId && !variante) || (variante && !varianteDisponible(variante))) {
      lineasNoDisponibles.set(item, "No disponible");
      return;
    }

    item.productoId = productoId;
    item.nombre = producto.nombre;
    item.incluye = producto.incluye;
    if (variante) {
      item.varianteId = variante.id;
      item.variante = variante.nombre;
      item.id = claveProducto(productoId, item.ingredientes || [], extras, variante.id);
      delete item.tamanoId;
      delete item.tamano;
    }

    item.precio = precioBase(producto, variante) +
      extras.reduce((suma, nombre) => suma + extrasPorNombre.get(nombre), 0);
  });
}

function recuperarCarrito() {
  if (!claveCarrito) return;
  try {
    const guardado = JSON.parse(localStorage.getItem(claveCarrito) || "[]");
    if (Array.isArray(guardado)) carrito.push(...guardado);
  } catch (error) {
    console.warn("No se pudo recuperar el carrito", error);
  }
}

recuperarCarrito();

/* =====================================================
   SECCIÓN 2 — ACTUALIZACIÓN DEL CARRITO
   Guarda el pedido, calcula totales, muestra productos
   y permite modificar cantidades o eliminar artículos.
   ===================================================== */

function actualizarCarrito() {

  
  // Guardar el pedido en el navegador
  if (claveCarrito) {
    try {
      localStorage.setItem(claveCarrito, JSON.stringify(carrito));
    } catch (error) {
      console.warn("No se pudo guardar el carrito", error);
    }
  }

  
  const contenedor = document.getElementById("carrito-productos");
  const totalElemento = document.getElementById("carrito-total");


  // Actualizar el contador del carrito flotante
  const contador = document.getElementById("carrito-contador");

  const cantidadTotal = carrito.reduce(
    (suma, item) => suma + item.cantidad,
    0
  );

  contador.textContent = cantidadTotal;

  const botonEnviar = document.getElementById("enviar-pedido");
  const aviso = document.getElementById("aviso-carrito");
  const hayNoDisponibles = carrito.some(item => lineasNoDisponibles.has(item));

  botonEnviar.disabled = carrito.length === 0 || !productosCatalogo || hayNoDisponibles || revisandoPedido;
  aviso.textContent = hayNoDisponibles
    ? "Retira del carrito los productos o combinaciones que ya no se pueden pedir para continuar."
    : avisoCarrito;
  aviso.hidden = carrito.length === 0 || !aviso.textContent;

  


  
  contenedor.innerHTML = "";
  let total = 0;

  if (carrito.length === 0) {
    contenedor.textContent = "Tu carrito está vacío.";
  }

  carrito.forEach(item => {
    const fila = document.createElement("p");

    const motivo = lineasNoDisponibles.get(item);
    const noDisponible = Boolean(motivo);
    const subtotal = item.precio * item.cantidad;
    if (!noDisponible) total += subtotal;

    fila.textContent = noDisponible
      ? `${item.cantidad} × ${nombreLinea(item)} — ${motivo}`
      : `${item.cantidad} × ${nombreLinea(item)} — $${subtotal.toFixed(2)}`;

    if (item.incluye?.length) {
      const contenido = document.createElement("small");
      contenido.textContent = "Incluye: " + item.incluye.join(", ");
      contenido.style.display = "block";
      fila.appendChild(contenido);
    }

    // Mostrar ingredientes omitidos
    if (Array.isArray(item.ingredientes)) {
      const detalles = document.createElement("small");

      const ingredientesOriginales = item.ingredientesOriginales || [];
      const omitidos = ingredientesOriginales.filter(
        nombre => !item.ingredientes.includes(nombre)
      );

      detalles.textContent = omitidos.length
        ? "Sin: " + omitidos.join(", ")
        : "Con todos los ingredientes";

      detalles.style.display = "block";
      fila.appendChild(detalles);
    }

    // Mostrar extras seleccionados
    if (Array.isArray(item.extras) && item.extras.length > 0) {
      const detallesExtras = document.createElement("small");
      detallesExtras.textContent =
        "Extras: " + item.extras.join(", ");

      detallesExtras.style.display = "block";
      fila.appendChild(detallesExtras);
    }



    const eliminar = document.createElement("button");
    eliminar.type = "button";
    eliminar.className = "eliminar-producto";
    eliminar.textContent = "Eliminar";
    eliminar.setAttribute("aria-label", "Eliminar " + nombreLinea(item));

eliminar.addEventListener("click", (evento) => {
  evento.stopPropagation();
      const indice = carrito.findIndex(
        producto => producto.id === item.id
      );

      if (indice !== -1) {
        lineasNoDisponibles.delete(item);
        carrito.splice(indice, 1);
        actualizarCarrito();
      }
    });


    // Controles de cantidad dentro del carrito
    const controles = document.createElement("div");
    controles.className = "carrito-cantidad";

    const disminuir = document.createElement("button");
    disminuir.type = "button";
    disminuir.textContent = "−";
    disminuir.setAttribute("aria-label", "Disminuir " + nombreLinea(item));

    const numero = document.createElement("span");
    numero.textContent = item.cantidad;

    const aumentar = document.createElement("button");
    aumentar.type = "button";
    aumentar.textContent = "+";
    aumentar.setAttribute("aria-label", "Aumentar " + nombreLinea(item));

disminuir.addEventListener("click", (evento) => {
  evento.stopPropagation();
      if (item.cantidad > 1) {
        item.cantidad--;
        actualizarCarrito();
      }
    });

aumentar.addEventListener("click", (evento) => {
  evento.stopPropagation();
      item.cantidad++;
      actualizarCarrito();
    });

    disminuir.disabled = item.cantidad === 1;

    controles.append(disminuir, numero, aumentar);

    if (!noDisponible) fila.append(controles);
    fila.appendChild(eliminar);
    contenedor.appendChild(fila);


  });

  totalElemento.textContent = `$${total.toFixed(2)}`;
}

/* =====================================================
   SECCIÓN 3 — MENÚ DINÁMICO
   Lee menu.json, genera categorías y tarjetas, permite
   personalizar productos y agregarlos al carrito.
   ===================================================== */

async function obtenerMenu() {
  const respuesta = await fetch("./menu.json", { cache: "no-store" });
  if (!respuesta.ok) throw new Error("No se pudo cargar el menú");
  return respuesta.json();
}

function actualizarCatalogo(menu) {
  const catalogoAnterior = productosCatalogo;
  productosCatalogo = new Map(menu.categorias.flatMap(categoria =>
    categoria.productos.map(producto => [producto.id, producto])
  ));
  sincronizarCarrito();
  if (catalogoAnterior && Array.from(productosCatalogo).some(([id, producto]) => {
    const anterior = catalogoAnterior.get(id);
    return (anterior?.disponible === false) !== (producto.disponible === false) ||
      anterior?.precio !== producto.precio || anterior?.precioEspecial !== producto.precioEspecial ||
      anterior?.descripcion !== producto.descripcion;
  })) {
    mostrarCatalogo();
  }
}

async function cargarMenu() {
  const contenedor = document.getElementById("productos");
  const navegacion = document.getElementById("categorias");
  const buscador = document.getElementById("buscar-producto");
  const resultado = document.getElementById("resultado-busqueda");
  let categoriaSeleccionada = "todos";

  try {
    const menu = await obtenerMenu();

    function normalizarBusqueda(texto) {
      return texto.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
    }

    // Combinar la búsqueda por nombre con la categoría activa.
    function mostrarProductos() {
      contenedor.innerHTML = "";
      const consulta = normalizarBusqueda(buscador.value.trim());
      let coincidencias = 0;

      menu.categorias.forEach(categoria => {
        if (
          categoriaSeleccionada !== "todos" &&
          categoria.id !== categoriaSeleccionada
        ) {
          return;
        }

        const productosVisibles = categoria.productos.filter(producto =>
          normalizarBusqueda(producto.nombre).includes(consulta)
        );
        if (productosVisibles.length === 0) return;
        coincidencias += productosVisibles.length;

        const titulo = document.createElement("h2");
        titulo.textContent = categoria.nombre;
        titulo.style.gridColumn = "1 / -1";
        contenedor.appendChild(titulo);

        productosVisibles.forEach(productoOriginal => {
          const producto = productosCatalogo.get(productoOriginal.id) ?? productoOriginal;
          const tarjeta = document.createElement("article");
          tarjeta.className = "producto";

          const imagen = document.createElement("img");
          imagen.src = producto.imagen;
          imagen.alt = producto.nombre;
          imagen.className = "producto-imagen";
          imagen.loading = "lazy";

          const nombre = document.createElement("h3");
          nombre.textContent = producto.nombre;

          const descripcion = document.createElement("p");
          descripcion.textContent = producto.descripcion;

          if (producto.incluye?.length) {
            descripcion.textContent += " Incluye: " + producto.incluye.join(" y ") + ".";
          }

          const formatoPrecio = new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: menu.moneda
          });

          const disponible = productosCatalogo?.get(producto.id)?.disponible ?? producto.disponible;
          const variantes = variantesDe(producto);
          let varianteElegida = variantes.find(varianteDisponible);
          if (disponible === false || (variantes.length && !varianteElegida)) {
            const agotado = document.createElement("button");
            agotado.type = "button";
            agotado.className = "agregar-pedido";
            agotado.textContent = "Agotado";
            agotado.disabled = true;
            const notaDemo = document.createElement("small");
            notaDemo.style.marginTop = "8px";
            notaDemo.textContent =
              "En esta demostración, el encargado puede marcar productos como agotados " +
              "y volver a ofrecerlos desde su panel privado.";

            tarjeta.append(imagen, nombre, descripcion, agotado, notaDemo);
            contenedor.appendChild(tarjeta);
            return;
          }

          // Opciones de personalización del producto
          const personalizacion = document.createElement("div");
          personalizacion.className = "personalizacion";

          if (variantes.length) {
            const etiquetaOpcion = document.createElement("label");
            etiquetaOpcion.textContent = producto.etiquetaVariante ?? "Tamaño";
            const selectorOpcion = document.createElement("select");

            for (const variante of variantes) {
              const opcion = document.createElement("option");
              opcion.value = variante.id;
              opcion.disabled = !varianteDisponible(variante);
              opcion.textContent = variante.nombre;
              if (opcion.disabled) {
                opcion.textContent += " (Agotado)";
              } else if (variante.recargo) {
                opcion.textContent += " (+" + formatoPrecio.format(variante.recargo) + ")";
              }
              selectorOpcion.appendChild(opcion);
            }

            selectorOpcion.value = varianteElegida.id;
            selectorOpcion.addEventListener("change", () => {
              varianteElegida = variantes.find(variante => variante.id === selectorOpcion.value);
            });
            etiquetaOpcion.appendChild(selectorOpcion);
            personalizacion.appendChild(etiquetaOpcion);
          }

          if (producto.ingredientes?.length) {
            const tituloIngredientes = document.createElement("h4");
            tituloIngredientes.textContent = "Ingredientes";
            personalizacion.appendChild(tituloIngredientes);

            producto.ingredientes.forEach(ingrediente => {
              const etiqueta = document.createElement("label");
              const casilla = document.createElement("input");


               casilla.type = "checkbox";
               casilla.value = ingrediente.id;
               casilla.checked = ingrediente.incluido || ingrediente.obligatorio === true;
               
               // Impedir que se quiten ingredientes obligatorios

               if (ingrediente.obligatorio === true) {
                 casilla.disabled = true;
                 casilla.title = "Ingrediente obligatorio";
               
                 etiqueta.classList.add("ingrediente-obligatorio");
               }



              etiqueta.append(
                casilla,
                document.createTextNode(" " + ingrediente.nombre)
              );

              personalizacion.appendChild(etiqueta);
            });
          }

          const maximoExtras = limiteExtras(producto);
          const casillasExtras = [];

          if (producto.extras?.length) {
            const tituloExtras = document.createElement("h4");
            tituloExtras.textContent = "Extras";
            personalizacion.appendChild(tituloExtras);

            if (Number.isFinite(maximoExtras)) {
              const avisoExtras = document.createElement("small");
              avisoExtras.textContent = maximoExtras === 0
                ? "Este producto se ofrece sin extras."
                : "Puedes elegir hasta " + maximoExtras + (maximoExtras === 1 ? " extra." : " extras.");
              personalizacion.appendChild(avisoExtras);
            }

            producto.extras.forEach(extra => {
              const etiqueta = document.createElement("label");
              const casilla = document.createElement("input");

              casilla.type = "checkbox";
              casilla.value = extra.id;
              casillasExtras.push({ extra, casilla });

              etiqueta.append(
                casilla,
                document.createTextNode(
                  ` ${extra.nombre} (+$${extra.precio})`
                )
              );

              personalizacion.appendChild(etiqueta);
            });
          }

          
          const precio = document.createElement("p");
          precio.className = "precio";
          const tienePrecioEspecial = precioBase(producto) < producto.precio;


        // Selector de cantidad
        let cantidad = 1;

        const controles = document.createElement("div");
        controles.className = "cantidad-controles";

        const disminuir = document.createElement("button");
        disminuir.type = "button";
        disminuir.textContent = "−";

        const numero = document.createElement("span");
        numero.textContent = cantidad;

        const aumentar = document.createElement("button");
        aumentar.type = "button";
        aumentar.textContent = "+";

        // Subtotal del producto
        const subtotal = document.createElement("p");
        subtotal.className = "subtotal";


        function obtenerExtrasSeleccionados() {
          return casillasExtras
            .filter(({ casilla }) => casilla.checked)
            .map(({ extra }) => extra);
        }

        function calcularPrecioUnitario(extras) {
          return precioBase(producto, varianteElegida) +
            extras.reduce((suma, extra) => suma + extra.precio, 0);
        }

        function actualizarCantidad() {
          const extras = obtenerExtrasSeleccionados();
          const precioUnitario = calcularPrecioUnitario(extras);

          for (const { casilla } of casillasExtras) {
            casilla.disabled = !casilla.checked && extras.length >= maximoExtras;
          }

          numero.textContent = cantidad;
          disminuir.disabled = cantidad === 1;

          precio.textContent = (tienePrecioEspecial ? "Precio especial: " : "") +
            formatoPrecio.format(precioUnitario);

          subtotal.textContent =
            "Subtotal: " +
            formatoPrecio.format(cantidad * precioUnitario);
        }

        // Actualizar precios cuando cambien los extras
        personalizacion.addEventListener("change", () => {
          actualizarCantidad();
        });


        disminuir.addEventListener("click", () => {
          if (cantidad > 1) {
            cantidad--;
            actualizarCantidad();
          }
        });

        aumentar.addEventListener("click", () => {
          cantidad++;
          actualizarCantidad();
        });

        controles.append(disminuir, numero, aumentar);
        actualizarCantidad();


        // Botón para agregar productos al pedido
        const agregar = document.createElement("button");
        agregar.type = "button";
        agregar.className = "agregar-pedido";
        agregar.textContent = "Agregar al pedido";



agregar.addEventListener("click", () => {
  // Obtener los ingredientes seleccionados

  
  // Guardar la lista original de ingredientes del producto
  const ingredientesOriginales = (producto.ingredientes || [])
    .map(ingrediente => ingrediente.nombre);

  
  const ingredientes = (producto.ingredientes || [])
    .filter(ingrediente => {
      const casilla = [...personalizacion.querySelectorAll("input")]
        .find(input => input.value === ingrediente.id);

      return casilla ? casilla.checked : ingrediente.incluido;
    })
    .map(ingrediente => ingrediente.nombre);

  const extrasSeleccionados = obtenerExtrasSeleccionados();
  if (extrasSeleccionados.length > maximoExtras) return;

  const extras = extrasSeleccionados.map(extra => extra.nombre);
  const precioFinal = calcularPrecioUnitario(extrasSeleccionados);

  const clave = claveProducto(producto.id, ingredientes, extras, varianteElegida?.id);

  const existente = carrito.find(item => item.id === clave);

  if (existente) {
    existente.cantidad += cantidad;
  } else {
    carrito.push({
      id: clave,
      productoId: producto.id,
      nombre: producto.nombre,
      incluye: producto.incluye,
      varianteId: varianteElegida?.id,
      variante: varianteElegida?.nombre,
      precio: precioFinal,
      cantidad: cantidad,
      ingredientes: ingredientes,
      ingredientesOriginales: ingredientesOriginales,
      extras: extras
    });
  }

  actualizarCarrito();
});




          

            tarjeta.append(imagen, nombre, descripcion, precio);

            if (tienePrecioEspecial) {
              const precioAnterior = document.createElement("p");
              precioAnterior.className = "precio-anterior";
              precioAnterior.textContent =
                "Precio base regular: " + formatoPrecio.format(producto.precio) +
                ". Los extras se cobran aparte.";
              tarjeta.appendChild(precioAnterior);
            }
            
            // Mostrar personalización solamente si existen opciones
            if (
              variantes.length ||
              producto.ingredientes?.length ||
              producto.extras?.length
            ) {
              tarjeta.appendChild(personalizacion);
            }
            
            tarjeta.append(controles, subtotal, agregar);



        contenedor.appendChild(tarjeta);

        });
      });

      resultado.textContent = coincidencias === 0
        ? "No hay productos que coincidan con tu búsqueda."
        : "";
    }

    // Crear botones de navegación automáticamente
    function crearBoton(nombre, id) {
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = "categoria-boton";
      boton.textContent = nombre;
      boton.setAttribute("aria-pressed", String(id === "todos"));

      boton.addEventListener("click", () => {
        categoriaSeleccionada = id;
        mostrarProductos();

        navegacion.querySelectorAll("button").forEach(b => {
          const activo = b === boton;
          b.classList.toggle("activo", activo);
          b.setAttribute("aria-pressed", String(activo));
        });
      });

      if (id === "todos") {
        boton.classList.add("activo");
      }

      navegacion.appendChild(boton);
    }

    navegacion.innerHTML = "";

    crearBoton("Todos", "todos");

    menu.categorias.forEach(categoria => {
      crearBoton(categoria.nombre, categoria.id);
    });

    mostrarCatalogo = mostrarProductos;
    buscador.addEventListener("input", mostrarProductos);
    configurarPedidoEnMesa(menu);
    actualizarCatalogo(menu);
    mostrarProductos();
    configurarHorario(menu.horario);
    configurarReservacion(menu.reservaciones);
    avisoCarrito = "";
    actualizarCarrito();

  } catch (error) {
    console.error(error);
    contenedor.textContent =
      "No fue posible cargar el menú. Intenta nuevamente.";
    avisoCarrito = "No pudimos comprobar el carrito. Recarga la página para intentarlo de nuevo.";
    actualizarCarrito();
  }
}

cargarMenu();


/* =====================================================
   SECCIÓN 4 — CONTROL DEL CARRITO FLOTANTE
   Gestiona la apertura y el cierre del panel.
   Incluye interacciones con el menú y la tecla Escape.
   ===================================================== */

/* Abrir y cerrar el carrito */

const botonCarrito = document.getElementById("abrir-carrito");
const seccionCarrito = document.getElementById("carrito");

seccionCarrito.hidden = true;

botonCarrito.addEventListener("click", () => {
  const abrir = seccionCarrito.hidden;

  seccionCarrito.hidden = !abrir;
  botonCarrito.setAttribute("aria-expanded", String(abrir));


});



/* Cerrar el carrito al hacer clic fuera */
document.addEventListener("click", (evento) => {

  // No cerrar al interactuar con los productos del menú


if (
  evento.target.closest(".cantidad-controles") ||
  evento.target.closest(".agregar-pedido")
) {
  return;
}


if (evento.target.closest("#categorias")) {
  return;
}


  // Cerrar solamente si el clic fue fuera del carrito
  if (
    !seccionCarrito.hidden &&
    !seccionCarrito.contains(evento.target) &&
    !botonCarrito.contains(evento.target)
  ) {
    seccionCarrito.hidden = true;
    botonCarrito.setAttribute("aria-expanded", "false");
  }
});


/* Cerrar el carrito con la tecla Escape */
document.addEventListener("keydown", (evento) => {
  if (
    evento.key === "Escape" &&
    !seccionCarrito.hidden &&
    !document.getElementById("revision-pedido").open
  ) {
    seccionCarrito.hidden = true;
    botonCarrito.setAttribute("aria-expanded", "false");
    botonCarrito.focus();
  }
});

// Recuperar el pedido al abrir la página
actualizarCarrito();


/* =====================================================
   SECCIÓN 5 — VACIAR CARRITO
   Solicita confirmación antes de eliminar el pedido.
   ===================================================== */

/* Vaciar todos los productos del carrito */
document.getElementById("vaciar-carrito")
  .addEventListener("click", () => {
    if (carrito.length === 0) return;

    if (confirm("¿Quieres vaciar todo el carrito?")) {
      carrito.length = 0;
      lineasNoDisponibles.clear();
      actualizarCarrito();
    }
  });

/* Cerrar al tocar el espacio vacío del carrito */
seccionCarrito.addEventListener("click", (evento) => {

  // No cerrar al interactuar con productos o botones
 if (
  evento.target.closest("#carrito-productos") ||
  evento.target.closest(".carrito-resumen") ||
  evento.target.closest("button") ||
  evento.target.closest(".datos-cliente") ||
  evento.target.closest("#revision-pedido") ||
  evento.target.closest("#aviso-carrito")
) {
  return;
}

  // Cerrar al tocar el fondo del panel
  seccionCarrito.hidden = true;
  botonCarrito.setAttribute("aria-expanded", "false");
});

/* =====================================================
   SECCIÓN 6 — PEDIDOS POR WHATSAPP
   Genera el mensaje con cliente, tipo de servicio,
   dirección de entrega, productos, ingredientes,
   extras, precios y total.
   ===================================================== */

let consultarHorario = () => null;
let turnosNegocio = [];
let relojNegocio = crearRelojNegocio("America/Mazatlan");

function crearRelojNegocio(zonaHoraria) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: zonaHoraria,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });
}

function fechaHoraNegocio() {
  const partes = Object.fromEntries(
    relojNegocio.formatToParts().map(({ type, value }) => [type, value])
  );
  return {
    fecha: partes.year + "-" + partes.month + "-" + partes.day,
    dia: partes.weekday,
    hora: partes.hour + ":" + partes.minute
  };
}

function dentroDelHorario(dia, hora) {
  return turnosNegocio.some(turno =>
    turno.dias.includes(dia) && turno.abre <= hora && hora < turno.cierra
  );
}

function configurarHorario(horario) {
  if (!horario?.turnos?.length) return;

  const nombresDias = {
    Mon: "lunes", Tue: "martes", Wed: "miércoles", Thu: "jueves",
    Fri: "viernes", Sat: "sábado", Sun: "domingo"
  };
  relojNegocio = crearRelojNegocio(horario.zonaHoraria);
  turnosNegocio = horario.turnos;
  consultarHorario = () => {
    const { dia, hora } = fechaHoraNegocio();
    return dentroDelHorario(dia, hora);
  };

  const detalleHorario = horario.turnos
    .map(turno =>
      turno.dias.map(dia => nombresDias[dia]).join(", ") +
      " · " + turno.abre + " a " + turno.cierra
    )
    .join(" | ");
  document.getElementById("horario-detalle").textContent = detalleHorario;

  const horarioReservacion = document.getElementById("horario-reservacion");
  horarioReservacion.textContent = "Horario de atención · " + detalleHorario;
  horarioReservacion.hidden = false;

  const estado = document.getElementById("estado-negocio");
  function actualizarEstado() {
    estado.textContent = consultarHorario()
      ? "En horario de atención"
      : "Fuera del horario de atención";
  }

  actualizarEstado();
  window.setInterval(actualizarEstado, 60000);
  document.getElementById("horario-negocio").hidden = false;
}

const tipoServicio = document.getElementById("tipo-servicio");
const datosEntrega = document.getElementById("datos-entrega");
const etiquetaTotal = document.getElementById("etiqueta-total");
const avisoEntrega = document.getElementById("aviso-entrega");
const revisionPedido = document.getElementById("revision-pedido");
const resumenPedido = document.getElementById("revision-resumen");
const revisionFueraHorario = document.getElementById("revision-fuera-horario");

function mesaDelMenu(menu) {
  return menu.reservaciones?.mesas?.find(mesa => mesa.codigo === codigoMesa);
}

function configurarPedidoEnMesa(menu) {
  if (codigoMesa === null) return;

  mesaPedido = mesaDelMenu(menu);
  claveCarrito = mesaPedido ? claveCarritoGeneral + ":mesa:" + codigoMesa : claveCarritoGeneral;
  recuperarCarrito();

  const avisoMesa = document.getElementById("aviso-mesa");
  avisoMesa.hidden = false;
  if (!mesaPedido) {
    avisoMesa.textContent = "El enlace no identifica una mesa del menú. Puedes pedir para recoger o a domicilio.";
    return;
  }

  avisoMesa.textContent = "Estás en " + mesaPedido.id + ". Tu pedido de prueba llevará esa mesa en WhatsApp.";
  const mesaCarrito = document.getElementById("mesa-carrito");
  mesaCarrito.textContent = "Pedido en " + mesaPedido.id;
  mesaCarrito.hidden = false;

  tipoServicio.hidden = true;
  tipoServicio.disabled = true;
  document.getElementById("etiqueta-tipo-servicio").style.display = "none";
  actualizarDatosEntrega();
}

function actualizarDatosEntrega() {
  const esEntrega = !mesaPedido && tipoServicio.value === "domicilio";
  datosEntrega.hidden = !esEntrega;
  datosEntrega.disabled = !esEntrega;
  etiquetaTotal.textContent = esEntrega ? "Subtotal de productos:" : "Total:";
  avisoEntrega.hidden = !esEntrega;
}

tipoServicio.addEventListener("change", actualizarDatosEntrega);
window.addEventListener("pageshow", actualizarDatosEntrega);
actualizarDatosEntrega();

/* Preparar el mensaje del pedido */
document.getElementById("enviar-pedido")
  .addEventListener("click", async () => {

    if (revisandoPedido || carrito.length === 0 || !productosCatalogo ||
        carrito.some(item => lineasNoDisponibles.has(item))) return;

    revisandoPedido = true;
    avisoCarrito = "Comprobando la disponibilidad del pedido…";
    actualizarCarrito();

    try {
      const menuVigente = await obtenerMenu();
      if (mesaPedido && !mesaDelMenu(menuVigente)) {
        avisoCarrito = "Esta mesa ya no está configurada. Pide al encargado el código actualizado.";
        return;
      }
      actualizarCatalogo(menuVigente);
      avisoCarrito = "";
    } catch (error) {
      console.error(error);
      avisoCarrito = "No pudimos comprobar la disponibilidad. Intenta nuevamente.";
      return;
    } finally {
      revisandoPedido = false;
      actualizarCarrito();
    }

    if (seccionCarrito.hidden || carrito.length === 0 ||
        carrito.some(item => lineasNoDisponibles.has(item))) return;

    const nombreCliente = document
      .getElementById("nombre-cliente")
      .value.trim();

    if (!nombreCliente) {
      alert("Por favor, escribe tu nombre.");
      document.getElementById("nombre-cliente").focus();
      return;
    }

    if (!mesaPedido && !tipoServicio.reportValidity()) return;

    let detalleServicio = mesaPedido
      ? "Servicio: En la mesa\nUbicación: " + mesaPedido.id + "\n"
      : "Servicio: " + tipoServicio.selectedOptions[0].textContent + "\n";

    const esEntrega = !mesaPedido && tipoServicio.value === "domicilio";

    if (esEntrega) {
      const calle = document.getElementById("calle-entrega");
      const colonia = document.getElementById("colonia-entrega");
      const referencias = document
        .getElementById("referencias-entrega")
        .value.trim();

      const campoVacio = [calle, colonia].find(
        campo => !campo.value.trim()
      );

      if (campoVacio) {
        alert("Completa la calle, el número y la colonia para la entrega.");
        campoVacio.focus();
        return;
      }

      const telefonoEntrega = document.getElementById("telefono-entrega");
      const contacto = telefonoEntrega.value.trim();

      if (contacto && !/^\+?\d{10,15}$/.test(contacto.replace(/[\s().-]/g, ""))) {
        alert("Escribe un teléfono válido o deja el campo vacío.");
        telefonoEntrega.focus();
        return;
      }

      detalleServicio +=
        "Dirección: " + calle.value.trim() + "\n" +
        "Colonia: " + colonia.value.trim() + "\n";

      if (contacto) {
        detalleServicio += "Teléfono de contacto: " + contacto + "\n";
      }

      if (referencias) {
        detalleServicio += "Referencias: " + referencias + "\n";
      }
    }

    const notas = document.getElementById("notas-pedido").value.trim();
    if (notas) {
      detalleServicio += "Instrucciones: " + notas + "\n";
    }

    let mensaje =
      "\uD83C\uDF2E DEMOSTRACIÓN - TAQUERÍA EL COMAL\n\n" +
      "Cliente: " + nombreCliente + "\n" +
      detalleServicio + "\n" +
      "Hola, estoy probando el sistema de pedidos " +
      "desarrollado por Lapazimpresion3d.\n\n" +
      "Este es mi pedido de prueba:\n\n";



    let total = 0;

    carrito.forEach(item => {
      const subtotal = item.precio * item.cantidad;
      total += subtotal;


      // Datos principales del producto
      mensaje +=
        `${item.cantidad} × ${nombreLinea(item)}\n`;

      if (item.incluye?.length) {
        mensaje += "Incluye: " + item.incluye.join(", ") + "\n";
      }

      // Ingredientes eliminados
      if (Array.isArray(item.ingredientes)) {
        const originales = item.ingredientesOriginales || [];

        const omitidos = originales.filter(
          nombre => !item.ingredientes.includes(nombre)
        );

        if (omitidos.length > 0) {
          mensaje += "Sin: " + omitidos.join(", ") + "\n";
        }
      }

      // Extras seleccionados
      if (Array.isArray(item.extras) && item.extras.length > 0) {
        mensaje += "Extras: " + item.extras.join(", ") + "\n";
      }

      // Precio y subtotal
      mensaje +=
        `Precio unitario: $${item.precio.toFixed(2)}\n` +
        `Subtotal: $${subtotal.toFixed(2)}\n\n`;

    });

    if (esEntrega) {
      mensaje +=
        `SUBTOTAL DE PRODUCTOS: $${total.toFixed(2)} MXN\n` +
        "Costo de envío y tiempo de entrega: por confirmar.\n\n";
    } else {
      mensaje += `TOTAL: $${total.toFixed(2)} MXN\n\n`;
    }
    mensaje +=
      "Este pedido es una demostración y no representa una compra real.\n\n" +
      "Me interesa conocer las funciones de este sistema.";


    resumenPedido.textContent = mensaje;
    resumenPedido.scrollTop = 0;
    revisionFueraHorario.hidden = consultarHorario() !== false;
    revisionPedido.showModal();
  });

function abrirWhatsApp(texto) {
  const telefono = "526121992396";
  if (!telefono) {
    alert("Falta configurar el número de WhatsApp.");
    return false;
  }

  const mensaje = encodeURIComponent(texto);
  const esMovil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const url = esMovil
    ? "https://wa.me/" + telefono + "?text=" + mensaje
    : "https://web.whatsapp.com/send?phone=" + telefono + "&text=" + mensaje;

  window.open(url, "_blank", "noopener");
  return true;
}

document.getElementById("continuar-whatsapp")
  .addEventListener("click", () => {
    if (abrirWhatsApp(resumenPedido.textContent)) revisionPedido.close();
  });

/* =====================================================
   SECCIÓN 7 — SOLICITUD DE RESERVACIÓN
   Valida los datos y prepara el mensaje de demostración.
   ===================================================== */

const formularioReservacion = document.getElementById("formulario-reservacion");
const fechaReservacion = document.getElementById("reserva-fecha");
const horaReservacion = document.getElementById("reserva-hora");
const personasReservacion = document.getElementById("reserva-personas");
const errorReservacion = document.getElementById("reserva-error");
const estadoHorariosReservacion = document.getElementById("reserva-horarios-estado");
const enviarReservacion = document.getElementById("reserva-enviar");
let versionHorariosReservacion = 0;
let horariosReservacion = [];

const reglasReservacion = {
  anticipacionDias: 14,
  maxPersonas: 8
};

function configurarReservacion(configuracion) {
  for (const clave of Object.keys(reglasReservacion)) {
    const valor = configuracion?.[clave];
    if (Number.isSafeInteger(valor) && valor > 0 && valor <= 1440) {
      reglasReservacion[clave] = valor;
    }
  }
  personasReservacion.max = reglasReservacion.maxPersonas;
  document.getElementById("reglas-reservacion").textContent =
    "Solicitudes con hasta " + reglasReservacion.anticipacionDias +
    " días de anticipación y para grupos de hasta " + reglasReservacion.maxPersonas + " personas.";
  actualizarHorariosReservacion();
}

function fechaUtc(fecha) {
  return new Date(fecha + "T12:00:00Z");
}

function fechaMaximaReservacion(hoy) {
  const ultimaFecha = fechaUtc(hoy);
  ultimaFecha.setUTCDate(ultimaFecha.getUTCDate() + reglasReservacion.anticipacionDias);
  return ultimaFecha.toISOString().slice(0, 10);
}

function mostrarHorariosReservacion(horarios, marcador, anterior = "") {
  horariosReservacion = horarios;
  const primeraOpcion = document.createElement("option");
  primeraOpcion.value = "";
  primeraOpcion.textContent = marcador;
  horaReservacion.replaceChildren(primeraOpcion);
  for (const hora of horarios) {
    const opcion = document.createElement("option");
    opcion.value = hora;
    opcion.textContent = hora;
    horaReservacion.appendChild(opcion);
  }
  horaReservacion.value = horarios.includes(anterior) ? anterior : "";
  horaReservacion.disabled = horarios.length === 0;
  enviarReservacion.disabled = horarios.length === 0;
}

async function actualizarHorariosReservacion() {
  const version = ++versionHorariosReservacion;
  const ahora = fechaHoraNegocio();
  const fecha = fechaReservacion.value;
  const personas = Number(personasReservacion.value);
  const anterior = horaReservacion.value;
  fechaReservacion.min = ahora.fecha;
  fechaReservacion.max = fechaMaximaReservacion(ahora.fecha);
  estadoHorariosReservacion.textContent = "";

  if (!fecha || !personasReservacion.value) {
    mostrarHorariosReservacion([], "Elige fecha y número de personas");
    return;
  }
  if (fecha < fechaReservacion.min || fecha > fechaReservacion.max ||
      !Number.isSafeInteger(personas) || personas < 1 || personas > reglasReservacion.maxPersonas) {
    mostrarHorariosReservacion([], "Revisa la fecha y el número de personas");
    return;
  }

  mostrarHorariosReservacion([], "Consultando horarios…");
  try {
    const parametros = new URLSearchParams({ fecha, personas });
    const respuesta = await fetch("/api/reservaciones/disponibilidad?" + parametros, { cache: "no-store" });
    if (!respuesta.ok) throw new Error("No se pudo consultar la agenda");
    const { horas } = await respuesta.json();
    if (version !== versionHorariosReservacion) return;
    mostrarHorariosReservacion(horas, "Elige una hora", anterior);
    if (horas.length === 0) estadoHorariosReservacion.textContent = "No hay mesas para ese grupo en esta fecha.";
  } catch (error) {
    if (version !== versionHorariosReservacion) return;
    mostrarHorariosReservacion([], "Consulta sin completar");
    estadoHorariosReservacion.textContent = "No pudimos consultar la agenda. Vuelve a seleccionar la fecha o el tamaño del grupo.";
  }
}

for (const campo of [fechaReservacion, personasReservacion]) {
  campo.addEventListener("input", () => {
    errorReservacion.hidden = true;
    actualizarHorariosReservacion();
  });
}
configurarReservacion();

function mostrarErrorReservacion(mensaje, campo) {
  errorReservacion.textContent = mensaje;
  errorReservacion.hidden = false;
  campo.focus();
}

formularioReservacion.addEventListener("submit", evento => {
  evento.preventDefault();
  errorReservacion.hidden = true;
  const campoNombre = document.getElementById("reserva-nombre");
  const campoTelefono = document.getElementById("reserva-telefono");
  const nombre = campoNombre.value.trim();
  const telefono = campoTelefono.value.trim();
  const fecha = fechaReservacion.value;
  const hora = horaReservacion.value;
  const personas = Number(personasReservacion.value);
  const comentarios = document.getElementById("reserva-comentarios").value.trim();

  if (!nombre) {
    mostrarErrorReservacion("Escribe tu nombre.", campoNombre);
    return;
  }

  if (!/^\+?\d{10,15}$/.test(telefono.replace(/[\s().-]/g, ""))) {
    mostrarErrorReservacion("Escribe un teléfono de contacto válido.", campoTelefono);
    return;
  }

  const ahora = fechaHoraNegocio();
  if (fecha < ahora.fecha || fecha > fechaMaximaReservacion(ahora.fecha)) {
    mostrarErrorReservacion("Elige una fecha dentro del plazo indicado.", fechaReservacion);
    return;
  }

  if (!horariosReservacion.includes(hora) || (fecha === ahora.fecha && hora <= ahora.hora)) {
    actualizarHorariosReservacion();
    mostrarErrorReservacion(
      "Elige un horario válido para esa fecha.",
      horaReservacion.disabled ? fechaReservacion : horaReservacion
    );
    return;
  }

  if (!Number.isSafeInteger(personas) || personas < 1 || personas > reglasReservacion.maxPersonas) {
    mostrarErrorReservacion(
      "Indica de 1 a " + reglasReservacion.maxPersonas + " personas.",
      personasReservacion
    );
    return;
  }

  const diaSolicitado = fechaUtc(fecha);

  const fechaLegible = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
    timeZone: "UTC"
  }).format(diaSolicitado);

  const mensaje =
    "Solicitud de reservación de prueba — Taquería El Comal\n\n" +
    "Nombre: " + nombre + "\n" +
    "Teléfono: " + telefono + "\n" +
    "Fecha: " + fechaLegible + "\n" +
    "Hora local: " + hora + "\n" +
    "Personas: " + personas + "\n" +
    (comentarios ? "Comentarios: " + comentarios + "\n" : "") +
    "\nEsta solicitud es una demostración y está pendiente de confirmación.";

  abrirWhatsApp(mensaje);
});
