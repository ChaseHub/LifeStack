import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { AuthUser } from '../../../../core/auth/user.model';
import { Navbar } from './navbar';

describe('Navbar', () => {
  let component: Navbar;
  let fixture: ComponentFixture<Navbar>;
  const logoutMock = vi.fn().mockResolvedValue(undefined);
  const userSignal = signal<AuthUser | null>({
    uid: 'uid_nav',
    email: 'chase@example.com',
    displayName: 'Chase',
    photoURL: 'https://lh3.googleusercontent.com/a/avatar'
  });

  beforeEach(async () => {
    logoutMock.mockClear();
    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            currentUser: userSignal.asReadonly(),
            isLoading: signal(false).asReadonly(),
            logout: logoutMock
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Navbar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('renders avatar with referrerpolicy="no-referrer" and user display name', () => {
    const el = fixture.nativeElement as HTMLElement;
    const avatar = el.querySelector<HTMLImageElement>('img.avatar');
    expect(avatar).toBeTruthy();
    expect(avatar?.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(el.querySelector('.user-name')?.textContent).toBe('Chase');
  });

  it('signs out and navigates to /login when Sign Out is clicked', async () => {
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    await component.handleLogout();

    expect(logoutMock).toHaveBeenCalledOnce();
    expect(navSpy).toHaveBeenCalledWith(['/login']);
  });
});
