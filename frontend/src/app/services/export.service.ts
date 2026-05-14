import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ExportService {

  /** Export array of objects as CSV and trigger download */
  exportCSV(data: any[], filename: string): void {
    if (!data?.length) return;
    const keys = Object.keys(data[0]);
    const header = keys.join(',');
    const rows = data.map(row =>
      keys.map(k => {
        const val = row[k] ?? '';
        const str = String(val).replace(/"/g, '""');
        return str.includes(',') || str.includes('\n') ? `"${str}"` : str;
      }).join(',')
    );
    const csv = [header, ...rows].join('\n');
    this.download(csv, filename + '.csv', 'text/csv;charset=utf-8;');
  }

  /** Export image list as formatted CSV */
  exportImagenes(imagenes: any[], filename: string): void {
    const mapped = imagenes.map(i => ({
      Nombre: i.nombre,
      Zona: i.zona,
      Resultado: i.resultado,
      'Confianza (%)': i.confianza,
      Resolución: i.resolucion || '—',
      Tamaño: i.tamano || '—',
      Usuario: i.usuario || '—',
      Fecha: i.fecha,
    }));
    this.exportCSV(mapped, filename);
  }

  private download(content: string, filename: string, mimeType: string): void {
    const blob = new Blob(['\uFEFF' + content], { type: mimeType }); // BOM for Excel UTF-8
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
