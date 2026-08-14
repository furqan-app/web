import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Furqan",
    short_name: "Furqan",
    description: "The word focused Quran app",
    // Pinned, and must never be derived from start_url again. With no `id`, a
    // manifest's application identity comes from start_url — so changing that
    // field re-identifies the app: existing installs stop updating and a
    // reinstall leaves the user with a second icon. "/" is what the previous
    // start_url already implied, so every existing install keeps its identity
    // across the move to /launch.html. See ADR 0042.
    id: "/",
    // A static document that renders nothing and redirects to the last-read
    // reader page from a synchronous <head> script — see public/launch.html.
    // It must stay excluded in middleware.ts's matcher and listed in
    // next.config.mjs's globPublicPatterns, or it 404s / stops working offline.
    start_url: "/launch.html",
    display: "fullscreen",
    // Relaunching an already-running PWA focuses it and leaves it on whatever
    // page it was showing, instead of re-running start_url. Must be
    // "focus-existing", NOT "navigate-existing" — the latter focuses AND
    // navigates the open window to the launch URL, which would yank a user
    // sitting on Settings or Marks back into the reader. Chromium/Android only;
    // iOS ignores it. Next 14 mistypes this field as { platform, url } (the
    // related_applications shape) rather than the spec's { client_mode }, hence
    // the cast.
    ...({ launch_handler: { client_mode: "focus-existing" } } as object),
    background_color: "#16232F",
    theme_color: "#16232F",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
