import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar/navbar';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent],
  templateUrl: './history.html',
  styleUrl: './history.scss'
})
export class HistoryComponent implements OnInit {
  analyses: any[] = [];
  constructor(private auth: AuthService, private router: Router) {}
  ngOnInit() { if (!this.auth.getUser()) this.router.navigate(['/login']); }
}
