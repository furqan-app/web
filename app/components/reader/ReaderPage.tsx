import { getPageWords } from "@/app/hooks/get-page-words";
import { getPagePair } from "@/app/utils/quran-pages";
import { Locale } from "@/app/types/config";
import { ReaderPager } from "@/app/components/reader/ReaderPager";

type ReaderPageProps = {
  pageId: string;
  locale: Locale;
  // Locale-prefixed reader base path, e.g. `/${locale}/pages` or
  // `/${locale}/mushaf/${grant}/pages`. All page-navigation hrefs derive from it.
  basePath: string;
  // When set, this reader shows/edits a granted mushaf (someone else's). See ADR 0012.
  grantId?: string;
  // Owner of the viewed mushaf — drives the in-header viewing indicator (grant reader only).
  viewingOwnerName?: string | null;
};

// SSR entry for the reader (ADR 0028). Statically generated per page for deep
// links / SEO / first paint, it fetches only the CURRENT pair's words (sequential
// per ADR 0013) and hands off to the persistent client `ReaderPager`, which owns
// all subsequent navigation client-side (no router.push, no per-swipe remount).
// The old five-panel carousel (~10 pages fetched + mounted per view) is gone.
export const ReaderPage = async ({
  pageId,
  locale,
  basePath,
  grantId,
  viewingOwnerName,
}: ReaderPageProps) => {
  const pageNumber = Number(pageId);
  const { rightPage: rightPageId, leftPage: leftPageId } = getPagePair(pageNumber);

  // Sequential (not Promise.all) so a static-build worker stays within the DB
  // connection limit (ADR 0013).
  const initialRightData = await getPageWords(rightPageId);
  const initialLeftData = await getPageWords(leftPageId);

  // Pre-paint jump gate (issue #405, plan Addendum 7 fix C). When this static
  // document is served as the offline fallback (SW catch handler / slow-network
  // race), the URL names a different page than the SSR content — today page 1's
  // words painted during hydration, before ReaderPager's correction layout
  // effect could run (the "Al-Fatiha flash" on a reconnect document reload).
  // This inline script runs at parse time, BEFORE the reader content below
  // paints: whenever the URL does not already name exactly this page — a
  // reader path with another id, OR a non-reader URL (`/`, `/{locale}`) that
  // the catch handler served this document for — it hides the pager strip via
  // the `fq-pending-jump` class, which ReaderPager's correction effect removes
  // in the same frame as its jumpTo. Plain <script> in a Server Component —
  // same pattern as the theme flash-prevention script in the root layout (the
  // ADR 0020 restriction is scoped to @font-face-bearing <style>, not
  // scripts). The 2s timer is the bounded-reveal safety: a failed correction
  // must resolve to the fallback's own content, never a permanent blank.
  const jumpGateScript = `(function(){try{var m=location.pathname.match(/\\/pages\\/(\\d+)/);if(!m||Number(m[1])!==${pageNumber}){var d=document.documentElement;d.classList.add("fq-pending-jump");setTimeout(function(){d.classList.remove("fq-pending-jump")},2000)}}catch(e){}})();`;

  // Splash-continuity cover (issue #586, ADR 0065). The OS splash ends at this
  // document's first paint, which would otherwise be the skeleton spread plus
  // the document's own loading indicator. This reveals a static cover layer
  // (rendered below, identical bytes for every user) at parse time, BEFORE
  // first paint — but ONLY on standalone mobile/tablet, the same scope as
  // public/launch.html's redirect, so browser tabs and desktop never paint it.
  // Removal belongs to LaunchSplashCover (client leaf in ReaderPager), which
  // lifts the classes when the visible pair is ready or its safety timer fires.
  // Plain <script> in a Server Component — same pattern as the jump gate above
  // and the theme script in the root layout (ADR 0020 scopes only <style>).
  // Hand-synced literals, same discipline as launch.html: the display-mode list
  // from app/utils/platform.ts and the 1367px breakpoint from DESKTOP_UP_QUERY.
  const coverRevealScript = `(function(){try{var s=window.matchMedia("(display-mode: standalone)").matches||window.matchMedia("(display-mode: fullscreen)").matches||navigator.standalone===true;var d=window.matchMedia("(min-width: 1367px)").matches;if(s&&!d){document.documentElement.classList.add("fq-launch-cover")}}catch(e){}})();`;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: jumpGateScript }} />
      <script dangerouslySetInnerHTML={{ __html: coverRevealScript }} />
      {/* Static splash-continuity layer (ADR 0065): hidden by default via CSS,
          shown only while <html> carries `fq-launch-cover`. Inline wordmark
          only — no <img>, no fetched asset, zero network. `aria-hidden` and no
          focusable children: it blocks no choice, so it takes no focus trap
          (the first-run gate's focus-trap spec must keep passing). */}
      <div id="fq-launch-cover" aria-hidden="true">
        <span className="fq-launch-cover-mark">Furqan</span>
      </div>
      <ReaderPager
        initialPage={pageNumber}
        rightPageId={rightPageId}
        leftPageId={leftPageId}
        initialRightData={initialRightData}
        initialLeftData={initialLeftData}
        locale={locale}
        basePath={basePath}
        grantId={grantId}
        viewingOwnerName={viewingOwnerName}
      />
    </>
  );
};
