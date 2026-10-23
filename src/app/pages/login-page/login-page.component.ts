import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss'
})
export class LoginPageComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  errorMessage = '';

  async handleGoogleLogin(): Promise<void> {
    this.errorMessage = '';
    try {
      await this.auth.loginWithGoogle();
      await this.router.navigate(['/home']);
    } catch (err: unknown) {
      const authError = err as { code?: string; message?: string };
      if (authError.code !== 'auth/popup-closed-by-user') {
        this.errorMessage = authError.message || 'Failed to sign in. Please try again.';
      }
    }
  }
}
