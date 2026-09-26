import { describe, it, expect, vi } from "vitest";
import { handleReaderJump } from "./ReaderNavigationContext";

describe("handleReaderJump", () => {
  const createMockEvent = (overrides?: Partial<React.MouseEvent>) =>
    ({
      button: 0,
      metaKey: false,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      preventDefault: vi.fn(),
      ...overrides,
    }) as unknown as React.MouseEvent;

  it("intercepts standard left-click when jumpTo is provided", () => {
    const jumpTo = vi.fn();
    const event = createMockEvent();

    const handled = handleReaderJump(event, jumpTo, 77);

    expect(handled).toBe(true);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(jumpTo).toHaveBeenCalledWith(77);
  });

  it("ignores middle click (button=1)", () => {
    const jumpTo = vi.fn();
    const event = createMockEvent({ button: 1 });

    const handled = handleReaderJump(event, jumpTo, 77);

    expect(handled).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(jumpTo).not.toHaveBeenCalled();
  });

  it("ignores right click (button=2)", () => {
    const jumpTo = vi.fn();
    const event = createMockEvent({ button: 2 });

    const handled = handleReaderJump(event, jumpTo, 77);

    expect(handled).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(jumpTo).not.toHaveBeenCalled();
  });

  it.each([
    ["metaKey", { metaKey: true }],
    ["ctrlKey", { ctrlKey: true }],
    ["shiftKey", { shiftKey: true }],
    ["altKey", { altKey: true }],
  ])("ignores modifier clicks (%s)", (_, modifier) => {
    const jumpTo = vi.fn();
    const event = createMockEvent(modifier);

    const handled = handleReaderJump(event, jumpTo, 77);

    expect(handled).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(jumpTo).not.toHaveBeenCalled();
  });

  it("does nothing when jumpTo is null", () => {
    const event = createMockEvent();

    const handled = handleReaderJump(event, null, 77);

    expect(handled).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});
