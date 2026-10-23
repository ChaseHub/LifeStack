import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss'
})
export class HomePageComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  async handleLogout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigate(['/login']);
  }
}
