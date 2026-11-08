

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

  
  contenedor.innerHTML = "";
  let total = 0;

  if (carrito.length === 0) {
    contenedor.textContent = "Tu carrito está vacío.";
  }

  carrito.forEach(item => {
    const fila = document.createElement("p");

    const subtotal = item.precio * item.cantidad;
    total += subtotal;

    fila.textContent =
      `${item.cantidad} × ${item.nombre} — $${subtotal.toFixed(2)}`;


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

        const formatoPrecio = new Intl.NumberFormat("es-MX", {
          style: "currency",
          currency: menu.moneda
        });

        function actualizarCantidad() {
          numero.textContent = cantidad;
          disminuir.disabled = cantidad === 1;
          subtotal.textContent =
            "Subtotal: " + formatoPrecio.format(
              cantidad * producto.precio
            );
        }

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
  const existente = carrito.find(
    item => item.id === producto.id
  );

  if (existente) {
    existente.cantidad += cantidad;
  } else {
    carrito.push({
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      cantidad: cantidad
    });
  }

  actualizarCarrito();
});

          

        tarjeta.append(
          imagen,
          nombre,
          descripcion,
          precio,
          controles,
          subtotal,
          agregar
        );


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
  evento.target.closest(".producto") &&
  !evento.target.closest(".producto-imagen")
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

/* Vaciar todos los productos del carrito */
document.getElementById("vaciar-carrito")
  .addEventListener("click", () => {
    if (carrito.length === 0) return;

    if (confirm("¿Quieres vaciar todo el carrito?")) {
      carrito.length = 0;
      actualizarCarrito();
    }
  });
