import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthService } from '../../core/auth/auth.service';
import { AuthUser } from '../../core/auth/user.model';
import { FunctionsService } from '../../core/services/functions.service';
import { NotificationService } from '../../core/services/notification.service';
import { Home } from './home';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;
  const callMock = vi.fn();

  const userSignal = signal<AuthUser | null>({
    uid: 'uid_home',
    email: 'chase@example.com',
    displayName: 'Chase',
    photoURL: null
  });

  beforeEach(async () => {
    callMock.mockReset();

    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        {
          provide: AuthService,
          useValue: { currentUser: userSignal.asReadonly() }
        },
        {
          provide: FunctionsService,
          useValue: { call: callMock }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    TestBed.inject(NotificationService).clearAll();
  });

  it('displays the authenticated user overview and invokes getMyProfile callable', async () => {
    callMock.mockResolvedValue({ uid: 'uid_home', email: 'chase@example.com' });

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Welcome back, Chase');
    expect(el.textContent).toContain('uid_home');

    await component.testCallableFunction();
    expect(callMock).toHaveBeenCalledWith(
      'getMyProfile',
      undefined,
      expect.objectContaining({ notificationTitle: 'Cloud Functions' })
    );
    expect(component.isTestingFunction()).toBe(false);
  });
});

