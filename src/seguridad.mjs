// Controles compartidos para las API. No requiere dependencias.
export class ErrorSolicitud extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

// Iterative traversal avoids recursion on hostile JSON. Keep legacy scalar JSON compatibility.
export function validarEstructuraJson(valor,{profundidad=32,nodos=30000}={}){
 const pendientes=[[valor,0]];let total=0;
 while(pendientes.length){const [v,n]=pendientes.pop();if(++total>nodos||n>profundidad)throw new ErrorSolicitud(400,"Estructura JSON demasiado compleja.");
 if(v&&typeof v==="object"){for(const k of Object.keys(v)){if(["__proto__","constructor","prototype"].includes(k))throw new ErrorSolicitud(400,"Campo JSON no permitido.");pendientes.push([v[k],n+1]);}}
 else if(typeof v==="number"&&!Number.isFinite(v))throw new ErrorSolicitud(400,"Número JSON inválido.");
 }return valor;
}
export async function leerJsonLimitado(request, maximo = 32768) {
  const tipo = (request.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
  if (tipo !== "application/json") throw new ErrorSolicitud(415, "Envía los datos como JSON.");
  const longitud = request.headers.get("Content-Length");
  if (longitud !== null && /^\d+$/.test(longitud) && Number(longitud) > maximo) {
    throw new ErrorSolicitud(413, "La solicitud supera el tamaño permitido.");
  }
  const lector = request.body?.getReader();
  if (!lector) return null;
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let texto = "";
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await lector.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maximo) {
        // No esperar la cancelación de la red para contestar.
        void lector.cancel().catch(() => {});
        throw new ErrorSolicitud(413, "La solicitud supera el tamaño permitido.");
      }
      texto += decoder.decode(value, { stream: true });
    }
    return validarEstructuraJson(JSON.parse(texto + decoder.decode()));
  } catch (error) {
    if (error instanceof ErrorSolicitud) throw error;
    void lector.cancel().catch(() => {});
    return null;
  } finally {
    lector.releaseLock();
  }
}

// Reserva atómica: el límite se aplica antes de verificar la contraseña.
// Se contabilizan todos los intentos, también los correctos, durante la ventana.
export async function reservarIntento(db, origen, ahora, ventana, maximo) {
  return db.prepare(
    "INSERT INTO intentos_acceso (origen, fallos, vence) VALUES (?, 1, ?) " +
    "ON CONFLICT (origen) DO UPDATE SET " +
    "fallos = CASE WHEN vence <= ? THEN 1 ELSE fallos + 1 END, " +
    "vence = CASE WHEN vence <= ? THEN excluded.vence ELSE vence END " +
    "WHERE vence <= ? OR fallos < ? RETURNING fallos, vence"
  ).bind(origen, ahora + ventana, ahora, ahora, ahora, maximo).first();
}
