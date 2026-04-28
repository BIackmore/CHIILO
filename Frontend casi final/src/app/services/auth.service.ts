import { Injectable } from '@angular/core';

export interface UserProfile {
  nombre: string;
  correo: string;
  rol: 'admin' | 'gov' | 'user';
  organizacion?: string;
  // Campos exclusivos del usuario gubernamental
  numTrabajador?: string;
  dependencia?:   string;
  cargo?:         string;
  telefono?:      string;
  estado?:        'activo' | 'inactivo' | 'pendiente';
  fechaCreacion?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  private users: { correo: string; password: string; perfil: UserProfile }[] = [
    {
      correo: 'denysrodriguez1102@gmail.com',
      password: 'TTA2070',
      perfil: {
        nombre: 'Denys Rodríguez', correo: 'denysrodriguez1102@gmail.com',
        rol: 'admin', organizacion: 'Sistema de Prevención de Incendios',
        estado: 'activo', fechaCreacion: '01/01/2025'
      }
    },
    {
      correo: 'proyectodispositivos8@gmail.com',
      password: 'TTA2070',
      perfil: {
        nombre: 'Dr. Jesus', correo: 'proyectodispositivos8@gmail.com',
        rol: 'gov', organizacion: 'Secretaría de Medio Ambiente – Morelos',
        numTrabajador: 'MOR-2025-001', dependencia: 'Secretaría de Medio Ambiente',
        cargo: 'Analista de Riesgos', telefono: '777-000-0000',
        estado: 'activo', fechaCreacion: '10/01/2025'
      }
    },
    {
      correo: 'usuario@test.com',
      password: 'TTA2070',
      perfil: {
        nombre: 'Usuario Común', correo: 'usuario@test.com',
        rol: 'user', estado: 'activo', fechaCreacion: '15/01/2025'
      }
    }
  ];

  private currentUser: UserProfile | null = null;

  login(correo: string, password: string): UserProfile | null {
    const found = this.users.find(
      u => u.correo.toLowerCase() === correo.toLowerCase() && u.password === password
    );
    if (found) { this.currentUser = found.perfil; return found.perfil; }
    return null;
  }

  /** Registro de usuario común  */
  register(nombre: string, correo: string, password: string): UserProfile {
    const hoy = new Date().toLocaleDateString('es-MX');
    const perfil: UserProfile = { nombre, correo, rol: 'user', estado: 'activo', fechaCreacion: hoy };
    this.users.push({ correo: correo.toLowerCase(), password, perfil });
    this.currentUser = perfil;
    return perfil;
  }

  /** Registro de usuario gubernamental  */
  registerGov(data: {
    nombre: string; correo: string; password: string;
    organizacion: string; numTrabajador: string;
    dependencia: string; cargo: string; telefono: string;
  }): { ok: boolean; error?: string } {
    if (this.existeCorreo(data.correo))
      return { ok: false, error: 'Ya existe una cuenta con ese correo.' };
    if (this.existeNumTrabajador(data.numTrabajador))
      return { ok: false, error: 'El número de trabajador ya está registrado.' };

    const hoy = new Date().toLocaleDateString('es-MX');
    const perfil: UserProfile = {
      nombre: data.nombre, correo: data.correo, rol: 'gov',
      organizacion: data.organizacion, numTrabajador: data.numTrabajador,
      dependencia: data.dependencia, cargo: data.cargo, telefono: data.telefono,
      estado: 'activo', fechaCreacion: hoy
    };
    this.users.push({ correo: data.correo.toLowerCase(), password: data.password, perfil });
    return { ok: true };
  }

  /** Eliminar usuario */
  deleteUser(correo: string): void {
    this.users = this.users.filter(u => u.correo.toLowerCase() !== correo.toLowerCase());
  }

  /** Actualizar estado */
  setEstado(correo: string, estado: 'activo' | 'inactivo'): void {
    const found = this.users.find(u => u.correo.toLowerCase() === correo.toLowerCase());
    if (found) found.perfil.estado = estado;
  }

  /** Obtener todos los usuarios */
  getAllUsers(): UserProfile[] {
    return this.users
      .filter(u => u.perfil.rol !== 'admin')
      .map(u => u.perfil);
  }

  existeCorreo(correo: string): boolean {
    return this.users.some(u => u.correo.toLowerCase() === correo.toLowerCase());
  }

  existeNumTrabajador(num: string): boolean {
    return this.users.some(u => u.perfil.numTrabajador?.toLowerCase() === num.toLowerCase());
  }

  logout() { this.currentUser = null; }
  getUser(): UserProfile | null { return this.currentUser; }
  isLoggedIn(): boolean { return !!this.currentUser; }
}
