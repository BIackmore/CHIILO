import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../environments/environment';

export type UserRole = 'admin' | 'gov' | 'user' | 'ADMIN' | 'AUTORIDAD';
export type UserStatus = 'activo' | 'inactivo' | 'pendiente';

export interface AuthRole {
  id_rol: number;
  nombre: UserRole | string;
  descripcion?: string | null;
}

export interface AuthProfile {
  organizacion?: string;
  estado?: UserStatus;
  fechaCreacion?: string;
  numTrabajador?: string;
  dependencia?: string;
  cargo?: string;
  [key: string]: unknown;
}

export interface AuthUser {
  id_usuario: number;
  nombre: string;
  correo: string;
  activo: boolean;
  telefono?: string | null;
  fecha_registro?: string;
  rol: AuthRole | UserRole | string;
  perfil?: AuthProfile | null;
}

export interface LoginRequest {
  correo: string;
  password: string;
}

export interface RegisterRequest {
  nombre: string;
  correo: string;
  password: string;
  telefono?: string;
  perfil?: AuthProfile;
}

export interface RegisterGovRequest extends RegisterRequest {
  organizacion: string;
  numTrabajador: string;
  dependencia: string;
  cargo: string;
  telefono?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface AuthResponse {
  token: string;
  accessToken?: string;
  refreshToken?: string;
  refresh_token?: string;
  user: AuthUser;
  expires_in?: number;
  refresh_expires_in?: number;
}

export interface MeResponse {
  user: AuthUser;
}

export interface RefreshResponse {
  token: string;
  accessToken?: string;
  refreshToken?: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_expires_in?: number;
}

@Injectable({
  providedIn: 'root',
})
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrlBase}/auth`;

  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, payload);
  }

  register(payload: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/register`, payload);
  }

  registerGov(payload: RegisterGovRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/register-gov`, payload);
  }

  refresh(payload: RefreshTokenRequest): Observable<RefreshResponse> {
    return this.http.post<RefreshResponse>(`${this.baseUrl}/refresh`, payload);
  }

  me(): Observable<MeResponse> {
    return this.http.get<MeResponse>(`${this.baseUrl}/me`);
  }
}
