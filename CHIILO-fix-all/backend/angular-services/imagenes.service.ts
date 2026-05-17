// ═══════════════════════════════════════════════════════════════
//  src/app/services/imagenes.service.ts
//  Conecta la subida de imágenes y el historial con el backend
// ═══════════════════════════════════════════════════════════════
import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface ImagenAnalizada {
  id_imagen:    number;
  uuid:         string;
  nombre:       string;
  usuario:      string;
  zona:         string | null;
  nivel_riesgo: 'alto' | 'medio' | 'bajo' | null;
  color_hex:    string | null;
  confianza:    number | null;
  resolucion:   string | null;
  tamano:       string | null;
  fecha:        string;
  id_analisis:  number | null;
}

export interface ResultadoAnalisis {
  nivel:      'alto' | 'medio' | 'bajo';
  confianza:  number;          // 0-100
  zona:       string;
  temp:       string;
  humedad:    string;
  viento:     string;
  areas:      string[];
  porcentaje_afectacion: number;
}

export interface UploadResponse {
  ok:       boolean;
  imagen:   { id_imagen: number; uuid: string; nombre: string; resolucion: string; tamano: string; fecha: string };
  analisis: ResultadoAnalisis & { id_analisis: number };
}

@Injectable({ providedIn: 'root' })
export class ImagenesService {
  constructor(private api: ApiService) {}

  /** Sube imagen al backend y recibe el resultado del análisis IA */
  async uploadAndAnalyze(file: File): Promise<UploadResponse> {
    return this.api.uploadFile<UploadResponse>('/imagenes/upload', file, 'imagen');
  }

  /** Lista imágenes con filtros opcionales */
  async getAll(params: { zona?: string; nivel?: string; page?: number } = {}): Promise<{ data: ImagenAnalizada[]; total: number }> {
    const qs = new URLSearchParams();
    if (params.zona)  qs.set('zona',  params.zona);
    if (params.nivel) qs.set('nivel', params.nivel);
    if (params.page)  qs.set('page',  String(params.page));
    const res = await this.api.get<any>(`/imagenes?${qs.toString()}`);
    return { data: res.data, total: res.total };
  }

  /** Detalle de una imagen con su análisis */
  async getOne(id: number): Promise<any> {
    const res = await this.api.get<any>(`/imagenes/${id}`);
    return res.data;
  }

  /** Elimina una imagen */
  async delete(id: number): Promise<void> {
    await this.api.delete(`/imagenes/${id}`);
  }

  /** URL para ver el archivo directamente */
  fileUrl(id: number): string {
    const token = localStorage.getItem('token');
    return `http://localhost:3000/api/imagenes/${id}/file?token=${token}`;
  }

  // ── Helpers de compatibilidad con el front existente ─────────
  /** Transforma la respuesta al formato que usa admin.ts y gov.ts */
  toFrontendFormat(img: ImagenAnalizada): any {
    const colorMap: Record<string, string> = {
      alto: 'b-danger', medio: 'b-warn', bajo: 'b-ok',
    };
    return {
      nombre:     img.nombre,
      zona:       img.zona      || '—',
      resultado:  img.nivel_riesgo === 'alto'  ? 'Incendio Detectado'
                : img.nivel_riesgo === 'medio' ? 'Posible Incendio'
                : img.nivel_riesgo === 'bajo'  ? 'Sin Incendio' : '—',
      confianza:  img.confianza ?? 0,
      resolucion: img.resolucion || '—',
      tamano:     img.tamano    || '—',
      usuario:    img.usuario,
      fecha:      img.fecha,
      color:      colorMap[img.nivel_riesgo ?? ''] ?? 'b-info',
    };
  }
}
