import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';

@Component({
  selector: 'app-gov-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './gov-navbar.html',
  styleUrl: './gov-navbar.scss'
})
export class GovNavbarComponent {
  constructor(private router: Router) {}
  logout() { this.router.navigate(['/login']); }
}
