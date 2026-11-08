import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationService } from '../../../core/services/notification.service';
import { NotificationToast } from './notification-toast';

describe('NotificationToast', () => {
  let fixture: ComponentFixture<NotificationToast>;
  let notificationService: NotificationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationToast]
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationToast);
    notificationService = TestBed.inject(NotificationService);
    await fixture.whenStable();
  });

  afterEach(() => {
    notificationService.clearAll();
  });

  it('renders active toasts and dismisses when close button is clicked', async () => {
    notificationService.success('Operation succeeded', 'Status', 0);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.toast-title')?.textContent).toBe('Status');
    expect(host.querySelector('.toast-message')?.textContent).toBe('Operation succeeded');

    const closeBtn = host.querySelector<HTMLButtonElement>('.toast-close');
    expect(closeBtn).toBeTruthy();
    closeBtn?.click();
    await fixture.whenStable();

    expect(host.querySelector('.toast-item')).toBeNull();
  });
});
