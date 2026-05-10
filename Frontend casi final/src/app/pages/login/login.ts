import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {
  email = '';
  password = '';
  showPw = false;
  loading = false;
  error = '';
  constructor(
    private auth: AuthService,
    private router: Router,
    public theme: ThemeService,
  ) {}
  togglePw() {
    this.showPw = !this.showPw;
  }
  onSubmit() {
    if (!this.email || !this.password) {
      this.error = 'Completa todos los campos.';
      return;
    }
    this.loading = true;
    this.error = '';

    this.auth.login(this.email, this.password).subscribe({
      next: (user) => {
        this.loading = false;
        if (user.rol === 'admin') this.router.navigate(['/admin']);
        else if (user.rol === 'gov') this.router.navigate(['/gov']);
        else this.router.navigate(['/home']);
      },
      error: () => {
        this.loading = false;
        this.error = 'Correo o contrasena incorrectos.';
      },
    });
  }
}
