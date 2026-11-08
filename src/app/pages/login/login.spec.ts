import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { Login } from './login';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  const loginMock = vi.fn<() => Promise<void>>();

  beforeEach(async () => {
    loginMock.mockReset();

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isLoading: signal(false).asReadonly(),
            loginWithGoogle: loginMock
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('navigates to /home after successful Google sign-in', async () => {
    loginMock.mockResolvedValue(undefined);
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    await component.handleGoogleLogin();

    expect(loginMock).toHaveBeenCalledOnce();
    expect(navSpy).toHaveBeenCalledWith(['/home']);
    expect(component.errorMessage()).toBe('');
  });

  it('updates Zoneless errorMessage signal and renders banner on auth error', async () => {
    loginMock.mockRejectedValue({ code: 'auth/network-request-failed', message: 'Network error' });

    await component.handleGoogleLogin();
    await fixture.whenStable();

    const banner = (fixture.nativeElement as HTMLElement).querySelector('.error-banner');
    expect(banner?.textContent).toContain('Network error');
  });

  it('suppresses error banner when user closes the OAuth popup', async () => {
    loginMock.mockRejectedValue({ code: 'auth/popup-closed-by-user' });

    await component.handleGoogleLogin();
    await fixture.whenStable();

    expect(component.errorMessage()).toBe('');
    expect((fixture.nativeElement as HTMLElement).querySelector('.error-banner')).toBeNull();
  });
});

