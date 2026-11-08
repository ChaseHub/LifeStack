export interface ApiErrorPayload {
  readonly code: string;
  readonly message: string;
  readonly details?: unknown;
}

export interface ApiResponse<T = unknown> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: ApiErrorPayload;
  readonly timestamp: string;
}

