import { Injectable, DestroyRef, inject, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface AppNotification {
  readonly id: string;
  readonly type: NotificationType;
  readonly title?: string;
  readonly message: string;
  readonly duration: number;
  readonly createdAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly _notifications = signal<AppNotification[]>([]);
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  readonly notifications = this._notifications.asReadonly();

  constructor() {
    this.destroyRef.onDestroy(() => this.clearAll());
  }

  show(notification: {
    type?: NotificationType;
    title?: string;
    message: string;
    duration?: number;
  }): string {
    const id = this.generateId();
    const type = notification.type ?? 'info';
    const duration = notification.duration ?? (type === 'error' ? 6000 : 4000);

    const newNotification: AppNotification = {
      id,
      type,
      title: notification.title,
      message: notification.message,
      duration,
      createdAt: Date.now()
    };

    this._notifications.update((current) => [...current, newNotification]);

    if (duration > 0) {
      const handle = setTimeout(() => {
        this.timers.delete(id);
        this.dismiss(id);
      }, duration);
      this.timers.set(id, handle);
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
    const timer = this.timers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this._notifications.update((current) => current.filter((item) => item.id !== id));
  }

  clearAll(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this._notifications.set([]);
  }

  private generateId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `notif_${crypto.randomUUID()}`;
    }
    return `notif_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}

