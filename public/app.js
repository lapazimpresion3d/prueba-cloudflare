
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
let productosCatalogo = null;
let avisoCarrito = "";
let revisandoPedido = false;
let mostrarCatalogo = () => {};
const lineasNoDisponibles = new Set();

function precioBase(producto) {
  return producto.precioEspecial ?? producto.precio;
}

function sincronizarCarrito() {
  lineasNoDisponibles.clear();
  carrito.forEach(item => {
    let productoId = item.productoId || item.id;
    if (!item.productoId && typeof item.id === "string" && item.id.startsWith("{")) {
      try {
        productoId = JSON.parse(item.id).id;
      } catch {
        lineasNoDisponibles.add(item);
        return;
      }
    }

    const producto = productosCatalogo.get(productoId);
    if (!producto || producto.disponible === false) {
      lineasNoDisponibles.add(item);
      return;
    }

    const extrasPorNombre = new Map(
      (producto.extras || []).map(extra => [extra.nombre, extra.precio])
    );
    const extras = item.extras || [];
    if (extras.some(nombre => !extrasPorNombre.has(nombre))) {
      lineasNoDisponibles.add(item);
      return;
    }

    item.productoId = productoId;
    item.nombre = producto.nombre;
    item.incluye = producto.incluye;
    item.precio = precioBase(producto) +
      extras.reduce((suma, nombre) => suma + extrasPorNombre.get(nombre), 0);
  });
}

try {
  const guardado = JSON.parse(
    localStorage.getItem("elComalCarrito") || "[]"
  );

  if (Array.isArray(guardado)) {
    carrito.push(...guardado);
  }
} catch (error) {
  console.warn("No se pudo recuperar el carrito", error);
}

/* =====================================================
   SECCIÓN 2 — ACTUALIZACIÓN DEL CARRITO
   Guarda el pedido, calcula totales, muestra productos
   y permite modificar cantidades o eliminar artículos.
   ===================================================== */

