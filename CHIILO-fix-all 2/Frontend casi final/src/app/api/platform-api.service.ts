import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../environments/environment';

export interface ApiResponse<T> {
  ok: boolean;
  data: T;
  error?: string;
}

export interface DashboardZone {
  zona: string;
  nivel: string;
  color_hex: string;
}

export interface DashboardData {
  incendios_activos: number;
  alertas_criticas: number;
  zonas_controladas: number;
  area_afectada: string;
  total_imagenes: number;
  total_analisis: number;
  precision_promedio: string;
  zonas: DashboardZone[];
}

export interface DashboardLevel {
  id_riesgo: number;
  clave: string;
  descripcion: string;
  prioridad: number;
  color_hex: string;
}

export interface PlatformUser {
  id_usuario: number;
  nombre: string;
  correo: string;
  activo: boolean;
  telefono?: string | null;
  fecha_registro?: string;
  perfil?: Record<string, unknown> | null;
  rol: string;
}

export interface PlatformImage {
  id_imagen: number;
  uuid: string;
  nombre: string;
  usuario: string;
  zona?: string | null;
  nivel_riesgo?: string | null;
  color_hex?: string | null;
  confianza?: number | null;
  resolucion?: string | null;
  tamano?: string | null;
  fecha?: string;
  id_analisis?: number | null;
}

export interface PlatformImageDetail {
  id_imagen: number;
  id_usuario: number;
  uuid: string;
  nombre_archivo: string;
  ruta_archivo: string;
  formato?: string | null;
  fecha_carga?: string;
  resolucion_width?: number | null;
  resolucion_height?: number | null;
  tamano_bytes?: number | null;
  usuario_nombre?: string;
  usuario_correo?: string;
  id_analisis?: number | null;
  porcentaje_afectacion?: number | null;
  resultado_json?: {
    nivel?: string;
    confianza?: number;
    zona?: string;
    temp?: string;
    humedad?: string;
    viento?: string;
    areas?: string[];
  } | null;
  zonas_detectadas?: unknown;
  umbral_confianza?: number | null;
  modelo_version?: string | null;
  fecha_analisis?: string | null;
  nivel_riesgo?: string | null;
  nivel_desc?: string | null;
  color_hex?: string | null;
}

export interface UploadImageResponse {
  ok: boolean;
  imagen: {
    id_imagen: number;
    uuid: string;
    nombre: string;
    resolucion: string | null;
    tamano: string;
    fecha: string;
  };
  analisis: {
    id_analisis: number;
    nivel: string;
    confianza: number;
    zona: string;
    temp: string;
    humedad: string;
    viento: string;
    areas: string[];
    porcentaje_afectacion: number;
  };
}

export interface PlatformAnalysis {
  id_analisis: number;
  imagen: string;
  usuario: string;
  nivel_riesgo: string;
  color_hex?: string | null;
  confianza: number;
  porcentaje_afectacion?: number | null;
  zonas_detectadas?: unknown;
  modelo_version?: string | null;
  fecha: string;
}

export interface AnalysisStats {
  total_analisis: string | number;
  total_alto: string | number;
  total_medio: string | number;
  total_bajo: string | number;
  precision_promedio: string | number | null;
  ultima_actualizacion: string | null;
}

export interface PlatformReport {
  id_reporte: number;
  tipo: string;
  contenido_summary?: string | null;
  ubicacion?: string | null;
  severidad?: string | null;
  estado?: string | null;
  usuario: string;
  nivel_riesgo?: string | null;
  color_hex?: string | null;
  fecha: string;
}

export interface ReportStats {
  total: string | number;
  alta: string | number;
  media: string | number;
  baja: string | number;
  en_proceso: string | number;
}

export interface BitacoraEntry {
  id_log: number;
  tabla_nombre: string;
  operacion: string;
  registro_id?: string | null;
  cambiado_por?: string | null;
  fecha: string;
  descripcion?: string | null;
  datos_antes?: unknown;
  datos_despues?: unknown;
}

export interface CreateReportPayload {
  id_analisis: number;
  tipo: string;
  contenido_summary?: string;
  parametros?: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class PlatformApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrlBase;

