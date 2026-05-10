import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AuthService, UserProfile } from '../../services/auth.service';
import {
  BitacoraEntry,
  PlatformApiService,
  PlatformImage,
  PlatformReport,
  PlatformUser,
} from '../../api/platform-api.service';
import { ShellComponent, NavItem } from '../../shared/shell/shell';
import { FilterByPipe } from '../../shared/pipes/filter-by.pipe';
import { CountByPipe } from '../../shared/pipes/count-by.pipe';
import { ExportService } from '../../services/export.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, ShellComponent, FilterByPipe, CountByPipe],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class AdminComponent implements OnInit {
  activeTab = 'usuarios';

  navItems: NavItem[] = [
    {
      tab: 'usuarios',
      label: 'Gestión de Usuarios',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
    },
    {
      tab: 'imagenes',
      label: 'Historial de Imágenes',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    },
    {
      tab: 'bitacora',
      label: 'Bitácora & Reportes',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    },
    {
      tab: 'zonas',
      label: 'Zonas de Monitoreo',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 00-8 8c0 5.4 7 13.4 8 13.4s8-8 8-13.4a8 8 0 00-8-8z"/></svg>',
    },
    {
      tab: 'ia',
      label: 'Modelo de IA',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>',
    },
    {
      tab: 'rendimiento',
      label: 'Rendimiento & Métricas',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    },
  ];

  constructor(
    private auth: AuthService,
    private router: Router,
    private platformApi: PlatformApiService,
    private exportSvc: ExportService,
  ) {}

  exportImagenes() {
    this.exportSvc.exportImagenes(
      this.imagenes,
      'historial-imagenes-' + new Date().toISOString().slice(0, 10),
    );
  }

  ngOnInit() {
    if (!this.auth.getUser()) this.router.navigate(['/login']);
    this.loadAdminData();
  }

  // ══════════════════════════════════════════════
  // GESTIÓN DE USUARIOS
  // ══════════════════════════════════════════════
  search = '';
  users: UserProfile[] = [];
  showHistorial = false;

  // Modal
  showModal = false;
  modalError = '';
  modalOk = false;
  savingModal = false;

  nuevoGov = {
    nombre: '',
    correo: '',
    password: '',
    confirmPassword: '',
    organizacion: '',
    numTrabajador: '',
    dependencia: '',
    cargo: '',
    telefono: '',
  };

  loading = false;
  error = '';

  private rawUsers: PlatformUser[] = [];
  private rawImages: PlatformImage[] = [];
  private rawReports: PlatformReport[] = [];
  private rawBitacoras: BitacoraEntry[] = [];

  loadAdminData() {
    this.loading = true;
    this.error = '';

    forkJoin({
      users: this.platformApi.getUsers(),
      images: this.platformApi.getImages({ limit: 100 }),
      reports: this.platformApi.getReports({ limit: 100 }),
      bitacoras: this.platformApi.getBitacoras({ limit: 100 }),
    }).subscribe({
      next: ({ users, images, reports, bitacoras }) => {
        this.loading = false;
        this.rawUsers = users.data;
        this.rawImages = images.data;
        this.rawReports = reports.data;
        this.rawBitacoras = bitacoras.data;
        this.users = this.rawUsers.map((user) => this.mapUser(user));
        this.imagenes = this.rawImages.map((image) => this.mapImage(image));
        this.reportes = this.rawReports.map((report) => this.mapReport(report));
        this.historialActividad = this.rawBitacoras.map((entry) => this.mapBitacora(entry));
        this.zonas = this.buildZones(this.rawImages);
      },
      error: () => {
        this.loading = false;
        this.error = 'No se pudo cargar la informacion del panel.';
      },
    });
  }

  loadUsers() {
    this.users = this.rawUsers.map((user) => this.mapUser(user));
  }

  get filteredUsers() {
    const q = this.search.toLowerCase();
    return q
      ? this.users.filter(
          (u) =>
            u.nombre.toLowerCase().includes(q) ||
            u.correo.toLowerCase().includes(q) ||
            u.organizacion?.toLowerCase().includes(q) ||
            u.numTrabajador?.toLowerCase().includes(q),
        )
      : this.users;
  }

  openModal() {
    this.nuevoGov = {
      nombre: '',
      correo: '',
      password: '',
      confirmPassword: '',
      organizacion: '',
      numTrabajador: '',
      dependencia: '',
      cargo: '',
      telefono: '',
    };
    this.modalError = '';
    this.modalOk = false;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  guardarGov() {
    this.modalError = '';
    const g = this.nuevoGov;

    if (
      !g.nombre ||
      !g.correo ||
      !g.password ||
      !g.confirmPassword ||
      !g.organizacion ||
      !g.numTrabajador ||
      !g.dependencia ||
      !g.cargo
    ) {
      this.modalError = 'Todos los campos marcados con * son obligatorios.';
      return;
    }
    if (g.password.length < 6) {
      this.modalError = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }
    if (g.password !== g.confirmPassword) {
      this.modalError = 'Las contraseñas no coinciden.';
      return;
    }
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(g.correo)) {
      this.modalError = 'El formato del correo no es válido.';
      return;
    }

    this.savingModal = true;

    this.auth
      .registerGov({
        nombre: g.nombre,
        correo: g.correo,
        password: g.password,
        organizacion: g.organizacion,
        numTrabajador: g.numTrabajador,
        dependencia: g.dependencia,
        cargo: g.cargo,
        telefono: g.telefono,
      })
      .subscribe((result) => {
        this.savingModal = false;
        if (!result.ok) {
          this.modalError = result.error || 'Error al guardar.';
          return;
        }
        this.modalOk = true;
        this.loadAdminData();
        setTimeout(() => {
          this.showModal = false;
          this.modalOk = false;
        }, 2000);
      });
  }

  deleteUser(correo: string) {
    const user = this.users.find((item) => item.correo === correo);
    if (!user?.id_usuario) {
      return;
    }

    if (confirm('¿Eliminar este usuario?')) {
      this.platformApi.deleteUser(user.id_usuario).subscribe({
        next: () => this.loadAdminData(),
        error: () => {
          this.error = 'No se pudo eliminar el usuario.';
        },
      });
    }
  }

  toggleEstado(u: UserProfile) {
    if (!u.id_usuario) {
      return;
    }

    this.platformApi.toggleUserStatus(u.id_usuario).subscribe({
      next: ({ activo }) => {
        u.estado = activo ? 'activo' : 'inactivo';
        u.activo = activo;
      },
      error: () => {
        this.error = 'No se pudo actualizar el estado del usuario.';
      },
    });
  }

  historialActividad: Array<{ usuario: string; accion: string; fecha: string; ip: string }> = [];

  // ══════════════════════════════════════════════
  // BITÁCORA + DESCARGA
  // ══════════════════════════════════════════════
  bSearch = '';
  reportes: Array<{ id: number; tipo: string; ubicacion: string; sev: string; usuario: string; fecha: string; estado: string }> = [];
  archivos = [
    {
      nombre: 'Reporte Mensual – Noviembre 2025',
      size: '2.4 MB',
      formato: 'PDF',
      fecha: '20/11/2025',
    },
    {
      nombre: 'Análisis Semanal – Semana 47',
      size: '1.2 MB',
      formato: 'Excel',
      fecha: '19/11/2025',
    },
    {
      nombre: 'Reporte de Incidentes – Octubre',
      size: '3.8 MB',
      formato: 'PDF',
      fecha: '30/10/2025',
    },
    { nombre: 'Estadísticas Anuales 2025', size: '5.2 MB', formato: 'PDF', fecha: '31/12/2024' },
  ];
  get filteredReportes() {
    const q = this.bSearch.toLowerCase();
    return q
      ? this.reportes.filter(
          (r) =>
            r.ubicacion.toLowerCase().includes(q) ||
            r.tipo.toLowerCase().includes(q) ||
            r.usuario.toLowerCase().includes(q),
        )
      : this.reportes;
  }
  get repAlta() {
    return this.reportes.filter((r) => r.sev === 'Alta').length;
  }
  get repMedia() {
    return this.reportes.filter((r) => r.sev === 'Media').length;
  }
  get repProc() {
    return this.reportes.filter((r) => r.estado === 'En Proceso').length;
  }

  // ══════════════════════════════════════════════
  // RESTO DE TABS (sin cambios)
  // ══════════════════════════════════════════════
  imagenes: Array<{ nombre: string; zona: string; resultado: string; confianza: number; resolucion: string; tamano: string; usuario: string; fecha: string; color: string }> = [];
  zonas: Array<{ nombre: string; area: string; upd: string; riesgo: string; rColor: string; temp: string; hum: string; viento: string; inc: number }> = [];
  modeloActivo = {
    nombre: 'FireDetection-v2.3',
    version: '2.3.0',
    precision: 94.5,
    detecciones: 1247,
    actualizacion: '14/11/2025',
  };
  modelos = [
    {
      nombre: 'FireDetection-v2.4-beta',
      tag: 'Beta',
      tagC: 'b-warn',
      version: '2.4.0-beta',
      precision: 95.8,
      tamano: '145 MB',
      fecha: '19/11/2025',
    },
    {
      nombre: 'FireDetection-v2.2',
      tag: 'Estable',
      tagC: 'b-info',
      version: '2.2.0',
      precision: 93.2,
      tamano: '142 MB',
      fecha: '30/9/2025',
    },
  ];
  perf = { precision: 95.2, respuesta: '1.8s', detecciones: 342, falsos: 17 };
  chartData = [
    { f: '15 Nov', v: 97 },
    { f: '16 Nov', v: 100 },
    { f: '17 Nov', v: 96 },
    { f: '18 Nov', v: 100 },
    { f: '19 Nov', v: 98 },
    { f: '20 Nov', v: 99 },
    { f: '21 Nov', v: 100 },
  ];
  barData = [
    { f: '15 Nov', det: 45, fp: 2 },
    { f: '16 Nov', det: 52, fp: 3 },
    { f: '17 Nov', det: 38, fp: 4 },
    { f: '18 Nov', det: 61, fp: 3 },
    { f: '19 Nov', det: 49, fp: 2 },
    { f: '20 Nov', det: 55, fp: 2 },
    { f: '21 Nov', det: 42, fp: 1 },
  ];
  servicio = { estado: 'Operacional', uptime: '99.8%', solicitudes: '45,231', respuesta: '142ms' };
  recursos = [
    { label: 'Uso de CPU', valor: 42, color: 'var(--ember)' },
    { label: 'Uso de Memoria', valor: 68, color: 'var(--warn)' },
    { label: 'Uso de Disco', valor: 54, color: 'var(--ok)' },
  ];
  metricConfig = { precision: 95, respuesta: 2.5, confianza: 0.85, falsos: 5 };
  editingMetrics = false;

  private mapUser(user: PlatformUser): UserProfile {
    const profile = user.perfil ?? {};

    return {
      id_usuario: user.id_usuario,
      nombre: user.nombre,
      correo: user.correo,
      rol: user.rol,
      organizacion: this.readProfileString(profile, 'organizacion'),
      numTrabajador: this.readProfileString(profile, 'numTrabajador'),
      dependencia: this.readProfileString(profile, 'dependencia'),
      cargo: this.readProfileString(profile, 'cargo'),
      telefono: user.telefono ?? undefined,
      estado: user.activo ? 'activo' : 'inactivo',
      fechaCreacion: this.readProfileString(profile, 'fechaCreacion') ?? user.fecha_registro,
      activo: user.activo,
      fecha_registro: user.fecha_registro,
    };
  }

  private mapImage(image: PlatformImage) {
    const risk = this.capitalize(image.nivel_riesgo ?? 'bajo');

    return {
      nombre: image.nombre,
      zona: image.zona ?? 'Sin zona',
      resultado: risk === 'Alto' ? 'Incendio Detectado' : risk === 'Medio' ? 'Posible Incendio' : 'Sin Incendio',
      confianza: image.confianza ?? 0,
      resolucion: image.resolucion ?? 'N/D',
      tamano: image.tamano ?? 'N/D',
      usuario: image.usuario,
      fecha: image.fecha ?? 'N/D',
      color: this.getRiskBadge(image.nivel_riesgo),
    };
  }

  private mapReport(report: PlatformReport) {
    return {
      id: report.id_reporte,
      tipo: report.tipo,
      ubicacion: report.ubicacion ?? 'Sin ubicacion',
      sev: this.capitalize(report.severidad ?? report.nivel_riesgo ?? 'baja'),
      usuario: report.usuario,
      fecha: report.fecha,
      estado: report.estado ?? 'Pendiente',
    };
  }

  private mapBitacora(entry: BitacoraEntry) {
    return {
      usuario: entry.cambiado_por ?? 'Sistema',
      accion: entry.descripcion ?? `${entry.operacion} en ${entry.tabla_nombre}`,
      fecha: entry.fecha,
      ip: 'N/D',
    };
  }

  private buildZones(images: PlatformImage[]) {
    const grouped = new Map<string, PlatformImage[]>();

    for (const image of images) {
      const zone = image.zona ?? 'Sin zona';
      const current = grouped.get(zone) ?? [];
      current.push(image);
      grouped.set(zone, current);
    }

    return Array.from(grouped.entries()).map(([zone, zoneImages]) => {
      const highestRisk = zoneImages.some((image) => image.nivel_riesgo === 'alto')
        ? 'Alto'
        : zoneImages.some((image) => image.nivel_riesgo === 'medio')
          ? 'Medio'
          : 'Bajo';

      return {
        nombre: zone,
        area: 'N/D',
        upd: zoneImages[0]?.fecha ?? 'N/D',
        riesgo: highestRisk,
        rColor: this.getRiskBadge(highestRisk.toLowerCase()),
        temp: 'N/D',
        hum: 'N/D',
        viento: 'N/D',
        inc: zoneImages.length,
      };
    });
  }

  private readProfileString(profile: Record<string, unknown> | null | undefined, key: string): string | undefined {
    const value = profile?.[key];
    return typeof value === 'string' ? value : undefined;
  }

  private getRiskBadge(level?: string | null): string {
    if (level === 'alto') return 'b-danger';
    if (level === 'medio') return 'b-warn';
    return 'b-ok';
  }

  private capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }
}