function actualizarCarrito() {

  
  // Guardar el pedido en el navegador
  try {
    localStorage.setItem(
      "elComalCarrito",
      JSON.stringify(carrito)
    );
  } catch (error) {
    console.warn("No se pudo guardar el carrito", error);
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
    ? "Retira del carrito los productos que ya no están disponibles para continuar."
    : avisoCarrito;
  aviso.hidden = carrito.length === 0 || !aviso.textContent;

  


  
  contenedor.innerHTML = "";
  let total = 0;

  if (carrito.length === 0) {
    contenedor.textContent = "Tu carrito está vacío.";
  }

  carrito.forEach(item => {
    const fila = document.createElement("p");

    const noDisponible = lineasNoDisponibles.has(item);
    const subtotal = item.precio * item.cantidad;
    if (!noDisponible) total += subtotal;

    fila.textContent = noDisponible
      ? `${item.cantidad} × ${item.nombre} — No disponible`
      : `${item.cantidad} × ${item.nombre} — $${subtotal.toFixed(2)}`;

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
    eliminar.setAttribute("aria-label", "Eliminar " + item.nombre);

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
    disminuir.setAttribute("aria-label", "Disminuir " + item.nombre);

    const numero = document.createElement("span");
    numero.textContent = item.cantidad;

    const aumentar = document.createElement("button");
    aumentar.type = "button";
    aumentar.textContent = "+";
    aumentar.setAttribute("aria-label", "Aumentar " + item.nombre);

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
  if (catalogoAnterior && Array.from(productosCatalogo).some(([id, producto]) =>
    (catalogoAnterior.get(id)?.disponible === false) !== (producto.disponible === false)
  )) {
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

        productosVisibles.forEach(producto => {
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
          if (disponible === false) {
            const agotado = document.createElement("button");
            agotado.type = "button";
            agotado.className = "agregar-pedido";
            agotado.textContent = "Agotado";
            agotado.disabled = true;
            tarjeta.append(imagen, nombre, descripcion, agotado);
            contenedor.appendChild(tarjeta);
            return;
          }

          // Opciones de personalización del producto
          const personalizacion = document.createElement("div");
          personalizacion.className = "personalizacion";

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

          if (producto.extras?.length) {
            const tituloExtras = document.createElement("h4");
            tituloExtras.textContent = "Extras";
            personalizacion.appendChild(tituloExtras);

            producto.extras.forEach(extra => {
              const etiqueta = document.createElement("label");
              const casilla = document.createElement("input");

              casilla.type = "checkbox";
              casilla.value = extra.id;

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


        // Calcular el precio de los extras seleccionados
        function calcularPrecioUnitario() {
          let precioUnitario = precioBase(producto);

          const casillas = personalizacion.querySelectorAll(
            'input[type="checkbox"]:checked'
          );

          casillas.forEach(casilla => {
            const extra = producto.extras?.find(
              item => item.id === casilla.value
            );

            if (extra) {
              precioUnitario += extra.precio;
            }
          });

          return precioUnitario;
        }

          
        function actualizarCantidad() {
          const precioUnitario = calcularPrecioUnitario();

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

  // Obtener los extras seleccionados
  const extras = (producto.extras || [])
    .filter(extra => {
      const casilla = [...personalizacion.querySelectorAll("input")]
        .find(input => input.value === extra.id);

      return casilla?.checked;
    })
    .map(extra => extra.nombre);

  const precioFinal = calcularPrecioUnitario();

  // Identificar cada combinación de ingredientes y extras
  const clave = JSON.stringify({
    id: producto.id,
    ingredientes,
    extras
  });

  const existente = carrito.find(item => item.id === clave);

  if (existente) {
    existente.cantidad += cantidad;
  } else {
    carrito.push({
      id: clave,
      productoId: producto.id,
      nombre: producto.nombre,
      incluye: producto.incluye,
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
    mostrarProductos();
    configurarHorario(menu.horario);
    actualizarCatalogo(menu);
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

function configurarHorario(horario) {
  if (!horario?.turnos?.length) return;

  const nombresDias = {
    Mon: "lunes", Tue: "martes", Wed: "miércoles", Thu: "jueves",
    Fri: "viernes", Sat: "sábado", Sun: "domingo"
  };
  const reloj = new Intl.DateTimeFormat("en-GB", {
    timeZone: horario.zonaHoraria,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });

  consultarHorario = () => {
    const partes = reloj.formatToParts();
    const dia = partes.find(parte => parte.type === "weekday").value;
    const hora = partes.find(parte => parte.type === "hour").value;
    const minuto = partes.find(parte => parte.type === "minute").value;
    const horaLocal = hora + ":" + minuto;

    return horario.turnos.some(turno =>
      turno.dias.includes(dia) && turno.abre <= horaLocal && horaLocal < turno.cierra
    );
  };

  document.getElementById("horario-detalle").textContent = horario.turnos
    .map(turno =>
      turno.dias.map(dia => nombresDias[dia]).join(", ") +
      " · " + turno.abre + " a " + turno.cierra
    )
    .join(" | ");

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

function actualizarDatosEntrega() {
  const esEntrega = tipoServicio.value === "domicilio";
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
      actualizarCatalogo(await obtenerMenu());
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

    if (!tipoServicio.reportValidity()) return;

    let detalleServicio =
      "Servicio: " + tipoServicio.selectedOptions[0].textContent + "\n";

    const esEntrega = tipoServicio.value === "domicilio";

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
        `${item.cantidad} × ${item.nombre}\n`;

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

document.getElementById("continuar-whatsapp")
  .addEventListener("click", () => {
    const telefono = "526121992396";
    if (!telefono) {
      alert("Falta configurar el número de WhatsApp.");
      return;
    }

    const mensaje = encodeURIComponent(resumenPedido.textContent);
    const esMovil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const url = esMovil
      ? "https://wa.me/" + telefono + "?text=" + mensaje
      : "https://web.whatsapp.com/send?phone=" + telefono + "&text=" + mensaje;

    window.open(url, "_blank", "noopener");
    revisionPedido.close();
  });
