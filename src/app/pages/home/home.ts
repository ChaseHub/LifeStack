import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { UserProfile } from '../../core/auth/user.model';
import { NotificationService } from '../../core/services/notification.service';
import { FunctionsService } from '../../core/services/functions.service';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Home {
  readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  private readonly functionsService = inject(FunctionsService);

  readonly currentUser = this.auth.currentUser;
  readonly isTestingFunction = signal<boolean>(false);

  triggerSuccessNotification(): void {
    this.notifications.success('System is operating nominally.', 'System Health');
  }

  async testCallableFunction(): Promise<void> {
    if (this.isTestingFunction()) {
      return;
    }

    this.isTestingFunction.set(true);
    try {
      await this.functionsService.call<void, UserProfile>('getMyProfile', undefined, {
        successMessage: 'Profile data retrieved from 2nd Gen Cloud Function!',
        notificationTitle: 'Cloud Functions'
      });
    } catch {
      // FunctionsService routes error notifications automatically
    } finally {
      this.isTestingFunction.set(false);
    }
  }
}

