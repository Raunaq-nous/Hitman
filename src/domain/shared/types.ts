// Errors that services throw and route handlers map to HTTP statuses.
export type DomainErrorCode = "UNAUTHENTICATED" | "NOT_FOUND" | "FORBIDDEN" | "CONFLICT" | "INVALID" | "CLOSED" | "RATE_LIMITED";

const STATUS: Record<DomainErrorCode, number> = { UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409, CLOSED: 409, INVALID: 400, RATE_LIMITED: 429 };

export class DomainError extends Error {
  readonly status: number;
  constructor(readonly code: DomainErrorCode, message: string) {
    super(message);
    this.name = "DomainError";
    this.status = STATUS[code];
  }
}

export const isDomainError = (e: unknown): e is DomainError => e instanceof DomainError;
