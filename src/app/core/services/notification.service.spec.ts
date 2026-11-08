import { TestBed } from '@angular/core/testing';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    service.clearAll();
    vi.useRealTimers();
  });

  it('adds notifications and auto-dismisses after the configured duration', () => {
    service.success('Saved changes', 'Success', 2500);
    expect(service.notifications()).toHaveLength(1);
    expect(service.notifications()[0].message).toBe('Saved changes');

    vi.advanceTimersByTime(2499);
    expect(service.notifications()).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(service.notifications()).toHaveLength(0);
  });

  it('cancels pending timeout handles on manual dismiss and clearAll', () => {
    const id1 = service.error('Something failed');
    service.warning('Heads up');

    expect(service.notifications()).toHaveLength(2);

    service.dismiss(id1);
    expect(service.notifications()).toHaveLength(1);
    expect(service.notifications()[0].type).toBe('warning');

    service.clearAll();
    expect(service.notifications()).toHaveLength(0);
  });
});

