import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar/navbar';
import { GovNavbarComponent } from '../../shared/gov-navbar/gov-navbar';

@Component({
  selector: 'app-process-image-result',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, GovNavbarComponent],
  templateUrl: './process-image-result.html',
  styleUrl: './process-image-result.scss'
})
export class ProcessImageResultComponent {
  userType: string = 'user';

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

  constructor(private router: Router, private route: ActivatedRoute) {
    this.route.queryParams.subscribe(p => {
      this.userType = p['type'] || 'user';
    });
  }

  analyzeAnother() {
    this.router.navigate(['/process-image'], { queryParams: { type: this.userType } });
  }

  goBack() {
    if (this.userType === 'gov') this.router.navigate(['/gov']);
    else this.router.navigate(['/dashboard']);
  }
}
