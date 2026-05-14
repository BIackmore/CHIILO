import { query } from "@/db";
import { AuditQuery } from "@/types";

/**
 * Registra una entrada en la tabla bitacoras.
 * No lanza errores para no interrumpir el flujo principal.
 */
const audit = async ({
  tabla,
  operacion,
  registroId,
  cambiadoPor,
  descripcion,
  datosAntes,
  datosDespues,
  idReporte
}: AuditQuery) => {
  try {
    await query(
      `INSERT INTO bitacoras
         (tabla_nombre, operacion, registro_id, cambiado_por, descripcion, datos_antes, datos_despues, id_reporte)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        tabla,
        operacion,
        registroId ? String(registroId) : null,
        cambiadoPor || null,
        descripcion || null,
        datosAntes ? JSON.stringify(datosAntes) : null,
        datosDespues ? JSON.stringify(datosDespues) : null,
        idReporte || null
      ]
    );
  } catch (err: any) {
    console.error("[AUDIT ERROR]", (err?.message as string) || "");
  }
};

export { audit };
