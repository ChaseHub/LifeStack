import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../auth/auth.service';
import { AuthUser } from '../auth/user.model';
import { FirebaseService } from '../firebase/firebase.service';
import { FirestoreService } from './firestore.service';

describe('FirestoreService', () => {
  const userSignal = signal<AuthUser | null>(null);

  beforeEach(() => {
    userSignal.set(null);
    TestBed.configureTestingModule({
      providers: [
        FirestoreService,
        { provide: FirebaseService, useValue: { db: {} } },
        {
          provide: AuthService,
          useValue: { currentUser: userSignal.asReadonly() }
        }
      ]
    });
  });

  it('throws when requireUserId() is called without an authenticated user', () => {
    const service = TestBed.inject(FirestoreService);
    expect(() => service.requireUserId()).toThrowError(/not authenticated/);
  });

  it('returns the current UID when authenticated', () => {
    userSignal.set({
      uid: 'uid_verified',
      email: 'user@example.com',
      displayName: 'User',
      photoURL: null
    });
    const service = TestBed.inject(FirestoreService);
    expect(service.requireUserId()).toBe('uid_verified');
  });

  it('enforces an injection context when collectionSignal() is called without an explicit injector', () => {
    const service = TestBed.inject(FirestoreService);
    expect(() => service.collectionSignal('habits')).toThrow();
  });
});

