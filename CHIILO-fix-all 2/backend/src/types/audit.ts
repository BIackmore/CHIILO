export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

export type AuditOperation = "INSERT" | "UPDATE" | "DELETE" | "SELECT";

export interface AuditQuery {
  tabla: "usuarios" | "imagenes" | "analisis" | "reportes";
  operacion: AuditOperation;
  registroId?: number | string;
  cambiadoPor?: string | null;
  cambiadoPorRol?: string | null;
  descripcion?: string | null;
  datosAntes?: JsonValue | null;
  datosDespues?: JsonValue | null;
  idReporte?: number | null;
}
