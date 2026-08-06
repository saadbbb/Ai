export type AppErrorCode =
  | "INVALID_CREDENTIALS"
  | "EMAIL_ALREADY_REGISTERED"
  | "EMAIL_NOT_VERIFIED"
  | "INVALID_OTP"
  | "OTP_EXPIRED"
  | "OTP_MAX_ATTEMPTS"
  | "UNAUTHENTICATED"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  readonly code: AppErrorCode;

  constructor(code: AppErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "AppError";
  }
}

export interface ActionError {
  code: AppErrorCode;
  message: string;
}

export function toActionError(error: unknown): ActionError {
  if (error instanceof AppError) {
    return { code: error.code, message: error.message };
  }
  console.error("Unhandled error:", error);
  return { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." };
}

export type ActionResult<T = undefined> = { success: true; data: T } | { success: false; error: ActionError };

export function actionOk<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

export function actionFail(error: unknown): ActionResult<never> {
  return { success: false, error: toActionError(error) };
}

export function actionValidationError(message: string): ActionResult<never> {
  return { success: false, error: { code: "VALIDATION_ERROR", message } };
}
