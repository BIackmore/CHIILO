import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
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

  navItems: NavItem[] = [
    { tab:'procesar',    label:'Procesar Imagen',        icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' },
    { tab:'reporte',     label:'Generar Reporte',        icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>' },
    { tab:'historial-gov', label:'Mi Historial',         icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' },
    { tab:'bitacora',    label:'Bitácora de Reportes',   icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' },
    { tab:'monitoreo',   label:'Monitoreo de Imágenes',  icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' },
  ];

  constructor(private auth: AuthService, private router: Router, private exportSvc: ExportService) {}

  exportMonitoreo() {
    this.exportSvc.exportImagenes(this.imagenes, 'monitoreo-imagenes-' + new Date().toISOString().slice(0,10));
  }

  exportHistorial() {
    this.exportSvc.exportImagenes(this.miHistorial, 'mi-historial-' + new Date().toISOString().slice(0,10));
  }

  ngOnInit() { if (!this.auth.getUser()) this.router.navigate(['/login']); }

  // Métricas
  metricas = { precision:'94.5%', respuesta:'1.2s', disponibilidad:'99.8%', alertas:3, totalAnalisis:1247, precisionProm:'94.5%', uptime:'99.8%', ultimaAct:'23/11/2025, 8:05:20 a.m.' };

  // Bitácora
  bSearch = '';
  zonas = [
    { nombre:'Zona Norte – Sector A', ubicacion:'Cerro del Tepozteco',      riesgo:'Alto',  inc:5, ultimoInc:'21/11/2025, 10:30 a.m.', estado:'Requiere Protección Civil', coords:'18.9876°N, 99.0987°W' },
    { nombre:'Zona Sur – Sector C',   ubicacion:'Valle de Atongo',          riesgo:'Medio', inc:2, ultimoInc:'20/11/2025, 03:45 p.m.', estado:'Monitoreo Continuo',       coords:'18.9654°N, 99.1023°W' },
    { nombre:'Zona Este – Sector B',  ubicacion:'Amatlan de Quetzalcóatl',  riesgo:'Alto',  inc:4, ultimoInc:'20/11/2025, 08:15 a.m.', estado:'Requiere Protección Civil', coords:'18.9712°N, 99.0856°W' },
    { nombre:'Zona Oeste – Sector D', ubicacion:'Santo Domingo Ocotitlán',  riesgo:'Bajo',  inc:1, ultimoInc:'19/11/2025, 08:00 p.m.', estado:'Bajo Control',             coords:'18.9823°N, 99.1145°W' },
    { nombre:'Zona Central',          ubicacion:'Centro de Tepoztlán',      riesgo:'Medio', inc:2, ultimoInc:'19/11/2025, 12:00 p.m.', estado:'Monitoreo Continuo',       coords:'18.9847°N, 99.0934°W' },
  ];
  get filteredZonas() { const q=this.bSearch.toLowerCase(); return q?this.zonas.filter(z=>z.nombre.toLowerCase().includes(q)||z.ubicacion.toLowerCase().includes(q)||z.estado.toLowerCase().includes(q)):this.zonas; }
  get zonasAlto() { return this.zonas.filter(z=>z.riesgo==='Alto').length; }
  get zonasAtencion() { return this.zonas.filter(z=>z.estado.includes('Requiere')||z.riesgo==='Alto'||z.riesgo==='Medio').length; }

  // Historial propio del usuario gubernamental
  miHistorial = [
    { nombre:'zona_norte_scan.jpg',  fecha:'21/11/2025', resultado:'Incendio Detectado', confianza:95, tamano:'2.4 MB', color:'b-danger' },
    { nombre:'sector_b_thermal.png', fecha:'20/11/2025', resultado:'Sin Incendio',       confianza:98, tamano:'3.1 MB', color:'b-ok'     },
    { nombre:'bosque_este_01.jpg',   fecha:'19/11/2025', resultado:'Posible Incendio',   confianza:72, tamano:'1.8 MB', color:'b-warn'   },
  ];

  // Monitoreo
  mSearch = '';
  imagenes = [
    { nombre:'bosque_norte_01.jpg', zona:'Zona Norte', resultado:'Incendio Detectado', confianza:95, resolucion:'1920x1080', tamano:'2.4 MB', usuario:'Juan Pérez',     fecha:'21/11/2025', color:'b-danger' },
    { nombre:'zona_sur_scan.png',   zona:'Zona Sur',   resultado:'Sin Incendio',       confianza:98, resolucion:'2560x1440', tamano:'3.1 MB', usuario:'María González', fecha:'20/11/2025', color:'b-ok' },
    { nombre:'area_este_thermal.jpg',zona:'Zona Este', resultado:'Posible Incendio',   confianza:72, resolucion:'1280x720',  tamano:'1.8 MB', usuario:'Carlos Ramírez', fecha:'20/11/2025', color:'b-warn' },
  ];
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
  repsGuardados = [
    { titulo:'Reporte Mensual – Noviembre 2025',   zona:'Todas las Zonas', fecha:'19/11/2025', inc:8 },
    { titulo:'Análisis Zona Norte – Alta Prioridad', zona:'Zona Norte',    fecha:'18/11/2025', inc:5 },
    { titulo:'Evaluación de Riesgos Semanales',    zona:'Múltiples Zonas', fecha:'17/11/2025', inc:12 },
  ];
  generando=false; repGenerado=false;
  generarReporte() {
    if (!this.rep.titulo) return;
    this.generando=true;
    setTimeout(()=>{ this.generando=false; this.repGenerado=true; setTimeout(()=>this.repGenerado=false,3000); },1500);
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
}
