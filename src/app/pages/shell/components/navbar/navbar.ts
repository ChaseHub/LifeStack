import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Navbar {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly currentUser = this.auth.currentUser;

  readonly displayName = computed(() => {
    const user = this.currentUser();
    if (!user) {
      return 'User';
    }
    return user.displayName || user.email?.split('@')[0] || 'User';
  });

  readonly userInitial = computed(() => {
    const user = this.currentUser();
    const source = user?.displayName || user?.email || 'U';
    return source.charAt(0).toUpperCase();
  });

  async handleLogout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigate(['/login']);
  }
}
