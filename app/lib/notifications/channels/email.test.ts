import { describe, expect, it, vi } from "vitest";
import { createEmailChannel } from "@/app/lib/notifications/channels/email";
import type { ChannelSendInput } from "@/app/lib/notifications/types";
import type { FqLogger } from "@/lib/fq-logger";

const fakeLogger: FqLogger = {
  trace: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
  child: () => fakeLogger,
};

const baseInput: ChannelSendInput = {
  notificationId: 1,
  type: "system.test",
  payload: {},
  content: { title: "Test title", body: "Test body" },
  typeDef: { key: "system.test", defaultChannels: [], render: () => ({ title: "t", body: "b" }) },
  recipient: { userId: 1, email: "a@b.com", locale: "en" },
};

describe("createEmailChannel", () => {
  it("skips when the recipient has no email", async () => {
    const transport = { send: vi.fn() };
    const channel = createEmailChannel({ transport, logger: fakeLogger });

    const result = await channel.send({ ...baseInput, recipient: { ...baseInput.recipient, email: null } });

    expect(result).toEqual({ status: "skipped", reason: "no_email" });
    expect(transport.send).not.toHaveBeenCalled();
  });

  it("uses renderEmail over the fallback shell when the type provides one", async () => {
    const transport = { send: vi.fn() };
    const channel = createEmailChannel({ transport, logger: fakeLogger });
    const emailContent = { subject: "Custom subject", html: "<b>custom</b>", text: "custom" };

    await channel.send({ ...baseInput, emailContent });

    expect(transport.send).toHaveBeenCalledWith({ to: "a@b.com", ...emailContent });
  });

  it("falls back to a generic shell built from content when renderEmail is absent", async () => {
    const transport = { send: vi.fn() };
    const channel = createEmailChannel({ transport, logger: fakeLogger });

    await channel.send(baseInput);

    expect(transport.send).toHaveBeenCalledWith({
      to: "a@b.com",
      subject: "Test title",
      text: "Test body",
      html: "<p>Test body</p>",
    });
  });

  it("escapes HTML-significant characters in the fallback shell", async () => {
    const transport = { send: vi.fn() };
    const channel = createEmailChannel({ transport, logger: fakeLogger });

    await channel.send({ ...baseInput, content: { title: "t", body: "<script>alert(1)</script>" } });

    const call = transport.send.mock.calls[0][0];
    expect(call.html).not.toContain("<script>");
    expect(call.html).toContain("&lt;script&gt;");
  });

  it("returns failed when the transport throws", async () => {
    const transport = { send: vi.fn().mockRejectedValue(new Error("smtp down")) };
    const channel = createEmailChannel({ transport, logger: fakeLogger });

    const result = await channel.send(baseInput);

    expect(result).toEqual({ status: "failed", error: "smtp down" });
  });
});
