export interface AuthUser {
  readonly uid: string;
  readonly email: string | null;
  readonly displayName: string | null;
  readonly photoURL: string | null;
}

export interface UserProfile extends AuthUser {
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}
