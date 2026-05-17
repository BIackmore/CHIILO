import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar/navbar';
import { OfflineQueueService, QueuedImage } from '../../services/offline-queue.service';
import { HasDonePipe } from '../../shared/pipes/has-done.pipe';
import { AuthService } from '../../services/auth.service';
import { PlatformApiService, UploadImageResponse } from '../../api/platform-api.service';

@Component({
  selector: 'app-process-image',
  standalone: true,
  imports: [CommonModule, NavbarComponent, HasDonePipe],
  templateUrl: './process-image.html',
  styleUrl: './process-image.scss'
})
export class ProcessImageComponent implements OnInit, OnDestroy {
  selectedFile: File | null = null;
  preview: string | null = null;
  isDragging = false;
  loading = false;
  resultadoVisible = false;
  queuedItems: QueuedImage[] = [];
  error = '';
  private onlineHandler = () => this.refreshQueue();

  resultado = {
    nivel: 'Alto',
    color: 'danger',
    confianza: 87,
    zona: 'Zona Norte',
    temp: '38°C',
    humedad: '18%',
    viento: '28 km/h',
    areas: ['Vegetación seca detectada en sector noreste', 'Acumulación de material combustible', 'Humedad crítica por debajo del umbral']
  };

  fireMarkers = [
    { top: '28%', left: '30%', level: 'low' },
    { top: '52%', left: '62%', level: 'high' },
    { top: '70%', left: '50%', level: 'critic' },
  ];

  riskFactors = [
    { label: 'Temperatura',       value: 78, color: '#D94A18' },
    { label: 'Humedad',           value: 25, color: '#0369A1' },
    { label: 'Velocidad del viento', value: 65, color: '#5A6E84' },
  ];

  weather = { temp: '38°C', humidity: '18%', wind: '28 km/h', pressure: '1008 hPa' };

  constructor(
    public offlineQ: OfflineQueueService,
    private auth: AuthService,
    private platformApi: PlatformApiService,
    private router: Router,
  ) {}

  ngOnInit() { this.refreshQueue(); window.addEventListener('online', this.onlineHandler); }
  ngOnDestroy() { window.removeEventListener('online', this.onlineHandler); }

  async refreshQueue() { this.queuedItems = await this.offlineQ.getAllItems(); }

  onFileSelected(event: Event) {
    const f = (event.target as HTMLInputElement).files?.[0];
    if (f) this.setFile(f);
  }
  onDrop(e: DragEvent) {
    e.preventDefault(); this.isDragging = false;
    const f = e.dataTransfer?.files[0];
    if (f?.type.startsWith('image/')) this.setFile(f);
  }
  onDragOver(e: DragEvent) { e.preventDefault(); this.isDragging = true; }
  onDragLeave() { this.isDragging = false; }

  setFile(file: File) {
    this.selectedFile = file;
    this.resultadoVisible = false;
    this.error = '';
    const r = new FileReader();
    r.onload = e => this.preview = e.target?.result as string;
    r.readAsDataURL(file);
  }

  async analyze() {
    if (!this.selectedFile) return;
    this.loading = true;
    this.resultadoVisible = false;
    this.error = '';

    if (!this.offlineQ.isOnline) {
      await this.offlineQ.enqueueImage(this.selectedFile, this.auth.getUser()?.correo);
      await this.refreshQueue();
      this.loading = false;
      this.reset();
      return;
    }

    this.platformApi.uploadImage(this.selectedFile).subscribe({
      next: (response) => {
        this.loading = false;
        this.resultadoVisible = true;
        this.applyResult(response);
        void this.router.navigate(['/process-image-result'], {
          queryParams: {
            type: this.auth.getUser()?.rol ?? 'user',
            imageId: response.imagen.id_imagen,
            analysisId: response.analisis.id_analisis,
          },
        });
      },
      error: () => {
        this.loading = false;
        this.error = 'No se pudo procesar la imagen. Intenta de nuevo.';
      },
    });
  }

  reset() { this.selectedFile = null; this.preview = null; this.resultadoVisible = false; this.error = ''; }

  async clearDone() { await this.offlineQ.clearDone(); await this.refreshQueue(); }
  async retryItem(id: string) {
    const item = this.queuedItems.find(i => i.id === id);
    if (item) { item.status = 'pending'; await this.offlineQ.dbPut(item); }
    await this.offlineQ.processQueue(); await this.refreshQueue();
  }
  async deleteItem(id: string) { await this.offlineQ.deleteItem(id); await this.refreshQueue(); }

  get pendingCount() { return this.queuedItems.filter(i => i.status === 'pending').length; }
  formatSize(bytes: number) { return bytes < 1048576 ? (bytes/1024).toFixed(1)+' KB' : (bytes/1048576).toFixed(1)+' MB'; }

  private applyResult(response: UploadImageResponse) {
    const riesgo = response.analisis.nivel.toLowerCase();

    this.resultado = {
      nivel: this.capitalize(response.analisis.nivel),
      color: riesgo === 'alto' ? 'danger' : riesgo === 'medio' ? 'warn' : 'ok',
      confianza: response.analisis.confianza,
      zona: response.analisis.zona,
      temp: response.analisis.temp,
      humedad: response.analisis.humedad,
      viento: response.analisis.viento,
      areas: response.analisis.areas,
    };

    this.weather = {
      temp: response.analisis.temp,
      humidity: response.analisis.humedad,
      wind: response.analisis.viento,
      pressure: 'N/D',
    };

    this.riskFactors = [
      { label: 'Temperatura', value: this.extractPercent(response.analisis.temp, 75), color: '#D94A18' },
      { label: 'Humedad', value: 100 - this.extractPercent(response.analisis.humedad, 40), color: '#0369A1' },
      { label: 'Velocidad del viento', value: this.extractPercent(response.analisis.viento, 60), color: '#5A6E84' },
    ];

    this.fireMarkers = [
      { top: '32%', left: '48%', level: riesgo === 'alto' ? 'high' : riesgo === 'medio' ? 'critic' : 'low' },
    ];
  }

  private extractPercent(value: string, fallback: number): number {
    const match = value.match(/\d+/);
    if (!match) {
      return fallback;
    }

    return Math.min(100, Math.max(0, Number.parseInt(match[0], 10)));
  }

  private capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }
}
