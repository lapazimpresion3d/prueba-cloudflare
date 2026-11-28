const estado=document.getElementById("arranque-panel");
try{await import("/demostraciones/app.mjs?v=52t8g4");if(document.documentElement.dataset.demoLista==="si")estado.hidden=true;}
catch(error){console.error("Inicio de demostración:",error);estado.dataset.error="1";estado.setAttribute("role","alert");estado.querySelector("p").textContent="No se pudo cargar completamente la demostración. Actualiza la página o vuelve a la galería.";const b=document.createElement("button");b.type="button";b.textContent="Reintentar";b.onclick=()=>location.reload();estado.append(b);}
