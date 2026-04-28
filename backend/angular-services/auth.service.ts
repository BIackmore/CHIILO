// ═══════════════════════════════════════════════════════════════
//  src/app/services/auth.service.ts  ← REEMPLAZA el archivo actual
//  Conecta con el backend real en lugar de datos mock
// ═══════════════════════════════════════════════════════════════
import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface UserProfile {
  id_usuario?: number;
  nombre:      string;
  correo:      string;
  rol:         'admin' | 'gov' | 'user';
  activo?:     boolean;
  telefono?:   string;
  // Campos en perfil JSON (gov)
  organizacion?:  string;
  numTrabajador?: string;
  dependencia?:   string;
  cargo?:         string;
  estado?:        'activo' | 'inactivo' | 'pendiente';
  fechaCreacion?: string;
}

interface AuthResponse {
  ok:    boolean;
  token: string;
  user:  UserProfile & { perfil?: Record<string, string> };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUser: UserProfile | null = null;

  constructor(private api: ApiService) {
    // Restaurar sesión al recargar la página
    const stored = localStorage.getItem('user');
    if (stored) {
      try { this.currentUser = JSON.parse(stored); } catch { /**/ }
    }
  }

  // ── Login ───────────────────────────────────────────────────
  async login(correo: string, password: string): Promise<UserProfile | null> {
    try {
      const res = await this.api.post<AuthResponse>('/auth/login', { correo, password });
      localStorage.setItem('token', res.token);
      const user = this.flattenUser(res.user);
      this.currentUser = user;
      localStorage.setItem('user', JSON.stringify(user));
      return user;
    } catch {
      return null;
    }
  }

  // ── Registro usuario común ───────────────────────────────────
  async register(nombre: string, correo: string, password: string): Promise<UserProfile> {
    const res = await this.api.post<AuthResponse>('/auth/register', { nombre, correo, password });
    localStorage.setItem('token', res.token);
    const user = this.flattenUser(res.user);
    this.currentUser = user;
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  }

  // ── Registro usuario gubernamental (solo admin) ──────────────
  async registerGov(data: {
    nombre: string; correo: string; password: string;
    organizacion: string; numTrabajador: string;
    dependencia: string; cargo: string; telefono: string;
  }): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.api.post('/auth/register-gov', data);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  // ── Verificar correo (validación local + backend lazy) ───────
  async existeCorreo(correo: string): Promise<boolean> {
    // La validación real ocurre en el backend al registrar
    return false;
  }

  existeNumTrabajador(_num: string): boolean { return false; }

  // ── Gestión de usuarios (admin) ──────────────────────────────
  async getAllUsers(): Promise<UserProfile[]> {
    const res = await this.api.get<{ ok: boolean; data: any[] }>('/usuarios');
    return res.data.map(u => this.flattenUser(u));
  }

  async deleteUser(correo: string): Promise<void> {
    const all = await this.getAllUsers();
    const user = all.find(u => u.correo.toLowerCase() === correo.toLowerCase());
    if (user?.id_usuario) {
      await this.api.delete(`/usuarios/${user.id_usuario}`);
    }
  }

  async setEstado(correo: string, estado: 'activo' | 'inactivo'): Promise<void> {
    const all = await this.getAllUsers();
    const user = all.find(u => u.correo.toLowerCase() === correo.toLowerCase());
    if (user?.id_usuario) {
      await this.api.patch(`/usuarios/${user.id_usuario}/estado`, { activo: estado === 'activo' });
    }
  }

  // ── Helpers ──────────────────────────────────────────────────
  /** Aplana el campo `perfil` JSONB sobre el objeto UserProfile */
  private flattenUser(raw: any): UserProfile {
    const perfil = raw.perfil || {};
    return {
      id_usuario:   raw.id_usuario,
      nombre:       raw.nombre,
      correo:       raw.correo,
      rol:          raw.rol as 'admin' | 'gov' | 'user',
      activo:       raw.activo,
      telefono:     raw.telefono,
      organizacion:  perfil.organizacion,
      numTrabajador: perfil.numTrabajador,
      dependencia:   perfil.dependencia,
      cargo:         perfil.cargo,
      estado:        perfil.estado,
      fechaCreacion: perfil.fechaCreacion,
    };
  }

  logout(): void {
    this.currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  getUser(): UserProfile | null  { return this.currentUser; }
  isLoggedIn(): boolean          { return !!this.currentUser && !!localStorage.getItem('token'); }
}
