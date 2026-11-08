
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

        tarjeta.append(
          imagen,
          nombre,
          descripcion,
          precio,
          controles,
          subtotal
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