  getDashboard(): Observable<ApiResponse<DashboardData>> {
    return this.http.get<ApiResponse<DashboardData>>(`${this.baseUrl}/dashboard`);
  }

  getDashboardLevels(): Observable<ApiResponse<DashboardLevel[]>> {
    return this.http.get<ApiResponse<DashboardLevel[]>>(`${this.baseUrl}/dashboard/niveles`);
  }

  getUsers(): Observable<ApiResponse<PlatformUser[]>> {
    return this.http.get<ApiResponse<PlatformUser[]>>(`${this.baseUrl}/usuarios`);
  }

  toggleUserStatus(id: number): Observable<{ ok: boolean; activo: boolean }> {
    return this.http.patch<{ ok: boolean; activo: boolean }>(`${this.baseUrl}/usuarios/${id}/estado`, {});
  }

  deleteUser(id: number): Observable<{ ok: boolean; message: string }> {
    return this.http.delete<{ ok: boolean; message: string }>(`${this.baseUrl}/usuarios/${id}`);
  }

  getImages(params?: Record<string, string | number | undefined>): Observable<{ ok: boolean; data: PlatformImage[]; total: number; page: number; limit: number }> {
    return this.http.get<{ ok: boolean; data: PlatformImage[]; total: number; page: number; limit: number }>(
      `${this.baseUrl}/imagenes`,
      { params: this.buildParams(params) },
    );
  }

  getImage(id: number): Observable<ApiResponse<PlatformImageDetail>> {
    return this.http.get<ApiResponse<PlatformImageDetail>>(`${this.baseUrl}/imagenes/${id}`);
  }

  uploadImage(file: File): Observable<UploadImageResponse> {
    const formData = new FormData();
    formData.append('imagen', file);
    return this.http.post<UploadImageResponse>(`${this.baseUrl}/imagenes/upload`, formData);
  }

  deleteImage(id: number): Observable<{ ok: boolean; message: string }> {
    return this.http.delete<{ ok: boolean; message: string }>(`${this.baseUrl}/imagenes/${id}`);
  }

  getImageFileUrl(id: number): string {
    return `${this.baseUrl}/imagenes/${id}/file`;
  }

  getAnalyses(params?: Record<string, string | number | undefined>): Observable<{ ok: boolean; data: PlatformAnalysis[]; page: number }> {
    return this.http.get<{ ok: boolean; data: PlatformAnalysis[]; page: number }>(`${this.baseUrl}/analisis`, {
      params: this.buildParams(params),
    });
  }

  getAnalysisStats(): Observable<ApiResponse<AnalysisStats>> {
    return this.http.get<ApiResponse<AnalysisStats>>(`${this.baseUrl}/analisis/stats`);
  }

  getReports(params?: Record<string, string | number | undefined>): Observable<ApiResponse<PlatformReport[]>> {
    return this.http.get<ApiResponse<PlatformReport[]>>(`${this.baseUrl}/reportes`, {
      params: this.buildParams(params),
    });
  }

  createReport(payload: CreateReportPayload): Observable<ApiResponse<PlatformReport>> {
    return this.http.post<ApiResponse<PlatformReport>>(`${this.baseUrl}/reportes`, payload);
  }

  getReportStats(): Observable<ApiResponse<ReportStats>> {
    return this.http.get<ApiResponse<ReportStats>>(`${this.baseUrl}/reportes/stats`);
  }

  getBitacoras(params?: Record<string, string | number | undefined>): Observable<ApiResponse<BitacoraEntry[]>> {
    return this.http.get<ApiResponse<BitacoraEntry[]>>(`${this.baseUrl}/bitacoras`, {
      params: this.buildParams(params),
    });
  }

  private buildParams(params?: Record<string, string | number | undefined>): HttpParams {
    let httpParams = new HttpParams();

    for (const [key, value] of Object.entries(params ?? {})) {
      if (value === undefined || value === null || value === '') {
        continue;
      }

      httpParams = httpParams.set(key, String(value));
    }

    return httpParams;
  }
}
