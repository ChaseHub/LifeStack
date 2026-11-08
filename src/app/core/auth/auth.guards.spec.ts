import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { authGuard } from './auth.guard';
import { publicGuard } from './public.guard';
import { AuthService } from './auth.service';
import { AuthUser } from './user.model';

describe('Auth Router Guards', () => {
  const userSignal = signal<AuthUser | null>(null);
  const mockAuthService = {
    currentUser: userSignal.asReadonly(),
    isAuthenticated: computed(() => userSignal() !== null),
    waitForAuthReady: vi.fn().mockResolvedValue(undefined)
  };

  const dummyRoute = {} as ActivatedRouteSnapshot;
  const dummyState = { url: '/home' } as RouterStateSnapshot;

  beforeEach(() => {
    userSignal.set(null);
    mockAuthService.waitForAuthReady.mockClear();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService }
      ]
    });
  });

  it('authGuard redirects unauthenticated users to /login after awaiting auth readiness', async () => {
    const result = await TestBed.runInInjectionContext(() => authGuard(dummyRoute, dummyState));
    const router = TestBed.inject(Router);

    expect(mockAuthService.waitForAuthReady).toHaveBeenCalledOnce();
    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result as UrlTree)).toBe('/login');
  });

  it('authGuard allows authenticated users through', async () => {
    userSignal.set({
      uid: 'uid_1',
      email: 'chase@example.com',
      displayName: 'Chase',
      photoURL: null
    });

    const result = await TestBed.runInInjectionContext(() => authGuard(dummyRoute, dummyState));
    expect(result).toBe(true);
  });

  it('publicGuard allows unauthenticated users onto /login', async () => {
    const result = await TestBed.runInInjectionContext(() => publicGuard(dummyRoute, dummyState));
    expect(result).toBe(true);
  });

  it('publicGuard redirects already-authenticated users to /home', async () => {
    userSignal.set({
      uid: 'uid_1',
      email: 'chase@example.com',
      displayName: 'Chase',
      photoURL: null
    });

    const result = await TestBed.runInInjectionContext(() => publicGuard(dummyRoute, dummyState));
    const router = TestBed.inject(Router);

    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result as UrlTree)).toBe('/home');
  });
});

