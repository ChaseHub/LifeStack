# Core Directory (`src/app/core`)

This directory houses root-level (`providedIn: 'root'`) infrastructure singletons, authentication guards, and global API contracts instantiated once for the lifetime of the application.

## Architecture Rules
1. **Singletons Only**: Services placed here (`FirebaseService`, `AuthService`, `FirestoreService`, `FunctionsService`, `NotificationService`) manage application-wide state or SDK connections.
2. **Encapsulated Signals**: Expose read-only signals (`Signal<T>` via `.asReadonly()`) publicly; keep `WritableSignal<T>` instances `private`.
3. **Component-Scoped Subscriptions**: Root services must never capture a root `DestroyRef` for per-view streams — always bind reactive listeners (e.g., `FirestoreService.collectionSignal`) to the calling component's injection context (`effect(..., { injector })`).

