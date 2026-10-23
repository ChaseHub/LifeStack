import { Injectable, inject } from '@angular/core';
import { httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { FirebaseService } from '../../core/firebase/firebase.service';
import { NotificationService } from './notification.service';
import { ApiResponse } from '../models/api-response.model';

export interface FunctionCallOptions {
  /** If true, automatically displays an error toast if the function fails (default: true) */
  showErrorNotification?: boolean;
  /** If provided, automatically displays a success toast upon resolution */
  successMessage?: string;
  /** Custom notification title */
  notificationTitle?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FunctionsService {
  private readonly firebase = inject(FirebaseService);
  private readonly notifications = inject(NotificationService);

  /**
   * Calls a Firebase Callable Cloud Function with automatic typing,
   * standard ApiResponse envelope unwrapping, and toast notification routing.
   */
  async call<TRequest = unknown, TResponse = unknown>(
    functionName: string,
    data?: TRequest,
    options: FunctionCallOptions = { showErrorNotification: true }
  ): Promise<TResponse> {
    const callable = httpsCallable<TRequest, ApiResponse<TResponse> | TResponse>(
      this.firebase.functions,
      functionName
    );

    try {
      const result: HttpsCallableResult<ApiResponse<TResponse> | TResponse> = await callable(data);
      const rawData = result.data;

      // Check if response conforms to our standard ApiResponse structure
      if (this.isApiResponse<TResponse>(rawData)) {
        if (!rawData.success) {
          const errMsg = rawData.error?.message || `Function ${functionName} failed`;
          if (options.showErrorNotification !== false) {
            this.notifications.error(errMsg, options.notificationTitle || 'Action Failed');
          }
          throw new Error(errMsg);
        }

        if (options.successMessage) {
          this.notifications.success(options.successMessage, options.notificationTitle);
        }

        return rawData.data as TResponse;
      }

      // If returning direct data (not wrapped in ApiResponse)
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
    if (!err.message) return 'An unexpected network error occurred';
    if (err.code === 'functions/unauthenticated') {
      return 'You must be signed in to perform this action.';
    }
    if (err.code === 'functions/permission-denied') {
      return 'You do not have permission to perform this action.';
    }
    if (err.code === 'functions/not-found') {
      return 'The requested resource was not found.';
    }
    return err.message;
  }
}
