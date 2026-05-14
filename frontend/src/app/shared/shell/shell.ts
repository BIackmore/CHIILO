import { Component, Input, Output, EventEmitter, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { AuthService, UserProfile } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

export interface NavItem {
  label: string;
  tab: string;
  icon: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class ShellComponent implements OnInit, OnDestroy {
  @Input() activeTab = '';
  @Input() navItems: NavItem[] = [];
  @Input() title = '';
  @Input() subtitle = '';
  @Input() accentClass = 'accent-ember';
  @Output() tabChange = new EventEmitter<string>();

  user: UserProfile | null = null;
  showProfile = false;
  private userSubscription?: Subscription;

  constructor(
    public theme: ThemeService,
    private auth: AuthService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.userSubscription = this.auth.currentUser$.subscribe((user) => (this.user = user));
  }
  ngOnDestroy() {
    this.userSubscription?.unsubscribe();
  }

  setTab(t: string) {
    this.tabChange.emit(t);
  }
  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
  toggleProfile() {
    this.showProfile = !this.showProfile;
  }
  closeProfile(e: MouseEvent) {
    if (!(e.target as Element).closest('.profile-area')) this.showProfile = false;
  }

  get userInitials(): string {
    if (!this.user) return '?';
    return this.user.nombre
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
}
