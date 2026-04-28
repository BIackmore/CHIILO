// ═══════════════════════════════════════════════════════════════
//  src/app/pages/admin/admin.ts  ← ACTUALIZACIÓN
//  Carga usuarios, imágenes, reportes y bitácora desde el backend
// ═══════════════════════════════════════════════════════════════
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, UserProfile } from '../../services/auth.service';
import { ImagenesService } from '../../services/imagenes.service';
import { ReportesService, Reporte } from '../../services/reportes.service';
import { ApiService } from '../../services/api.service';
import { ShellComponent, NavItem } from '../../shared/shell/shell';
import { FilterByPipe } from '../../shared/pipes/filter-by.pipe';
import { CountByPipe } from '../../shared/pipes/count-by.pipe';
import { ExportService } from '../../services/export.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, ShellComponent, FilterByPipe, CountByPipe],
  templateUrl: './admin.html',
  styleUrl:    './admin.scss',
})
export class AdminComponent implements OnInit {
  activeTab = 'usuarios';
  cargando  = false;

  navItems: NavItem[] = [
    { tab: 'usuarios',    label: 'Gestión de Usuarios',    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>' },
    { tab: 'imagenes',    label: 'Historial de Imágenes',  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' },
    { tab: 'ia',          label: 'Modelo de IA',           icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>' },
    { tab: 'rendimiento', label: 'Rendimiento & Métricas', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>' },
  ];

  constructor(
    private auth:       AuthService,
    private router:     Router,
    private imgSvc:     ImagenesService,
    private repSvc:     ReportesService,
    private api:        ApiService,
    private exportSvc:  ExportService,
  ) {}

  async ngOnInit() {
    if (!this.auth.getUser()) { this.router.navigate(['/login']); return; }
    await Promise.all([this.loadUsers(), this.loadImagenes(), this.loadReportes(), this.loadBitacora()]);
  }

  // ── USUARIOS ────────────────────────────────────────────────
  search  = '';
  users:   UserProfile[] = [];
  showModal   = false;
  modalError  = '';
  modalOk     = false;
  savingModal = false;

  nuevoGov = { nombre:'', correo:'', password:'', confirmPassword:'', organizacion:'', numTrabajador:'', dependencia:'', cargo:'', telefono:'' };

  async loadUsers() {
    try { this.users = await this.auth.getAllUsers(); } catch { /**/ }
  }

  get filteredUsers() {
    const q = this.search.toLowerCase();
    return q ? this.users.filter(u =>
      u.nombre.toLowerCase().includes(q) ||
      u.correo.toLowerCase().includes(q) ||
      (u.organizacion?.toLowerCase().includes(q)) ||
      (u.numTrabajador?.toLowerCase().includes(q))) : this.users;
  }

  openModal()  { this.nuevoGov = { nombre:'',correo:'',password:'',confirmPassword:'',organizacion:'',numTrabajador:'',dependencia:'',cargo:'',telefono:'' }; this.modalError=''; this.modalOk=false; this.showModal=true; }
  closeModal() { this.showModal = false; }

  async guardarGov() {
    this.modalError = '';
    const g = this.nuevoGov;
    if (!g.nombre||!g.correo||!g.password||!g.confirmPassword||!g.organizacion||!g.numTrabajador||!g.dependencia||!g.cargo) { this.modalError='Todos los campos con * son obligatorios.'; return; }
    if (g.password.length < 6) { this.modalError='La contraseña debe tener al menos 6 caracteres.'; return; }
    if (g.password !== g.confirmPassword) { this.modalError='Las contraseñas no coinciden.'; return; }
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(g.correo)) { this.modalError='El formato del correo no es válido.'; return; }

    this.savingModal = true;
    const result = await this.auth.registerGov({
      nombre: g.nombre, correo: g.correo, password: g.password,
      organizacion: g.organizacion, numTrabajador: g.numTrabajador,
      dependencia: g.dependencia, cargo: g.cargo, telefono: g.telefono,
    });
    this.savingModal = false;
    if (!result.ok) { this.modalError = result.error || 'Error al guardar.'; return; }
    this.modalOk = true;
    await this.loadUsers();
    setTimeout(() => { this.showModal=false; this.modalOk=false; }, 2000);
  }

  async deleteUser(correo: string) {
    if (confirm('¿Eliminar este usuario?')) {
      await this.auth.deleteUser(correo);
      await this.loadUsers();
    }
  }

  async toggleEstado(u: UserProfile) {
    const nuevo = u.estado === 'activo' ? 'inactivo' : 'activo';
    await this.auth.setEstado(u.correo, nuevo);
    await this.loadUsers();
  }

  // ── IMÁGENES ────────────────────────────────────────────────
  imagenes: any[] = [];

  async loadImagenes() {
    try {
      const res = await this.imgSvc.getAll();
      this.imagenes = res.data.map(i => this.imgSvc.toFrontendFormat(i));
    } catch { /**/ }
  }

  exportImagenes() {
    this.exportSvc.exportImagenes(this.imagenes, 'historial-imagenes-' + new Date().toISOString().slice(0,10));
  }

  // ── REPORTES / BITÁCORA ─────────────────────────────────────
  bSearch  = '';
  reportes: Reporte[] = [];

  async loadReportes() {
    try { this.reportes = await this.repSvc.getAll(); } catch { /**/ }
  }

  get filteredReportes() {
    const q = this.bSearch.toLowerCase();
    return q ? this.reportes.filter(r =>
      r.ubicacion?.toLowerCase().includes(q) ||
      r.tipo?.toLowerCase().includes(q) ||
      r.usuario?.toLowerCase().includes(q)) : this.reportes;
  }

  get repAlta()  { return this.reportes.filter(r => r.nivel_riesgo==='alto').length; }
  get repMedia() { return this.reportes.filter(r => r.nivel_riesgo==='medio').length; }
  get repProc()  { return this.reportes.filter(r => r.estado==='En Proceso').length; }

  // ── BITÁCORA ────────────────────────────────────────────────
  historialActividad: any[] = [];

  async loadBitacora() {
    try {
      const res = await this.api.get<any>('/bitacoras?limit=10');
      this.historialActividad = res.data.map((b: any) => ({
        usuario:  b.cambiado_por || '—',
        accion:   b.descripcion  || b.operacion,
        fecha:    b.fecha,
        ip:       b.datos_despues?.ip || '—',
      }));
    } catch { /**/ }
  }

  // ── MÉTRICAS (datos estáticos mantenidos igual que el original) ──
  modeloActivo = { nombre:'FireDetection-v2.3', version:'2.3.0', precision:94.5, detecciones:1247, actualizacion:'14/11/2025' };
  modelos      = [
    { nombre:'FireDetection-v2.4-beta', tag:'Beta',    tagC:'b-warn', version:'2.4.0-beta', precision:95.8, tamano:'145 MB', fecha:'19/11/2025' },
    { nombre:'FireDetection-v2.2',      tag:'Estable', tagC:'b-info', version:'2.2.0',      precision:93.2, tamano:'142 MB', fecha:'30/9/2025'  },
  ];
  perf      = { precision:95.2, respuesta:'1.8s', detecciones:342, falsos:17 };
  servicio  = { estado:'Operacional', uptime:'99.8%', solicitudes:'45,231', respuesta:'142ms' };
  recursos  = [{ label:'Uso de CPU', valor:42, color:'var(--ember)' }, { label:'Uso de Memoria', valor:68, color:'var(--warn)' }, { label:'Uso de Disco', valor:54, color:'var(--ok)' }];
  metricConfig  = { precision:95, respuesta:2.5, confianza:0.85, falsos:5 };
  editingMetrics = false;
  showHistorial  = false;
  chartData = [{f:'15 Nov',v:97},{f:'16 Nov',v:100},{f:'17 Nov',v:96},{f:'18 Nov',v:100},{f:'19 Nov',v:98},{f:'20 Nov',v:99},{f:'21 Nov',v:100}];
  barData   = [{f:'15 Nov',det:45,fp:2},{f:'16 Nov',det:52,fp:3},{f:'17 Nov',det:38,fp:4},{f:'18 Nov',det:61,fp:3},{f:'19 Nov',det:49,fp:2},{f:'20 Nov',det:55,fp:2},{f:'21 Nov',det:42,fp:1}];
  zonas     = [{ nombre:'Zona Norte – Sector A', area:'12.5 km²', upd:'10:30 a.m.', riesgo:'Alto', rColor:'b-danger', temp:'42°C', hum:'15%', viento:'35 km/h', inc:3 }, { nombre:'Zona Sur – Sector C', area:'8.3 km²', upd:'10:28 a.m.', riesgo:'Bajo', rColor:'b-ok', temp:'28°C', hum:'45%', viento:'12 km/h', inc:0 }, { nombre:'Zona Este – Sector B', area:'10.1 km²', upd:'09:55 a.m.', riesgo:'Medio', rColor:'b-warn', temp:'35°C', hum:'22%', viento:'20 km/h', inc:1 }];
  archivos  = [{ nombre:'Reporte Mensual – Noviembre 2025', size:'2.4 MB', formato:'PDF', fecha:'20/11/2025' }, { nombre:'Análisis Semanal – Semana 47', size:'1.2 MB', formato:'Excel', fecha:'19/11/2025' }];
}
