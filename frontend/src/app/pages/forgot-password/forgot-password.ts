import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss'
})
export class ForgotPasswordComponent {
  email = '';
  loading = false;
  sent = false;
  error = '';

  constructor(public theme: ThemeService) {}

  onSubmit() {
    this.error = '';
    if (!this.email) { this.error = 'Ingresa tu correo electrónico.'; return; }
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(this.email)) { this.error = 'El formato del correo no es válido.'; return; }
    this.loading = true;
    // Simulación — en producción conectar con el backend
    setTimeout(() => { this.loading = false; this.sent = true; }, 1200);
  }
}
