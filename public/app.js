
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

  // Activar WhatsApp solamente si hay productos
  const botonEnviar = document.getElementById("enviar-pedido");

  botonEnviar.disabled = carrito.length === 0;

  


  
  contenedor.innerHTML = "";
  let total = 0;

  if (carrito.length === 0) {
    contenedor.textContent = "Tu carrito está vacío.";
  }

  carrito.forEach(item => {
    const fila = document.createElement("p");

    const subtotal = item.precio * item.cantidad;
    total += subtotal;


    // Mostrar producto y precio
    fila.textContent =
      `${item.cantidad} × ${item.nombre} — $${subtotal.toFixed(2)}`;

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

    fila.append(controles, eliminar);
    contenedor.appendChild(fila);


  });

  totalElemento.textContent = `$${total.toFixed(2)}`;
}

/* =====================================================
   SECCIÓN 3 — MENÚ DINÁMICO
   Lee menu.json, genera categorías y tarjetas, permite
   personalizar productos y agregarlos al carrito.
   ===================================================== */

async function cargarMenu() {
  const contenedor = document.getElementById("productos");
  const navegacion = document.getElementById("categorias");

  try {
    const respuesta = await fetch("./menu.json");

    if (!respuesta.ok) {
      throw new Error("No se pudo cargar el menú");
    }

    const menu = await respuesta.json();

    // Mostrar productos según la categoría seleccionada
    function mostrarProductos(categoriaSeleccionada = "todos") {
      contenedor.innerHTML = "";

      menu.categorias.forEach(categoria => {
        if (
          categoriaSeleccionada !== "todos" &&
          categoria.id !== categoriaSeleccionada
        ) {
          return;
        }

        const titulo = document.createElement("h2");
        titulo.textContent = categoria.nombre;
        titulo.style.gridColumn = "1 / -1";
        contenedor.appendChild(titulo);

        categoria.productos.forEach(producto => {
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
          precio.textContent = new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: menu.moneda
          }).format(producto.precio);


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
          let precioUnitario = producto.precio;

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

          
        const formatoPrecio = new Intl.NumberFormat("es-MX", {
          style: "currency",
          currency: menu.moneda
        });


        function actualizarCantidad() {
          const precioUnitario = calcularPrecioUnitario();

          numero.textContent = cantidad;
          disminuir.disabled = cantidad === 1;

          precio.textContent = formatoPrecio.format(precioUnitario);

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
      nombre: producto.nombre,
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
    }

    // Crear botones de navegación automáticamente
    function crearBoton(nombre, id) {
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = "categoria-boton";
      boton.textContent = nombre;
      boton.setAttribute("aria-pressed", String(id === "todos"));

      boton.addEventListener("click", () => {
        mostrarProductos(id);

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

    mostrarProductos();

  } catch (error) {
    console.error(error);
    contenedor.textContent =
      "No fue posible cargar el menú. Intenta nuevamente.";
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
  if (evento.key === "Escape" && !seccionCarrito.hidden) {
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
  evento.target.closest(".datos-cliente")
) {
  return;
}

  // Cerrar al tocar el fondo del panel
  seccionCarrito.hidden = true;
  botonCarrito.setAttribute("aria-expanded", "false");
});

/* =====================================================
   SECCIÓN 6 — PEDIDOS POR WHATSAPP
   Genera el mensaje con cliente, productos,
   ingredientes, extras, precios y total.
   ===================================================== */

/* Preparar el mensaje del pedido */
document.getElementById("enviar-pedido")
  .addEventListener("click", () => {

    if (carrito.length === 0) return;

    const nombreCliente = document
      .getElementById("nombre-cliente")
      .value.trim();

    if (!nombreCliente) {
      alert("Por favor, escribe tu nombre.");
      document.getElementById("nombre-cliente").focus();
      return;
    }

    let mensaje =
      "\uD83C\uDF2E DEMOSTRACIÓN - TAQUERÍA EL COMAL\n\n" +
      "Cliente: " + nombreCliente + "\n\n" +
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

    mensaje += `TOTAL: $${total.toFixed(2)} MXN\n\n`;
    mensaje +=
      "Este pedido es una demostración y no representa una compra real.\n\n" +
      "Me interesa conocer las funciones de este sistema.";


    // Mostrar el mensaje para verificarlo

    // Número de WhatsApp del restaurante.
    // Sustituir por un número autorizado para pruebas.
    const telefono = "526121992396";

    if (!telefono) {
      alert(
        "Mensaje preparado correctamente.\n\n" +
        mensaje +
        "\n\nFalta configurar el número de WhatsApp."
      );
      return;
    }

    // Abrir WhatsApp con el pedido preparado

      const esMovil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      
      const url = esMovil
        ? "https://wa.me/" + telefono + "?text=" + encodeURIComponent(mensaje)
        : "https://web.whatsapp.com/send?phone=" + telefono + "&text=" + encodeURIComponent(mensaje);


      console.log("Mensaje original:", mensaje);
      console.log("Mensaje codificado:", encodeURIComponent(mensaje));
     
    window.open(url, "_blank", "noopener");

  });

