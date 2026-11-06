
async function cargarMenu() {
  const contenedor = document.getElementById("productos");

  try {
    // Leer los datos del archivo JSON
    const respuesta = await fetch("./menu.json");

    if (!respuesta.ok) {
      throw new Error("No se pudo cargar el menú");
    }

    const menu = await respuesta.json();

    // Limpiar el mensaje de carga
    contenedor.innerHTML = "";

    // Recorrer las categorías
    menu.categorias.forEach(categoria => {

      // Crear el título de la categoría
      const titulo = document.createElement("h2");
      titulo.textContent = categoria.nombre;
      titulo.style.gridColumn = "1 / -1";
      contenedor.appendChild(titulo);

      // Recorrer los productos
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

        tarjeta.append(imagen, nombre, descripcion, precio);
        contenedor.appendChild(tarjeta);
      });
    });

  } catch (error) {
    console.error(error);
    contenedor.textContent =
      "No fue posible cargar el menú. Intenta nuevamente.";
  }
}

// Ejecutar cuando cargue la página
cargarMenu();
