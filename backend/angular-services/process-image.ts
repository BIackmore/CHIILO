// ═══════════════════════════════════════════════════════════════
//  src/app/pages/process-image/process-image.ts  ← ACTUALIZACIÓN
//  Llama al backend real en lugar de simular con setTimeout
// ═══════════════════════════════════════════════════════════════
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../shared/navbar/navbar';
import { OfflineQueueService, QueuedImage } from '../../services/offline-queue.service';
import { HasDonePipe } from '../../shared/pipes/has-done.pipe';
import { AuthService } from '../../services/auth.service';
import { ImagenesService, ResultadoAnalisis } from '../../services/imagenes.service';

@Component({
  selector: 'app-process-image',
  standalone: true,
  imports: [CommonModule, NavbarComponent, HasDonePipe],
  templateUrl: './process-image.html',
  styleUrl:    './process-image.scss',
})
export class ProcessImageComponent implements OnInit, OnDestroy {
  selectedFile:    File | null = null;
  preview:         string | null = null;
  isDragging       = false;
  loading          = false;
  resultadoVisible = false;
  error:           string | null = null;
  queuedItems:     QueuedImage[] = [];

  private onlineHandler = () => this.refreshQueue();

  resultado: (ResultadoAnalisis & { id_analisis?: number }) | null = null;

  // Datos de fallback para mostrar mientras no hay resultado
  private defaultResultado = {
    nivel:    'alto' as const,
    confianza: 87,
    zona:     'Zona Norte',
    temp:     '38°C',
    humedad:  '18%',
    viento:   '28 km/h',
    areas:    ['Vegetación seca detectada en sector noreste', 'Acumulación de material combustible', 'Humedad crítica por debajo del umbral'],
    porcentaje_afectacion: 35,
  };

  constructor(
    public offlineQ:    OfflineQueueService,
    private auth:       AuthService,
    private imagenesSvc: ImagenesService,
  ) {}

  ngOnInit()    { this.refreshQueue(); window.addEventListener('online', this.onlineHandler); }
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
  onDragOver(e: DragEvent)  { e.preventDefault(); this.isDragging = true; }
  onDragLeave()              { this.isDragging = false; }

  setFile(file: File) {
    this.selectedFile    = file;
    this.resultadoVisible = false;
    this.error           = null;
    const r = new FileReader();
    r.onload = e => this.preview = e.target?.result as string;
    r.readAsDataURL(file);
  }

  async analyze() {
    if (!this.selectedFile) return;
    this.loading          = true;
    this.resultadoVisible = false;
    this.error            = null;

    // Sin conexión → encolar
    if (!this.offlineQ.isOnline) {
      await this.offlineQ.enqueueImage(this.selectedFile, this.auth.getUser()?.correo);
      await this.refreshQueue();
      this.loading = false;
      this.reset();
      return;
    }

    try {
      const res      = await this.imagenesSvc.uploadAndAnalyze(this.selectedFile);
      this.resultado = res.analisis;
      this.resultadoVisible = true;
    } catch (err: any) {
      this.error = err.message || 'Error al analizar la imagen. Intenta de nuevo.';
    } finally {
      this.loading = false;
    }
  }

  get resultadoDisplay() { return this.resultado ?? this.defaultResultado; }

  get fireMarkers() {
    const n = this.resultadoDisplay.nivel;
    if (n === 'alto')  return [{ top:'28%', left:'30%', level:'low' }, { top:'52%', left:'62%', level:'high' }, { top:'70%', left:'50%', level:'critic' }];
    if (n === 'medio') return [{ top:'40%', left:'45%', level:'low' }, { top:'60%', left:'55%', level:'high' }];
    return [];
  }

  get riskFactors() {
    return [
      { label:'Temperatura',         value: 78, color:'#D94A18' },
      { label:'Humedad',             value: 25, color:'#0369A1' },
      { label:'Velocidad del viento', value: 65, color:'#5A6E84' },
    ];
  }

  reset() { this.selectedFile = null; this.preview = null; this.resultadoVisible = false; this.resultado = null; }

  async clearDone()        { await this.offlineQ.clearDone();         await this.refreshQueue(); }
  async retryItem(id: string) {
    const item = this.queuedItems.find(i => i.id === id);
    if (item) { item.status = 'pending'; await this.offlineQ.dbPut(item); }
    await this.offlineQ.processQueue(); await this.refreshQueue();
  }
  async deleteItem(id: string) { await this.offlineQ.deleteItem(id); await this.refreshQueue(); }

  get pendingCount() { return this.queuedItems.filter(i => i.status === 'pending').length; }
  formatSize(b: number) { return b < 1048576 ? (b/1024).toFixed(1)+' KB' : (b/1048576).toFixed(1)+' MB'; }
}
