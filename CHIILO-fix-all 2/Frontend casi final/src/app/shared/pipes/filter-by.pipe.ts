import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'filterBy', standalone: true })
export class FilterByPipe implements PipeTransform {
  transform(items: any[], field: string, value: string): number {
    if (!items) return 0;
    return items.filter(i => i[field] === value).length;
  }
}
