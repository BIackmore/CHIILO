// ═══════════════════════════════════════════════════════════════
//  src/app/services/reportes.service.ts
// ═══════════════════════════════════════════════════════════════
import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface Reporte {
  id_reporte:       number;
  tipo:             string;
  contenido_summary:string;
  ubicacion:        string;
  severidad:        string;
  estado:           string;
  usuario:          string;
  nivel_riesgo:     string;
  color_hex:        string;
  fecha:            string;
}

@Injectable({ providedIn: 'root' })
export class ReportesService {
  constructor(private api: ApiService) {}

  async getAll(page = 1): Promise<Reporte[]> {
    const res = await this.api.get<any>(`/reportes?page=${page}`);
    return res.data;
  }

  async getOne(id: number): Promise<Reporte> {
    const res = await this.api.get<any>(`/reportes/${id}`);
    return res.data;
  }

  async getStats(): Promise<any> {
    const res = await this.api.get<any>('/reportes/stats');
    return res.data;
  }

  async create(payload: {
    id_analisis: number;
    tipo: string;
    contenido_summary?: string;
    parametros?: Record<string, string>;
  }): Promise<Reporte> {
    const res = await this.api.post<any>('/reportes', payload);
    return res.data;
  }
}


// ═══════════════════════════════════════════════════════════════
//  src/app/services/offline-queue.service.ts  (FRAGMENTO)
//  Solo reemplaza el método uploadItem con la llamada real
// ═══════════════════════════════════════════════════════════════
//
//  Reemplaza el bloque "Simulate upload" en offline-queue.service.ts
//  con lo siguiente:
//
//  private async uploadItem(item: QueuedImage): Promise<void> {
//    item.status = 'uploading';
//    await this.dbPut(item);
//    try {
//      const blob     = await fetch(item.base64Data).then(r => r.blob());
//      const file     = new File([blob], item.fileName, { type: item.fileType });
//      const formData = new FormData();
//      formData.append('imagen', file, item.fileName);
//      const token = localStorage.getItem('token');
//      const res = await fetch('http://localhost:3000/api/imagenes/upload', {
//        method: 'POST',
//        headers: token ? { Authorization: `Bearer ${token}` } : {},
//        body: formData,
//      });
//      if (!res.ok) throw new Error('Upload failed');
//      item.status = 'done';
//    } catch {
//      item.status = 'error';
//    }
//    await this.dbPut(item);
//  }
