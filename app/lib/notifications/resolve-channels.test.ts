import { describe, expect, it } from "vitest";
import { resolveChannels } from "@/app/lib/notifications/resolve-channels";
import type { NotificationTypeDef } from "@/app/constants/notifications";

const typeDef: NotificationTypeDef = {
  key: "test.type",
  defaultChannels: ["in_app", "push"],
  render: () => ({ title: "t", body: "b" }),
};

describe("resolveChannels", () => {
  it("uses the type's default channels when none are requested", () => {
    const { selected, skipped } = resolveChannels(typeDef, undefined, ["in_app", "push", "email"]);
    expect(selected).toEqual(["in_app", "push"]);
    expect(skipped).toEqual([]);
  });

  it("an explicit request overrides the type default", () => {
    const { selected, skipped } = resolveChannels(typeDef, ["email"], ["in_app", "push", "email"]);
    expect(selected).toEqual(["email"]);
    expect(skipped).toEqual([]);
  });

  it("a channel not in `available` is recorded as skipped, not dropped", () => {
    const { selected, skipped } = resolveChannels(typeDef, undefined, ["in_app"]);
    expect(selected).toEqual(["in_app"]);
    expect(skipped).toEqual(["push"]);
  });

  it("an empty requested array falls back to defaults rather than selecting nothing", () => {
    const { selected } = resolveChannels(typeDef, [], ["in_app", "push", "email"]);
    expect(selected).toEqual(["in_app", "push"]);
  });
});
