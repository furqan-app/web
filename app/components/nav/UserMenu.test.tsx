import { describe, it, expect, vi, beforeEach } from "vitest";
import { create, act } from "react-test-renderer";
import { UserMenu } from "./UserMenu";

const mockIsNativePlatform = vi.fn();
const mockHardNavigateIfOffline = vi.fn();

vi.mock("@/app/utils/platform", () => ({
  isNativePlatform: () => mockIsNativePlatform(),
  hardNavigateIfOffline: (...args: unknown[]) => mockHardNavigateIfOffline(...args),
}));

const mockNativeSignOut = vi.fn();
const mockNativeGoogleSignIn = vi.fn();

vi.mock("@/app/lib/shell/native-signin", () => ({
  nativeSignOut: (...args: unknown[]) => mockNativeSignOut(...args),
  nativeGoogleSignIn: (...args: unknown[]) => mockNativeGoogleSignIn(...args),
}));

const mockSignOut = vi.fn();
const mockSignIn = vi.fn();

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: {
      user: { name: "Test User", email: "test@example.com" },
    },
    status: "authenticated",
  }),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  signIn: (...args: unknown[]) => mockSignIn(...args),
}));

vi.mock("@/app/lib/marks/sync", () => ({
  getPendingCount: vi.fn(() => 0),
  syncMarks: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("@/i18n/routing", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Link: ({ children, href, onClick, className }: any) => (
    <a href={href} onClick={onClick} className={className}>
      {children}
    </a>
  ),
}));

describe("UserMenu sign-out", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls nativeSignOut and does not call next-auth signOut when in native shell", async () => {
    mockIsNativePlatform.mockReturnValue(true);

    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(<UserMenu menuRow />);
    });

    const root = renderer!.root;

    // Expand the account menu row
    const expandButton = root.findByProps({ "aria-expanded": false });
    await act(async () => {
      expandButton.props.onClick();
    });

    // Locate the sign-out button inside the expanded content
    const buttons = root.findAllByType("button");
    const signOutButton = buttons.find((btn) => {
      const text = btn.children.join("");
      return text.includes("Sign out") || text.includes("signOut");
    });
    expect(signOutButton).toBeDefined();

    await act(async () => {
      signOutButton!.props.onClick();
    });

    expect(mockNativeSignOut).toHaveBeenCalledTimes(1);
    expect(mockSignOut).not.toHaveBeenCalled();

    renderer?.unmount();
  });

  it("calls next-auth signOut and does not call nativeSignOut when on web", async () => {
    mockIsNativePlatform.mockReturnValue(false);

    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(<UserMenu menuRow />);
    });

    const root = renderer!.root;

    // Expand the account menu row
    const expandButton = root.findByProps({ "aria-expanded": false });
    await act(async () => {
      expandButton.props.onClick();
    });

    // Locate the sign-out button inside the expanded content
    const buttons = root.findAllByType("button");
    const signOutButton = buttons.find((btn) => {
      const text = btn.children.join("");
      return text.includes("Sign out") || text.includes("signOut");
    });
    expect(signOutButton).toBeDefined();

    await act(async () => {
      signOutButton!.props.onClick();
    });

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockNativeSignOut).not.toHaveBeenCalled();

    renderer?.unmount();
  });
});
