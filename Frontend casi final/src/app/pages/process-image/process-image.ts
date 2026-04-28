import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../shared/navbar/navbar';
import { OfflineQueueService, QueuedImage } from '../../services/offline-queue.service';
import { HasDonePipe } from '../../shared/pipes/has-done.pipe';
import { AuthService } from '../../services/auth.service';

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
    private auth: AuthService
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
    const r = new FileReader();
    r.onload = e => this.preview = e.target?.result as string;
    r.readAsDataURL(file);
  }

  async analyze() {
    if (!this.selectedFile) return;
    this.loading = true;
    this.resultadoVisible = false;

    if (!this.offlineQ.isOnline) {
      await this.offlineQ.enqueueImage(this.selectedFile, this.auth.getUser()?.correo);
      await this.refreshQueue();
      this.loading = false;
      this.reset();
      return;
    }

    setTimeout(() => {
      this.loading = false;
      this.resultadoVisible = true;
    }, 2200);
  }

  reset() { this.selectedFile = null; this.preview = null; this.resultadoVisible = false; }

  async clearDone() { await this.offlineQ.clearDone(); await this.refreshQueue(); }
  async retryItem(id: string) {
    const item = this.queuedItems.find(i => i.id === id);
    if (item) { item.status = 'pending'; await this.offlineQ.dbPut(item); }
    await this.offlineQ.processQueue(); await this.refreshQueue();
  }
  async deleteItem(id: string) { await this.offlineQ.deleteItem(id); await this.refreshQueue(); }

  get pendingCount() { return this.queuedItems.filter(i => i.status === 'pending').length; }
  formatSize(bytes: number) { return bytes < 1048576 ? (bytes/1024).toFixed(1)+' KB' : (bytes/1048576).toFixed(1)+' MB'; }
}
