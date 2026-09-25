# Placeholder web dir for the hosted native shell (ADR 0072, plan slim-native-shell-assets).

The shell loads the live web app via `server.url` and never reads bundled
web assets, so this dir must exist for `cap sync`/`copy` yet stay (nearly)
empty. Do NOT point `webDir` back at `public/` and do NOT add bulk content
here — that re-bloats every native build by ~260 MB.

Note on `launch.html`: A minimal sentinel file exists here because Capacitor
iOS validates that `server.appStartPath` (`/launch.html`) exists in `webDir`
before loading the remote URL.

