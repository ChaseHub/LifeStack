import { Injectable, inject } from '@angular/core';
import { httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { FirebaseService } from '../firebase/firebase.service';
import { NotificationService } from './notification.service';
import { ApiResponse } from '../models/api-response.model';

export interface FunctionCallOptions {
  /** If true, automatically displays an error toast when the function fails (default: true). */
  readonly showErrorNotification?: boolean;
  /** If provided, automatically displays a success toast upon resolution. */
  readonly successMessage?: string;
  /** Custom notification title. */
  readonly notificationTitle?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FunctionsService {
  private readonly firebase = inject(FirebaseService);
  private readonly notifications = inject(NotificationService);

  /**
   * Calls a 2nd Gen Firebase Callable Cloud Function with strong typing,
   * standard `ApiResponse` envelope unwrapping, and toast notification routing.
   */
  async call<TRequest = void, TResponse = unknown>(
    functionName: string,
    data?: TRequest,
    options: FunctionCallOptions = { showErrorNotification: true }
  ): Promise<TResponse> {
    const callable = httpsCallable<TRequest | undefined, ApiResponse<TResponse> | TResponse>(
      this.firebase.functions,
      functionName
    );

    try {
      const result: HttpsCallableResult<ApiResponse<TResponse> | TResponse> = await callable(data);
      const rawData = result.data;

      if (this.isApiResponse<TResponse>(rawData)) {
        if (!rawData.success) {
          const errMsg = rawData.error?.message || `Function ${functionName} failed`;
          throw new Error(errMsg);
        }

        if (options.successMessage) {
          this.notifications.success(options.successMessage, options.notificationTitle);
        }

        return rawData.data as TResponse;
      }

      if (options.successMessage) {
        this.notifications.success(options.successMessage, options.notificationTitle);
      }

      return rawData as TResponse;
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      const errorMessage = this.formatFirebaseError(errorObj);

      if (options.showErrorNotification !== false) {
        this.notifications.error(errorMessage, options.notificationTitle || 'Error');
      }

      throw err;
    }
  }

  private isApiResponse<T>(obj: unknown): obj is ApiResponse<T> {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'success' in obj &&
      typeof (obj as { success: unknown }).success === 'boolean'
    );
  }

  private formatFirebaseError(err: { code?: string; message?: string }): string {
    if (!err.message) {
      return 'An unexpected network error occurred.';
    }
    if (err.code === 'functions/unauthenticated') {
      return 'You must be signed in to perform this action.';
    }
    if (err.code === 'functions/permission-denied') {
      return 'You do not have permission to perform this action.';
    }
    if (err.code === 'functions/not-found') {
      return 'The requested resource was not found.';
    }
    if (err.code === 'functions/internal' && err.message === 'INTERNAL') {
      return 'An internal server error occurred while processing your request.';
    }
    if (err.code === 'functions/unavailable') {
      return 'The service is temporarily unavailable. Please try again shortly.';
    }
    if (err.code === 'functions/deadline-exceeded') {
      return 'The request timed out. Please try again.';
    }
    return err.message;
  }
}

