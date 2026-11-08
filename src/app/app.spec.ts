import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { NotificationService } from './core/services/notification.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])]
    }).compileComponents();
  });

  it('creates the root app and renders global toast notifications', async () => {
    const fixture = TestBed.createComponent(App);
    const notificationService = TestBed.inject(NotificationService);

    notificationService.info('Welcome to LifeStack', 'Ready', 0);
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Welcome to LifeStack');
  });
});
