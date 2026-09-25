import type { CapacitorConfig } from "@capacitor/cli";

// Furqan native shell (ADR 0072, plan mobile-app-capacitor): HTTPS-hosted
// hybrid — the shell loads the live web app, never a bundled static export
// and never `capacitor://`. `server.url` is per environment via
// CAP_SERVER_URL so dev / TestFlight / prod each point at their own host;
// allowNavigation always covers the active host plus production.
const PROD_HOST = "furqan.taha7.com";

// Normalize server URL to a clean origin: trailing slashes, paths, or query
// parameters break Android's addWebMessageListener origin rules and root-relative redirects.
const serverOrigin = (() => {
  const raw = process.env.CAP_SERVER_URL?.trim();
  if (!raw) return `https://${PROD_HOST}`;
  try {
    const parsed = new URL(raw);
    return parsed.origin === "null" ? `https://${PROD_HOST}` : parsed.origin;
  } catch {
    return `https://${PROD_HOST}`;
  }
})();

// `allowNavigation` must cover whichever host `server.url` points at —
// otherwise internal navigation opens the external browser on dev/staging
// builds. `cleartext` follows the URL scheme for plain-HTTP LAN dev
// (Android side; iOS LAN dev additionally needs an ATS exception, a
// device-stage concern, not a config one).
const serverHost = (() => {
  try {
    return new URL(serverOrigin).hostname;
  } catch {
    return PROD_HOST;
  }
})();

const config: CapacitorConfig = {
  // Pre-release value — cheap to change before the first store upload,
  // frozen once the apps are published (OS identity + push credentials).
  appId: "app.furqan",
  appName: "Furqan",
  // Unused while hosted (no static export per ADR 0072) but required by the
  // CLI — points at the near-empty native-shell-web placeholder dir so
  // `cap sync`/`copy` never fail on a missing folder and never bundle the
  // ~260 MB of public/ web assets into native builds (plan
  // slim-native-shell-assets). Never bake Quran/font assets here — bulk
  // content downloads post-install per edition with sentinel + verify-and-heal.
  webDir: "native-shell-web",
  server: {
    url: serverOrigin,
    // Cold launch routes through /launch.html to resume the last-read Quran page
    // before first paint (ADR 0042 / Issue #683).
    // Note: Capacitor iOS (CAPBridgeViewController.swift) checks that appStartPath exists
    // locally in webDir (native-shell-web/) before loading the remote URL, calling
    // fatalLoadError() if absent. native-shell-web/launch.html satisfies this check.
    appStartPath: "/launch.html",
    allowNavigation: Array.from(new Set([PROD_HOST, serverHost])),
    cleartext: !serverOrigin.startsWith("https://"),
    androidScheme: "https",
  },
  plugins: {
    SystemBars: {
      // Style "DARK" ensures light system bar content (white text/icons) on Furqan's
      // dark navy background (#16232F). insetsHandling "native" aligns with native shell padding.
      style: "DARK",
      insetsHandling: "native",
    },
  },
};

export default config;
