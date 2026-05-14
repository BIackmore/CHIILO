import { Pipe, PipeTransform } from '@angular/core';
import { QueuedImage } from '../../services/offline-queue.service';

@Pipe({ name: 'hasDone', standalone: true })
export class HasDonePipe implements PipeTransform {
  transform(items: QueuedImage[]): boolean {
    return items?.some(i => i.status === 'done') ?? false;
  }
}
