import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar/navbar';
import { GovNavbarComponent } from '../../shared/gov-navbar/gov-navbar';
import { PlatformApiService, PlatformImageDetail } from '../../api/platform-api.service';

@Component({
  selector: 'app-process-image-result',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, GovNavbarComponent],
  templateUrl: './process-image-result.html',
  styleUrl: './process-image-result.scss'
})
export class ProcessImageResultComponent {
  userType: string = 'user';
  imageId: number | null = null;
  loading = true;
  error = '';

  result = {
    nivel: 'Alto',
    confianza: 87,
    zona: 'Zona Norte – Sector A',
    fecha: '21/11/2025, 10:30 a.m.',
    resolucion: '1920x1080',
    tamano: '2.4 MB',
    factores: [
      { label: 'Vegetación Seca', valor: 82, color: '#ef4444' },
      { label: 'Temperatura Alta', valor: 78, color: '#f97316' },
      { label: 'Baja Humedad', valor: 75, color: '#f59e0b' },
      { label: 'Viento Fuerte', valor: 65, color: '#eab308' },
    ],
    recomendaciones: [
      'Activar protocolo de alerta temprana en Zona Norte',
      'Coordinar con brigadas forestales para patrullaje preventivo',
      'Revisar acceso a fuentes de agua en la zona',
      'Notificar a autoridades municipales de Tepoztlán',
    ]
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private platformApi: PlatformApiService,
  ) {
    this.route.queryParams.subscribe(p => {
      this.userType = p['type'] || 'user';
      this.imageId = p['imageId'] ? Number.parseInt(p['imageId'], 10) : null;
      if (this.imageId) {
        this.loadImage(this.imageId);
      } else {
        this.loading = false;
      }
    });
  }

  analyzeAnother() {
    this.router.navigate(['/process-image'], { queryParams: { type: this.userType } });
  }

  goBack() {
    if (this.userType === 'gov') this.router.navigate(['/gov']);
    else this.router.navigate(['/dashboard']);
  }

  private loadImage(imageId: number) {
    this.loading = true;
    this.error = '';

    this.platformApi.getImage(imageId).subscribe({
      next: (response) => {
        this.loading = false;
        this.applyImage(response.data);
      },
      error: () => {
        this.loading = false;
        this.error = 'No se pudo cargar el resultado del analisis.';
      },
    });
  }

  private applyImage(image: PlatformImageDetail) {
    const confidence = image.umbral_confianza ? Math.round(image.umbral_confianza * 100) : 0;
    const areas = image.resultado_json?.areas ?? [];
    const nivel = this.capitalize(image.nivel_riesgo ?? image.resultado_json?.nivel ?? 'bajo');

    this.result = {
      nivel,
      confianza: confidence,
      zona: image.resultado_json?.zona ?? 'Sin zona detectada',
      fecha: this.formatDate(image.fecha_analisis ?? image.fecha_carga),
      resolucion: this.getResolution(image),
      tamano: this.formatSize(image.tamano_bytes),
      factores: [
        { label: 'Temperatura', valor: this.extractPercent(image.resultado_json?.temp, 70), color: '#ef4444' },
        { label: 'Humedad', valor: 100 - this.extractPercent(image.resultado_json?.humedad, 40), color: '#f97316' },
        { label: 'Viento', valor: this.extractPercent(image.resultado_json?.viento, 55), color: '#f59e0b' },
        { label: 'Afectacion', valor: Math.round(image.porcentaje_afectacion ?? 0), color: '#eab308' },
      ],
      recomendaciones: this.buildRecommendations(nivel, areas),
    };
  }

  private buildRecommendations(level: string, areas: string[]): string[] {
    if (areas.length) {
      return areas;
    }

    if (level === 'Alto') {
      return [
        'Activar protocolo de alerta temprana en la zona analizada.',
        'Coordinar revision preventiva con brigadas locales.',
      ];
    }

    if (level === 'Medio') {
      return [
        'Mantener monitoreo continuo en las siguientes horas.',
        'Revisar condiciones climaticas y vegetacion seca cercana.',
      ];
    }

    return ['Mantener vigilancia preventiva de rutina.'];
  }

  private formatDate(value?: string | null): string {
    if (!value) {
      return 'Sin fecha';
    }

    return new Date(value).toLocaleString('es-MX');
  }

  private getResolution(image: PlatformImageDetail): string {
    if (image.resolucion_width && image.resolucion_height) {
      return `${image.resolucion_width}x${image.resolucion_height}`;
    }

    return 'N/D';
  }

  private formatSize(bytes?: number | null): string {
    if (!bytes) {
      return 'N/D';
    }

    return bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
  }

  private extractPercent(value: string | undefined, fallback: number): number {
    const match = value?.match(/\d+/);
    if (!match) {
      return fallback;
    }

    return Math.min(100, Math.max(0, Number.parseInt(match[0], 10)));
  }

  private capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }
}
