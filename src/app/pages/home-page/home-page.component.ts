import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationService } from '../../shared/services/notification.service';
import { FunctionsService } from '../../shared/services/functions.service';

@Component({
  selector: 'app-home-page',
  imports: [],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss'
})
export class HomePageComponent {
  readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  private readonly functionsService = inject(FunctionsService);

  readonly currentUser = this.auth.currentUser;

  triggerSuccessNotification(): void {
    this.notifications.success('System is operating nominally.', 'System Health');
  }

  async testCallableFunction(): Promise<void> {
    try {
      await this.functionsService.call('getMyProfile', {}, {
        successMessage: 'Profile data retrieved from Cloud Function!',
        notificationTitle: 'Cloud Functions'
      });
    } catch {
      // FunctionsService already routes error toasts automatically
    }
  }
}
