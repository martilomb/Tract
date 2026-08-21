export class DomainError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly details: Readonly<Record<string, unknown>> = {},
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export function invariant(
  condition: unknown,
  message: string,
  code: string,
  details: Readonly<Record<string, unknown>> = {},
): asserts condition {
  if (!condition) throw new DomainError(message, code, details);
}
