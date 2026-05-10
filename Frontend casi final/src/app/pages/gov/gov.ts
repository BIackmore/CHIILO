import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { AnalysisStats, PlatformApiService, PlatformImage } from '../../api/platform-api.service';
import { ShellComponent, NavItem } from '../../shared/shell/shell';
import { ExportService } from '../../services/export.service';

@Component({
  selector: 'app-gov',
  standalone: true,
  imports: [CommonModule, FormsModule, ShellComponent],
  templateUrl: './gov.html',
  styleUrl: './gov.scss'
})
export class GovComponent implements OnInit {
  activeTab = 'procesar';
  loading = false;
  error = '';

  navItems: NavItem[] = [
    { tab:'procesar',    label:'Procesar Imagen',        icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' },
    { tab:'reporte',     label:'Generar Reporte',        icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>' },
    { tab:'historial-gov', label:'Mi Historial',         icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' },
    { tab:'bitacora',    label:'Bitácora de Reportes',   icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' },
    { tab:'monitoreo',   label:'Monitoreo de Imágenes',  icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' },
  ];

  exportMonitoreo() {
    this.exportSvc.exportImagenes(this.imagenes, 'monitoreo-imagenes-' + new Date().toISOString().slice(0,10));
  }

  exportHistorial() {
    this.exportSvc.exportImagenes(this.miHistorial, 'mi-historial-' + new Date().toISOString().slice(0,10));
  }

  constructor(
    private auth: AuthService,
    private router: Router,
    private exportSvc: ExportService,
    private platformApi: PlatformApiService,
  ) {}

  ngOnInit() {
    if (!this.auth.getUser()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadGovData();
  }

  // Métricas
  metricas = { precision:'94.5%', respuesta:'1.2s', disponibilidad:'99.8%', alertas:3, totalAnalisis:1247, precisionProm:'94.5%', uptime:'99.8%', ultimaAct:'23/11/2025, 8:05:20 a.m.' };

  // Bitácora
  bSearch = '';
  zonas: Array<{ nombre:string; ubicacion:string; riesgo:string; inc:number; ultimoInc:string; estado:string; coords:string }> = [];
  get filteredZonas() { const q=this.bSearch.toLowerCase(); return q?this.zonas.filter(z=>z.nombre.toLowerCase().includes(q)||z.ubicacion.toLowerCase().includes(q)||z.estado.toLowerCase().includes(q)):this.zonas; }
  get zonasAlto() { return this.zonas.filter(z=>z.riesgo==='Alto').length; }
  get zonasAtencion() { return this.zonas.filter(z=>z.estado.includes('Requiere')||z.riesgo==='Alto'||z.riesgo==='Medio').length; }

  // Historial propio del usuario gubernamental
  miHistorial: Array<{ id?: number; nombre:string; fecha:string; resultado:string; confianza:number; tamano:string; color:string }> = [];

  // Monitoreo
  mSearch = '';
  imagenes: Array<{ id?: number; analysisId?: number | null; nombre:string; zona:string; resultado:string; confianza:number; resolucion:string; tamano:string; usuario:string; fecha:string; color:string }> = [];
  get filteredImagenes() { const q=this.mSearch.toLowerCase(); return q?this.imagenes.filter(i=>i.nombre.toLowerCase().includes(q)||i.zona.toLowerCase().includes(q)):this.imagenes; }

  // Reporte
  rep = { titulo:'', zona:'Zona Norte – Sector A', fecha:'22/11/2025', descripcion:'' };
  incSel: boolean[] = [false,false,false,false];
  incList = [
    { zona:'Zona Norte – Sector A', fecha:'2025-11-21', riesgo:'Alta' },
    { zona:'Zona Sur – Sector C',   fecha:'2025-11-20', riesgo:'Media' },
    { zona:'Zona Este – Sector B',  fecha:'2025-11-20', riesgo:'Alta' },
    { zona:'Zona Oeste – Sector D', fecha:'2025-11-19', riesgo:'Baja' },
  ];
  repsGuardados: Array<{ titulo:string; zona:string; fecha:string; inc:number }> = [];
  generando=false; repGenerado=false;
  generarReporte() {
    const selectedImage = this.imagenes.find((image) => image.zona === this.rep.zona) ?? this.imagenes[0];
    if (!this.rep.titulo || !selectedImage?.analysisId) return;

    this.generando = true;
    this.platformApi.createReport({
      id_analisis: selectedImage.analysisId,
      tipo: this.rep.titulo,
      contenido_summary: this.rep.descripcion,
      parametros: {
        zona: this.rep.zona,
        estado: 'En Proceso',
        severidad: selectedImage.resultado,
      },
    }).subscribe({
      next: () => {
        this.generando = false;
        this.repGenerado = true;
        this.loadGovData();
        setTimeout(() => this.repGenerado = false, 3000);
      },
      error: () => {
        this.generando = false;
        this.error = 'No se pudo generar el reporte.';
      },
    });
  }

  // Procesar
  selectedFile: File|null=null; imagePreview:string|null=null;
  isDragging=false; analizando=false; resultadoVisible=false;
  resultado = { nivel:'Alto', confianza:87, zona:'Zona Norte', temp:'38°C', humedad:'18%', viento:'28 km/h', areas:['Vegetación seca detectada','Material combustible acumulado','Baja humedad crítica'] };
  onFileSelected(e:Event){const f=(e.target as HTMLInputElement).files?.[0];if(f)this.setFile(f);}
  onDrop(e:DragEvent){e.preventDefault();this.isDragging=false;const f=e.dataTransfer?.files[0];if(f?.type.startsWith('image/'))this.setFile(f);}
  onDragOver(e:DragEvent){e.preventDefault();this.isDragging=true;}
  onDragLeave(){this.isDragging=false;}
  setFile(f:File){this.selectedFile=f;this.resultadoVisible=false;const r=new FileReader();r.onload=ev=>this.imagePreview=ev.target?.result as string;r.readAsDataURL(f);}
  analizar(){if(!this.selectedFile)return;this.analizando=true;this.resultadoVisible=false;setTimeout(()=>{this.analizando=false;this.resultadoVisible=true;},2200);}
  resetImagen(){this.selectedFile=null;this.imagePreview=null;this.resultadoVisible=false;}

  // Clima
  climaRes = { tempProm:'27°C', humedadProm:'47%', diasRiesgo:2, vientoProm:'12 km/h' };
  pronostico = [
    { dia:'Lunes',     fecha:'21 Nov', ico:'☀️', max:28, min:14, desc:'Soleado',              hum:35, viento:15, lluvia:0  },
    { dia:'Martes',    fecha:'22 Nov', ico:'☀️', max:29, min:15, desc:'Soleado',              hum:32, viento:18, lluvia:0  },
    { dia:'Miércoles', fecha:'23 Nov', ico:'⛅', max:27, min:16, desc:'Parcialmente nublado', hum:45, viento:12, lluvia:10 },
    { dia:'Jueves',    fecha:'24 Nov', ico:'☁️', max:25, min:15, desc:'Nublado',              hum:55, viento:10, lluvia:30 },
  ];

  private loadGovData() {
    this.loading = true;
    this.error = '';

    forkJoin({
      images: this.platformApi.getImages({ limit: 100 }),
      reports: this.platformApi.getReports({ limit: 100 }),
      analysisStats: this.platformApi.getAnalysisStats(),
    }).subscribe({
      next: ({ images, reports, analysisStats }) => {
        this.loading = false;
        this.imagenes = images.data.map((image) => this.mapImage(image));
        this.miHistorial = this.imagenes.filter((image) => image.usuario === (this.auth.getUser()?.nombre ?? ''));
        this.zonas = this.buildZones(images.data);
        this.repsGuardados = reports.data.map((report) => ({
          titulo: report.tipo,
          zona: report.ubicacion ?? 'Sin zona',
          fecha: report.fecha,
          inc: report.severidad === 'alta' ? 1 : 0,
        }));
        this.applyStats(analysisStats.data);
      },
      error: () => {
        this.loading = false;
        this.error = 'No se pudo cargar la informacion gubernamental.';
      },
    });
  }

  private mapImage(image: PlatformImage) {
    const risk = this.capitalize(image.nivel_riesgo ?? 'bajo');
    return {
      id: image.id_imagen,
      analysisId: image.id_analisis,
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

  private buildZones(images: PlatformImage[]) {
    const grouped = new Map<string, PlatformImage[]>();

    for (const image of images) {
      const zone = image.zona ?? 'Sin zona';
      const current = grouped.get(zone) ?? [];
      current.push(image);
      grouped.set(zone, current);
    }

    return Array.from(grouped.entries()).map(([zone, zoneImages]) => {
      const riesgo = zoneImages.some((image) => image.nivel_riesgo === 'alto')
        ? 'Alto'
        : zoneImages.some((image) => image.nivel_riesgo === 'medio')
          ? 'Medio'
          : 'Bajo';

      return {
        nombre: zone,
        ubicacion: zone,
        riesgo,
        inc: zoneImages.length,
        ultimoInc: zoneImages[0]?.fecha ?? 'N/D',
        estado: riesgo === 'Alto' ? 'Requiere Protección Civil' : riesgo === 'Medio' ? 'Monitoreo Continuo' : 'Bajo Control',
        coords: 'N/D',
      };
    });
  }

  private applyStats(stats: AnalysisStats) {
    this.metricas = {
      precision: `${stats.precision_promedio ?? 0}%`,
      respuesta: 'N/D',
      disponibilidad: '99.8%',
      alertas: Number(stats.total_alto ?? 0),
      totalAnalisis: Number(stats.total_analisis ?? 0),
      precisionProm: `${stats.precision_promedio ?? 0}%`,
      uptime: '99.8%',
      ultimaAct: stats.ultima_actualizacion ? new Date(stats.ultima_actualizacion).toLocaleString('es-MX') : 'N/D',
    };
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
