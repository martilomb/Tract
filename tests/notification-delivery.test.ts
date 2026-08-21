import { describe, expect, it, vi } from "vitest";

import {
  deliverNotification,
  type NotificationDeliveryAdapter,
  type NotificationMessage,
} from "@/server/notification-delivery.server";

const message: NotificationMessage = {
  id: "notification-1",
  organizationId: "org-a",
  recipientUserId: "user-1",
  eventType: "dcr.review_requested",
  channel: "email",
  templateKey: "dcr-review-requested",
  templateVersion: 2,
  data: { dcrId: "dcr-1", dcrNumber: "DCR-001" },
};

function adapter(deliver: NotificationDeliveryAdapter["deliver"]): NotificationDeliveryAdapter {
  return { providerKey: "configured-email-provider", channel: "email", deliver };
}

describe("notification delivery boundary", () => {
  it("resolves recipient destinations at delivery time and returns a destination-free receipt", async () => {
    const deliver = vi.fn<NotificationDeliveryAdapter["deliver"]>(async (delivery) => {
      expect(delivery.destination).toBe("reviewer@example.test");
      return { providerMessageId: "provider-message-1" };
    });
    const result = await deliverNotification({
      message,
      attempt: 1,
      maximumAttempts: 3,
      retryBackoffMs: 1000,
      timeoutMs: 5000,
      adapter: adapter(deliver),
      recipientResolver: { resolveDestination: async () => "reviewer@example.test" },
    });

    expect(deliver).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      status: "delivered",
      providerKey: "configured-email-provider",
      providerMessageId: "provider-message-1",
      retryable: false,
    });
    expect(JSON.stringify(result)).not.toContain("reviewer@example.test");
  });

  it("returns deterministic retry scheduling without exposing provider errors", async () => {
    const result = await deliverNotification({
      message,
      attempt: 2,
      maximumAttempts: 3,
      retryBackoffMs: 1000,
      timeoutMs: 5000,
      adapter: adapter(async () => {
        throw new Error("provider response included a private address");
      }),
      recipientResolver: { resolveDestination: async () => "reviewer@example.test" },
      now: () => new Date("2026-08-21T12:00:00Z"),
    });

    expect(result).toMatchObject({
      status: "failed",
      retryable: true,
      nextAttemptAt: "2026-08-21T12:00:02.000Z",
      failureCode: "notification_provider_error",
    });
    expect(JSON.stringify(result)).not.toContain("private address");
  });

  it("rejects sensitive destination and credential fields in outbox data", async () => {
    await expect(
      deliverNotification({
        message: { ...message, data: { dcrId: "dcr-1", recipientEmail: "reviewer@example.test" } },
        attempt: 1,
        maximumAttempts: 1,
        retryBackoffMs: 1000,
        timeoutMs: 5000,
        adapter: adapter(async () => ({ providerMessageId: "not-called" })),
        recipientResolver: { resolveDestination: async () => "reviewer@example.test" },
      }),
    ).rejects.toMatchObject({ code: "notification_sensitive_data_denied" });
  });
});
