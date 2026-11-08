import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  imports: [],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Login {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly errorMessage = signal<string>('');

  async handleGoogleLogin(): Promise<void> {
    this.errorMessage.set('');
    try {
      await this.auth.loginWithGoogle();
      await this.router.navigate(['/home']);
    } catch (err: unknown) {
      const authError = err as { code?: string; message?: string };
      if (authError.code !== 'auth/popup-closed-by-user') {
        this.errorMessage.set(authError.message || 'Failed to sign in. Please try again.');
      }
    }
  }
}

