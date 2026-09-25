import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { exitNativeApp, handleNativeBackButton } from "./back-button";
import * as overlayBackGuard from "@/app/utils/overlay-back-guard";
import * as platform from "@/app/utils/platform";

const mockExitApp = vi.fn().mockResolvedValue(undefined);

vi.mock("@capacitor/app", () => ({
  App: {
    exitApp: () => mockExitApp(),
  },
}));

describe("back-button", () => {
  const mockBack = vi.fn();
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

  const stubWindow = () => {
    Object.defineProperty(globalThis, "window", {
      value: {
        history: {
          back: mockBack,
        },
      },
      writable: true,
      configurable: true,
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    stubWindow();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalWindow) {
      Object.defineProperty(globalThis, "window", originalWindow);
    } else {
      // @ts-expect-error cleanup global window
      delete globalThis.window;
    }
  });

  describe("exitNativeApp", () => {
    it("does nothing when window is undefined", async () => {
      // @ts-expect-error simulate node without window
      delete globalThis.window;
      vi.spyOn(platform, "isNativePlatform").mockReturnValue(true);
      vi.spyOn(platform, "isAndroid").mockReturnValue(true);

      await exitNativeApp();
      expect(mockExitApp).not.toHaveBeenCalled();
    });

    it("does nothing when not on native platform", async () => {
      vi.spyOn(platform, "isNativePlatform").mockReturnValue(false);
      vi.spyOn(platform, "isAndroid").mockReturnValue(true);

      await exitNativeApp();
      expect(mockExitApp).not.toHaveBeenCalled();
    });

    it("does nothing when not on Android", async () => {
      vi.spyOn(platform, "isNativePlatform").mockReturnValue(true);
      vi.spyOn(platform, "isAndroid").mockReturnValue(false);

      await exitNativeApp();
      expect(mockExitApp).not.toHaveBeenCalled();
    });

    it("invokes App.exitApp when on native Android", async () => {
      vi.spyOn(platform, "isNativePlatform").mockReturnValue(true);
      vi.spyOn(platform, "isAndroid").mockReturnValue(true);

      await exitNativeApp();
      expect(mockExitApp).toHaveBeenCalledTimes(1);
    });
  });

  describe("handleNativeBackButton", () => {
    it("delegates to window.history.back() when an overlay back guard is armed", () => {
      vi.spyOn(overlayBackGuard, "isOverlayBackGuardArmed").mockReturnValue(true);

      handleNativeBackButton(false);

      expect(mockBack).toHaveBeenCalledTimes(1);
      expect(mockExitApp).not.toHaveBeenCalled();
    });

    it("delegates to window.history.back() when canGoBack is true", () => {
      vi.spyOn(overlayBackGuard, "isOverlayBackGuardArmed").mockReturnValue(false);

      handleNativeBackButton(true);

      expect(mockBack).toHaveBeenCalledTimes(1);
      expect(mockExitApp).not.toHaveBeenCalled();
    });

    it("calls exitNativeApp() when no overlay is armed and canGoBack is false on native Android", async () => {
      vi.spyOn(overlayBackGuard, "isOverlayBackGuardArmed").mockReturnValue(false);
      vi.spyOn(platform, "isNativePlatform").mockReturnValue(true);
      vi.spyOn(platform, "isAndroid").mockReturnValue(true);

      handleNativeBackButton(false);

      expect(mockBack).not.toHaveBeenCalled();
      await vi.waitFor(() => {
        expect(mockExitApp).toHaveBeenCalledTimes(1);
      });
    });

    it("does not call App.exitApp() when canGoBack is false outside native platform", async () => {
      vi.spyOn(overlayBackGuard, "isOverlayBackGuardArmed").mockReturnValue(false);
      vi.spyOn(platform, "isNativePlatform").mockReturnValue(false);

      handleNativeBackButton(false);

      expect(mockBack).not.toHaveBeenCalled();
      expect(mockExitApp).not.toHaveBeenCalled();
    });
  });
});
