import { Injectable, RendererFactory2, Renderer2 } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private renderer: Renderer2;
  isDark = false; // DEFAULT: light (mejor para proyección)

  constructor(rf: RendererFactory2) {
    this.renderer = rf.createRenderer(null, null);
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('fire-theme') : null;
    this.isDark = saved === 'dark'; // solo oscuro si el usuario lo guardó explícitamente
    this.applyTheme();
  }

  toggle() {
    this.isDark = !this.isDark;
    localStorage.setItem('fire-theme', this.isDark ? 'dark' : 'light');
    this.applyTheme();
  }

  private applyTheme() {
    const html = document.documentElement;
    if (this.isDark) {
      html.setAttribute('data-theme', 'dark');
    } else {
      html.removeAttribute('data-theme');
    }
  }
}
