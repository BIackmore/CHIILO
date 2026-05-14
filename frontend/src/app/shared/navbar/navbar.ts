import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { AuthService, UserProfile } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class NavbarComponent implements OnInit, OnDestroy {
  user: UserProfile | null = null;
  showProfile = false;
  private userSubscription?: Subscription;
  constructor(
    private auth: AuthService,
    private router: Router,
    public theme: ThemeService,
  ) {}
  ngOnInit() {
    this.userSubscription = this.auth.currentUser$.subscribe((user) => (this.user = user));
  }
  ngOnDestroy() {
    this.userSubscription?.unsubscribe();
  }
  get userInitials() {
    return this.user
      ? this.user.nombre
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase()
      : '?';
  }
  toggleProfile() {
    this.showProfile = !this.showProfile;
  }
  closeProfile(e: Event) {
    if (!(e.target as Element).closest('.nav-profile')) this.showProfile = false;
  }
  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
