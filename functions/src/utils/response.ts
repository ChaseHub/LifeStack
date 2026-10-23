import { ApiResponse } from "../types/api-response";

export function successResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString()
  };
}

export function errorResponse(code: string, message: string, details?: unknown): ApiResponse<never> {
  return {
    success: false,
    error: {
      code,
      message,
      details
    },
    timestamp: new Date().toISOString()
  };
}
