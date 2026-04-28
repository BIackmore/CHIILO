// ═══════════════════════════════════════════════════════════════
//  src/app/services/api.service.ts
//  Servicio base – todas las llamadas HTTP al backend
// ═══════════════════════════════════════════════════════════════
import { Injectable } from '@angular/core';

const BASE_URL = 'http://localhost:3000/api';

@Injectable({ providedIn: 'root' })
export class ApiService {

  private getHeaders(): Record<string, string> {
    const token = localStorage.getItem('token');
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }

  private getAuthHeader(): Record<string, string> {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, { headers: this.getHeaders() });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Error de servidor');
    return data as T;
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Error de servidor');
    return data as T;
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Error de servidor');
    return data as T;
  }

  async delete<T>(path: string): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Error de servidor');
    return data as T;
  }

  async uploadFile<T>(path: string, file: File, fieldName = 'imagen'): Promise<T> {
    const form = new FormData();
    form.append(fieldName, file);
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: this.getAuthHeader(),   // NO poner Content-Type; fetch lo pone con boundary
      body: form,
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Error al subir archivo');
    return data as T;
  }
}
