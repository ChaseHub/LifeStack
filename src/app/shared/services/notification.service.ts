import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  duration: number; // in milliseconds
  createdAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  readonly notifications = signal<AppNotification[]>([]);

  show(notification: {
    type?: NotificationType;
    title?: string;
    message: string;
    duration?: number;
  }): string {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const duration = notification.duration ?? (notification.type === 'error' ? 6000 : 4000);

    const newNotification: AppNotification = {
      id,
      type: notification.type ?? 'info',
      title: notification.title,
      message: notification.message,
      duration,
      createdAt: Date.now()
    };

    this.notifications.update((current) => [...current, newNotification]);

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }

    return id;
  }

  success(message: string, title?: string, duration?: number): string {
    return this.show({ type: 'success', message, title, duration });
  }

  error(message: string, title?: string, duration?: number): string {
    return this.show({ type: 'error', message, title, duration });
  }

  warning(message: string, title?: string, duration?: number): string {
    return this.show({ type: 'warning', message, title, duration });
  }

  info(message: string, title?: string, duration?: number): string {
    return this.show({ type: 'info', message, title, duration });
  }

  dismiss(id: string): void {
    this.notifications.update((current) => current.filter((item) => item.id !== id));
  }

  clearAll(): void {
    this.notifications.set([]);
  }
}
