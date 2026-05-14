import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, map, of, switchMap, tap } from 'rxjs';

import {
  AuthApiService,
  AuthProfile,
  AuthResponse,
  AuthUser,
  LoginRequest,
  RefreshResponse,
  RefreshTokenRequest,
  RegisterGovRequest,
  RegisterRequest,
} from '../api/auth-api.service';

export interface UserProfile {
  id_usuario?: number;
  nombre: string;
  correo: string;
  rol: string;
  organizacion?: string;
  numTrabajador?: string;
  dependencia?: string;
  cargo?: string;
  telefono?: string;
  estado?: 'activo' | 'inactivo' | 'pendiente';
  fechaCreacion?: string;
  activo?: boolean;
  fecha_registro?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authApi = inject(AuthApiService);
  private readonly router = inject(Router);

  private readonly tokenStorageKey = 'auth.token';
  private readonly refreshTokenStorageKey = 'auth.refresh_token';
  private readonly userStorageKey = 'auth.user';

  private readonly currentUserSubject = new BehaviorSubject<UserProfile | null>(
    this.readStoredUser(),
  );
  readonly currentUser$ = this.currentUserSubject.asObservable();

  login(correo: string, password: string): Observable<UserProfile> {
    const payload: LoginRequest = { correo, password };

    return this.authApi.login(payload).pipe(
      tap((response) =>
        this.storeSession(this.getAccessToken(response), this.getRefreshTokenValue(response), this.mapUser(response.user)),
      ),
      map((response) => this.mapUser(response.user)),
    );
  }

  register(nombre: string, correo: string, password: string): Observable<UserProfile> {
    const payload: RegisterRequest = { nombre, correo, password };

    return this.authApi.register(payload).pipe(
      tap((response) =>
        this.storeSession(this.getAccessToken(response), this.getRefreshTokenValue(response), this.mapUser(response.user)),
      ),
      map((response) => this.mapUser(response.user)),
    );
  }

  registerGov(data: {
    nombre: string;
    correo: string;
    password: string;
    organizacion: string;
    numTrabajador: string;
    dependencia: string;
    cargo: string;
    telefono: string;
  }): Observable<{ ok: boolean; error?: string }> {
    const payload: RegisterGovRequest = {
      nombre: data.nombre,
      correo: data.correo,
      password: data.password,
      telefono: data.telefono,
      organizacion: data.organizacion,
      numTrabajador: data.numTrabajador,
      dependencia: data.dependencia,
      cargo: data.cargo,
      perfil: {
        organizacion: data.organizacion,
        numTrabajador: data.numTrabajador,
        dependencia: data.dependencia,
        cargo: data.cargo,
      },
    };

    return this.authApi.registerGov(payload).pipe(
      map(() => ({ ok: true })),
      catchError((error) =>
        of({ ok: false, error: this.getErrorMessage(error, 'Error al guardar.') }),
      ),
    );
  }

  restoreSession(): Observable<UserProfile | null> {
    const token = this.getToken();
    if (!token) {
      this.clearSession();
      return of(null);
    }

    return this.authApi.me().pipe(
      map((response) => this.mapUser(response.user)),
      tap((user) => this.storeUser(user)),
      catchError(() => this.tryRefreshSession()),
    );
  }

  refreshSession(): Observable<UserProfile | null> {
    return this.tryRefreshSession();
  }

  logout(): void {
    this.clearSession();
  }

  handleUnauthorized(): void {
    this.clearSession();
    void this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenStorageKey);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenStorageKey);
  }

  getUser(): UserProfile | null {
    return this.currentUserSubject.value;
  }

  isLoggedIn(): boolean {
    return !!this.getToken() && !!this.getUser();
  }

  existeCorreo(_correo: string): boolean {
    return false;
  }

  deleteUser(_correo: string): void {}

  setEstado(_correo: string, _estado: 'activo' | 'inactivo'): void {}

  getAllUsers(): UserProfile[] {
    return [];
  }

  existeNumTrabajador(_num: string): boolean {
    return false;
  }

  private tryRefreshSession(): Observable<UserProfile | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.clearSession();
      return of(null);
    }

    const payload: RefreshTokenRequest = { refreshToken };

    return this.authApi.refresh(payload).pipe(
      switchMap((response) => this.handleRefreshResponse(response)),
      catchError(() => {
        this.clearSession();
        return of(null);
      }),
    );
  }

  private handleRefreshResponse(response: RefreshResponse): Observable<UserProfile | null> {
    const currentUser = this.getUser();
    const accessToken = this.getAccessToken(response);
    const refreshToken = this.getRefreshTokenValue(response);

    if (currentUser) {
      this.storeSession(accessToken, refreshToken, currentUser);
      return of(currentUser);
    }

    localStorage.setItem(this.tokenStorageKey, accessToken);
    localStorage.setItem(this.refreshTokenStorageKey, refreshToken);

    return this.authApi.me().pipe(
      map((meResponse) => this.mapUser(meResponse.user)),
      tap((user) => this.storeUser(user)),
    );
  }

  private storeSession(token: string, refreshToken: string, user: UserProfile): void {
    localStorage.setItem(this.tokenStorageKey, token);
    localStorage.setItem(this.refreshTokenStorageKey, refreshToken);
    this.storeUser(user);
  }

  private storeUser(user: UserProfile): void {
    localStorage.setItem(this.userStorageKey, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  private clearSession(): void {
    localStorage.removeItem(this.tokenStorageKey);
    localStorage.removeItem(this.refreshTokenStorageKey);
    localStorage.removeItem(this.userStorageKey);
    this.currentUserSubject.next(null);
  }

  private readStoredUser(): UserProfile | null {
    const storedUser = localStorage.getItem(this.userStorageKey);
    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser) as UserProfile;
    } catch {
      localStorage.removeItem(this.userStorageKey);
      return null;
    }
  }

  private mapUser(user: AuthUser): UserProfile {
    const profile = (user.perfil ?? {}) as AuthProfile;
    const roleName = typeof user.rol === 'string' ? user.rol : user.rol?.nombre;

    return {
      id_usuario: user.id_usuario,
      nombre: user.nombre,
      correo: user.correo,
      rol: this.normalizeRole(roleName),
      organizacion: this.readString(profile['organizacion']),
      numTrabajador: this.readString(profile['numTrabajador']),
      dependencia: this.readString(profile['dependencia']),
      cargo: this.readString(profile['cargo']),
      telefono: user.telefono ?? this.readString(profile['telefono']),
      estado: this.readStatus(profile['estado']),
      fechaCreacion: this.readString(profile['fechaCreacion']),
      activo: user.activo,
      fecha_registro: user.fecha_registro,
    };
  }

  private readString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }

  private normalizeRole(value: string | undefined): string {
    if (!value) {
      return 'user';
    }

    const normalized = value.toLowerCase();
    if (normalized === 'autoridad') {
      return 'gov';
    }
    if (normalized === 'administrador') {
      return 'admin';
    }
    return normalized;
  }

  private readStatus(value: unknown): UserProfile['estado'] {
    return value === 'activo' || value === 'inactivo' || value === 'pendiente' ? value : undefined;
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (typeof error !== 'object' || error === null) {
      return fallback;
    }

    const maybeError = error as { error?: { message?: string; error?: string } };
    return maybeError.error?.message ?? maybeError.error?.error ?? fallback;
  }

  private getAccessToken(response: AuthResponse | RefreshResponse): string {
    return response.token || response.accessToken || '';
  }

  private getRefreshTokenValue(response: AuthResponse | RefreshResponse): string {
    return response.refreshToken || response.refresh_token || '';
  }
}
