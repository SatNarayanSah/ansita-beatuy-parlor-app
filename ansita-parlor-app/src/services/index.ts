export { ApiError, getErrorMessage, isApiError, type ApiErrorCode } from './client';
export {
  configureApi,
  getApiConfig,
  resetApiConfig,
  subscribeApiConfig,
  type ApiConfig,
} from './config';

export * from './appointmentService';
export * from './authService';
export * from './catalogService';
export * from './courseService';
export * from './customerService';
export * from './enrollmentService';
export * from './notificationService';
export * from './reviewService';
export * from './staffService';
