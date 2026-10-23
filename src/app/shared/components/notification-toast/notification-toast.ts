import { Component, inject } from '@angular/core';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notification-toast',
  imports: [],
  templateUrl: './notification-toast.html',
  styleUrl: './notification-toast.scss'
})
export class NotificationToast {
  readonly notificationService = inject(NotificationService);
  readonly notifications = this.notificationService.notifications;
}
