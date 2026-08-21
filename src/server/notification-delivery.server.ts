import { DomainError, invariant } from "@/domain/errors";

export type NotificationChannel = "in_app" | "email";

export interface NotificationMessage {
  id: string;
  organizationId: string;
  recipientUserId: string;
  eventType: string;
  channel: NotificationChannel;
  templateKey: string;
  templateVersion: number;
  data: Readonly<Record<string, unknown>>;
}

export interface NotificationDeliveryAdapter {
  readonly providerKey: string;
  readonly channel: NotificationChannel;
  deliver(input: {
    message: NotificationMessage;
    destination: string;
    signal: AbortSignal;
  }): Promise<{ providerMessageId: string }>;
}

export interface NotificationRecipientResolver {
  resolveDestination(input: {
    organizationId: string;
    recipientUserId: string;
    channel: NotificationChannel;
  }): Promise<string>;
}

export interface NotificationDeliveryResult {
  messageId: string;
  status: "delivered" | "failed" | "cancelled";
  attempt: number;
  providerKey: string;
  providerMessageId?: string;
  retryable: boolean;
  nextAttemptAt?: string;
  failureCode?: string;
}

const SENSITIVE_DATA_KEY = /(password|secret|token|credential|authorization|email|address)/i;

function assertSafeData(value: unknown, path = "data"): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSafeData(item, `${path}[${index}]`));
    return;
  }
  if (value === null || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value as Readonly<Record<string, unknown>>)) {
    invariant(
      !SENSITIVE_DATA_KEY.test(key),
      "Notification data contains a sensitive destination or credential field",
      "notification_sensitive_data_denied",
      { path: `${path}.${key}` },
    );
    assertSafeData(item, `${path}.${key}`);
  }
}

function retryTimestamp(now: Date, backoffMs: number, attempt: number): string {
  return new Date(now.valueOf() + backoffMs * 2 ** (attempt - 1)).toISOString();
}

export async function deliverNotification(input: {
  message: NotificationMessage;
  attempt: number;
  maximumAttempts: number;
  retryBackoffMs: number;
  timeoutMs: number;
  adapter: NotificationDeliveryAdapter;
  recipientResolver: NotificationRecipientResolver;
  signal?: AbortSignal;
  now?: () => Date;
}): Promise<NotificationDeliveryResult> {
  invariant(input.message.id.trim() !== "", "Notification id is required", "invalid_notification");
  invariant(
    input.message.organizationId.trim() !== "" && input.message.recipientUserId.trim() !== "",
    "Notification tenant and recipient are required",
    "invalid_notification",
  );
  invariant(
    input.adapter.channel === input.message.channel,
    "Notification adapter channel does not match the message",
    "notification_channel_mismatch",
  );
  invariant(
    Number.isInteger(input.message.templateVersion) && input.message.templateVersion > 0,
    "Notification template version must be positive",
    "invalid_notification_template",
  );
  invariant(
    Number.isInteger(input.attempt) &&
      input.attempt > 0 &&
      Number.isInteger(input.maximumAttempts) &&
      input.maximumAttempts >= input.attempt &&
      input.maximumAttempts <= 10,
    "Notification attempt limits are invalid",
    "invalid_notification_attempt",
  );
  invariant(
    input.timeoutMs >= 1000 &&
      input.timeoutMs <= 30000 &&
      input.retryBackoffMs >= 100 &&
      input.retryBackoffMs <= 24 * 60 * 60 * 1000,
    "Notification timeout or retry backoff is invalid",
    "invalid_notification_timing",
  );
  assertSafeData(input.message.data);

  const destination = await input.recipientResolver.resolveDestination({
    organizationId: input.message.organizationId,
    recipientUserId: input.message.recipientUserId,
    channel: input.message.channel,
  });
  invariant(
    destination.trim() !== "",
    "Notification destination is unavailable",
    "notification_destination_missing",
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("notification_timeout"), input.timeoutMs);
  const abortFromCaller = () => controller.abort(input.signal?.reason);
  input.signal?.addEventListener("abort", abortFromCaller, { once: true });
  try {
    const receipt = await input.adapter.deliver({
      message: input.message,
      destination,
      signal: controller.signal,
    });
    invariant(
      receipt.providerMessageId.trim() !== "",
      "Notification provider receipt is invalid",
      "notification_receipt_invalid",
    );
    return Object.freeze({
      messageId: input.message.id,
      status: "delivered",
      attempt: input.attempt,
      providerKey: input.adapter.providerKey,
      providerMessageId: receipt.providerMessageId,
      retryable: false,
    });
  } catch (error) {
    if (input.signal?.aborted) {
      return Object.freeze({
        messageId: input.message.id,
        status: "cancelled",
        attempt: input.attempt,
        providerKey: input.adapter.providerKey,
        retryable: false,
        failureCode: "notification_cancelled",
      });
    }
    if (error instanceof DomainError) throw error;
    const retryable = input.attempt < input.maximumAttempts;
    return Object.freeze({
      messageId: input.message.id,
      status: "failed",
      attempt: input.attempt,
      providerKey: input.adapter.providerKey,
      retryable,
      nextAttemptAt: retryable
        ? retryTimestamp((input.now ?? (() => new Date()))(), input.retryBackoffMs, input.attempt)
        : undefined,
      failureCode: controller.signal.aborted
        ? "notification_timeout"
        : "notification_provider_error",
    });
  } finally {
    clearTimeout(timeout);
    input.signal?.removeEventListener("abort", abortFromCaller);
  }
}
