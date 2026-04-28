import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../shared/navbar/navbar';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent {
  activeTab = 'dashboard';
  setTab(t: string) { this.activeTab = t; }

  stats = [
    { value: '4',    label: 'Incendios Activos', icon: 'fire',  color: 'var(--ember)',  bg: 'rgba(255,87,34,0.12)' },
    { value: '12',   label: 'Alertas Críticas',  icon: 'alert', color: 'var(--warn)',   bg: 'rgba(255,152,0,0.12)' },
    { value: '8',    label: 'Zonas Controladas', icon: 'check', color: 'var(--ok)',     bg: 'rgba(38,201,122,0.12)' },
    { value: '267 ha', label: 'Área Afectada',   icon: 'trend', color: 'var(--purple)', bg: 'rgba(167,139,250,0.12)' },
  ];

  riskFactors = [
    { label: 'Temperatura',       value: 78, icon: 'temp',  color: 'var(--ember)' },
    { label: 'Humedad',           value: 25, icon: 'humid', color: 'var(--info)'  },
    { label: 'Velocidad del viento', value: 65, icon: 'wind', color: 'var(--fog)' },
  ];

  weather = { temp: '30°C', humidity: '40%', wind: '23 km/h', pressure: '1013 hPa' };
}
