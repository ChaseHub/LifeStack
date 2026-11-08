import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AuthUser } from '../../core/auth/user.model';
import { Shell } from './shell';

describe('Shell', () => {
  let component: Shell;
  let fixture: ComponentFixture<Shell>;

  const userSignal = signal<AuthUser | null>({
    uid: 'uid_shell',
    email: 'chase@example.com',
    displayName: 'Chase',
    photoURL: null
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Shell],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            currentUser: userSignal.asReadonly(),
            isAuthenticated: computed(() => userSignal() !== null),
            isLoading: signal(false).asReadonly(),
            logout: vi.fn().mockResolvedValue(undefined)
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Shell);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('renders the application shell with navbar and main content area', () => {
    expect(component).toBeTruthy();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-navbar')).toBeTruthy();
    expect(el.querySelector('main.shell-content')).toBeTruthy();
  });
});
