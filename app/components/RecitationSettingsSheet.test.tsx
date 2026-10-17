/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { create, act } from "react-test-renderer";
import { RecitationSettingsSheet } from "./RecitationSettingsSheet";
import { NumberCombobox } from "@/components/ui/number-combobox";
import { RadioGroup } from "@/components/ui/radio-group";
import type { SurahResult } from "@/app/types";

// ---------------------------------------------------------------------------
// Mocks: the sheet's Radix primitives (Sheet/Popover/Command) portal into the
// DOM, which the node vitest environment has no access to. They are stubbed
// to transparent containers that preserve props (value/onChange/onSelect) so
// the tests can drive the draft logic. NumberCombobox is stubbed to expose
// its `values`/`value` props — the floor assertions read those directly.
// ---------------------------------------------------------------------------
vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/app/hooks/use-translations", () => ({
  default: () => (key: string, fallback?: string) => fallback ?? key,
}));

vi.mock("@/app/hooks/use-verse-pages", () => ({
  useVersePages: () => ({
    data: {
      "79:11": 583,
      "79:1": 583,
      "80:1": 585,
      "80:5": 585,
      "2:1": 2,
      "2:50": 8,
      "5:1": 106,
    },
  }),
}));

vi.mock("@/app/hooks/use-close-on-back-gesture", () => ({
  useCloseOnBackGesture: () => {},
}));

vi.mock("@/app/components/recitation/ReciterCombobox", () => ({
  ReciterCombobox: () => null,
}));

vi.mock("@/components/ui/sheet", async () => {
  const React = await vi.importActual<typeof import("react")>("react");
  const Sheet = ({ children }: any) => <div>{children}</div>;
  Sheet.displayName = "Sheet";
  // eslint-disable-next-line react/display-name
  const SheetContent = React.forwardRef(({ children, ...props }: any, ref: any) => (
    <div {...props} ref={ref}>
      {children}
    </div>
  ));
  (SheetContent as any).displayName = "SheetContent";
  const SheetHeader = ({ children }: any) => <div>{children}</div>;
  const SheetTitle = ({ children }: any) => <div>{children}</div>;
  const SheetDescription = ({ children }: any) => <div>{children}</div>;
  return { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription };
});

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <>{children}</>,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ui/command", () => ({
  Command: ({ children }: any) => <div>{children}</div>,
  CommandInput: (props: any) => <input {...props} />,
  CommandList: ({ children }: any) => <div>{children}</div>,
  CommandEmpty: ({ children }: any) => <div>{children}</div>,
  CommandGroup: ({ children }: any) => <div>{children}</div>,
  CommandItem: (props: any) => (
    <button data-testid="surah-option" data-value={props.value} onClick={props.onSelect}>
      {props.children}
    </button>
  ),
}));

vi.mock("@/components/ui/radio-group", () => ({
  // Preserve every prop (value/onValueChange) on the host node so tests can
  // read the selected preset and drive changes directly.
  RadioGroup: (props: any) => <div {...props} data-testid="radio-group" />,
  RadioGroupItem: (props: any) => <input type="radio" value={props.value} readOnly />,
}));

vi.mock("@/components/ui/number-combobox", () => ({
  NumberCombobox: (props: any) => (
    <div
      data-testid="number-combobox"
      data-placeholder={props.placeholder}
      data-value={props.value}
    />
  ),
}));

const mocks = vi.hoisted(() => ({
  recitation: {
    settings: {
      reciterId: 1,
      stopPoint: "page",
      rangeTo: null,
      perAyahRepeatCount: 1,
      rangeRepeatCount: 1,
      playbackSpeed: 1,
      pauseBetweenRepeatsMs: 0,
    },
    updateSettings: vi.fn(),
    reciters: [],
    chapters: [] as SurahResult[],
    status: "playing",
    currentVerseKey: "79:11",
    startVerseKey: "79:11",
    isSettingsOpen: true,
    closeSettings: vi.fn(),
    pageFirstVerseKey: "79:1",
    recitedPage: 583,
    currentPageNumber: 583,
    play: vi.fn(),
    applyStartSeek: vi.fn(),
    resolveStartPoint: vi.fn(),
    activeOverride: null,
  } as any,
}));

vi.mock("@/app/contexts/RecitationContext", () => ({
  useRecitation: () => mocks.recitation,
}));

const CHAPTERS: SurahResult[] = [
  { id: 1, name_arabic: "الفاتحة", name_simple: "Al-Fatihah", verses_count: 7, revelation_place: "makkah", pages: "1-1" },
  { id: 2, name_arabic: "البقرة", name_simple: "Al-Baqarah", verses_count: 286, revelation_place: "madinah", pages: "2-49" },
  { id: 5, name_arabic: "المائدة", name_simple: "Al-Ma'idah", verses_count: 120, revelation_place: "madinah", pages: "106-127" },
  { id: 79, name_arabic: "النازعات", name_simple: "An-Nazi'at", verses_count: 46, revelation_place: "makkah", pages: "583-584" },
  { id: 80, name_arabic: "عبس", name_simple: "'Abasa", verses_count: 42, revelation_place: "makkah", pages: "585-585" },
  { id: 114, name_arabic: "الناس", name_simple: "An-Nas", verses_count: 6, revelation_place: "makkah", pages: "604-604" },
];

const START_VALUES = new Set([
  "current-page",
  "surah-start",
  "rub-start",
  "custom-start",
]);

function setSession(session: {
  startVerseKey: string;
  currentVerseKey: string;
  page: number;
  pageFirstVerseKey: string;
}) {
  mocks.recitation.settings = {
    reciterId: 1,
    stopPoint: "page",
    rangeTo: null,
    perAyahRepeatCount: 1,
    rangeRepeatCount: 1,
    playbackSpeed: 1,
    pauseBetweenRepeatsMs: 0,
  };
  mocks.recitation.chapters = CHAPTERS;
  mocks.recitation.status = "playing";
  mocks.recitation.startVerseKey = session.startVerseKey;
  mocks.recitation.currentVerseKey = session.currentVerseKey;
  mocks.recitation.recitedPage = session.page;
  mocks.recitation.currentPageNumber = session.page;
  mocks.recitation.pageFirstVerseKey = session.pageFirstVerseKey;
  mocks.recitation.isSettingsOpen = true;
  mocks.recitation.activeOverride = null;
}

async function mountSheet() {
  let renderer: ReturnType<typeof create> | undefined;
  await act(async () => {
    renderer = create(<RecitationSettingsSheet />);
  });
  return renderer!;
}

function startGroup(root: any) {
  return root
    .findAllByType(RadioGroup)
    .find((g: any) => START_VALUES.has(g.props.value));
}

function stopGroup(root: any) {
  return root
    .findAllByType(RadioGroup)
    .find((g: any) => !START_VALUES.has(g.props.value));
}

async function setStopPoint(root: any, value: string) {
  await act(async () => {
    stopGroup(root).props.onValueChange(value);
  });
}

/** NumberComboboxes with the given placeholder, in document order. For the
 *  "Verse" placeholder that is [start picker, stop picker]. */
function versePickers(root: any) {
  return root
    .findAllByType(NumberCombobox)
    .filter((c: any) => c.props.placeholder === "Verse");
}

function pagePickers(root: any) {
  return root
    .findAllByType(NumberCombobox)
    .filter((c: any) => c.props.placeholder === "Page");
}

function surahOptions(root: any): string[] {
  return root
    .findAll((el: any) => el.props?.["data-testid"] === "surah-option")
    .map((el: any) => String(el.props["data-value"]));
}

const surahIdOf = (optionValue: string) => Number(optionValue.split(" ").pop());

/** Range-type Page/Verse toggle buttons, in document order (start block first). */
function rangeTypeButtons(root: any, label: string) {
  return root
    .findAllByType("button")
    .filter((b: any) => b.children?.some((c: any) => c === label));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RecitationSettingsSheet custom stop/start pinning (#788)", () => {
  it("pins the launch verse as Start From when recitation starts from 79:11", async () => {
    setSession({ startVerseKey: "79:11", currentVerseKey: "79:11", page: 583, pageFirstVerseKey: "79:1" });
    const renderer = await mountSheet();
    const root = renderer.root;

    // "Custom" is selected under Start From (a concrete verse, not a preset).
    expect(startGroup(root).props.value).toBe("custom-start");

    // The start verse picker shows surah 79 / ayah 11. (The start picker
    // itself stays unfloored — the user may move the start anywhere; the
    // floors below constrain the STOP picker.)
    const [startAyah] = versePickers(root);
    expect(startAyah.props.value).toBe(11);
    expect(startAyah.props.values[0]).toBe(1);
    expect(startAyah.props.values.at(-1)).toBe(46);
    expect(startAyah.props.values).toHaveLength(46);

    renderer.unmount();
  });

  it("changing Stop At to a custom page keeps Start From pinned at 79:11 and floors pages", async () => {
    setSession({ startVerseKey: "79:11", currentVerseKey: "79:11", page: 583, pageFirstVerseKey: "79:1" });
    const renderer = await mountSheet();
    const root = renderer.root;

    await setStopPoint(root, "custom");

    // Start never moves when the stop point is edited.
    expect(startGroup(root).props.value).toBe("custom-start");
    expect(versePickers(root)[0].props.value).toBe(11);

    // Page options are floored to the start page: [583..604].
    const [stopPage] = pagePickers(root);
    expect(stopPage.props.value).toBe(583);
    expect(stopPage.props.values[0]).toBe(583);
    expect(stopPage.props.values.at(-1)).toBe(604);
    expect(stopPage.props.values).toHaveLength(604 - 583 + 1);

    // Moving the stop page forward still leaves the start pinned.
    await act(async () => {
      stopPage.props.onChange(590);
    });
    expect(startGroup(root).props.value).toBe("custom-start");
    expect(versePickers(root)[0].props.value).toBe(11);

    renderer.unmount();
  });

  it("custom verse stop floors surah/ayah to >= 79:11 and never moves the start", async () => {
    setSession({ startVerseKey: "79:11", currentVerseKey: "79:11", page: 583, pageFirstVerseKey: "79:1" });
    const renderer = await mountSheet();
    const root = renderer.root;

    await setStopPoint(root, "custom");

    // Switch the STOP picker (second "Verse" toggle; the first belongs to the
    // start block) from Page to Verse mode. A second Verse combobox appearing
    // proves the stop picker — not the start block — was switched.
    const verseToggles = rangeTypeButtons(root, "Verse");
    expect(verseToggles).toHaveLength(2);
    await act(async () => {
      verseToggles[1].props.onClick();
    });
    expect(versePickers(root)).toHaveLength(2);

    // Surah options: the start picker lists every surah, the stop picker only
    // surahs >= 79 — so ids below 79 appear exactly once (start's), while
    // 79/80/114 appear twice (start's + stop's).
    const options = surahOptions(root);
    expect(options).toHaveLength(CHAPTERS.length + 3);
    expect(options.filter((v) => surahIdOf(v) < 79)).toHaveLength(3);
    const stopOptions = options.slice(-3).map(surahIdOf);
    expect(stopOptions).toEqual([79, 80, 114]);

    // Within surah 79 the stop ayah cannot precede ayah 11.
    const [, stopAyah] = versePickers(root);
    expect(stopAyah.props.value).toBe(11);
    expect(stopAyah.props.values[0]).toBe(11);
    expect(stopAyah.props.values.at(-1)).toBe(46);

    // Moving the stop ayah forward leaves the start pinned at 79:11.
    await act(async () => {
      stopAyah.props.onChange(20);
    });
    expect(startGroup(root).props.value).toBe("custom-start");
    const [startAyahAfter] = versePickers(root);
    expect(startAyahAfter.props.value).toBe(11);
    expect(versePickers(root)[1].props.value).toBe(20);

    // Moving the stop surah to a later surah opens its full ayah range while
    // the start stays pinned: surah 80 offers [1..42].
    const stopSurah80 = surahOptions(root)
      .slice(-3)
      .map((v, i) => ({ v, i }))
      .find(({ v }) => surahIdOf(v) === 80);
    expect(stopSurah80).toBeDefined();
    const stopOptionButtons = root.findAll(
      (el: any) => el.props?.["data-testid"] === "surah-option",
    );
    await act(async () => {
      stopOptionButtons.slice(-3)[stopSurah80!.i].props.onClick();
    });
    const [, stopAyahAfterSurah] = versePickers(root);
    expect(stopAyahAfterSurah.props.values[0]).toBe(1);
    expect(stopAyahAfterSurah.props.values).toHaveLength(42);
    expect(startGroup(root).props.value).toBe("custom-start");
    expect(versePickers(root)[0].props.value).toBe(11);

    renderer.unmount();
  });

  it("discards a stale cached stop verse that precedes the new session start", async () => {
    // First session: pick stop verse 79:20 so the module-level verse cache
    // remembers it. (Surah is chosen explicitly through the stop picker's
    // own options — the cache may hold any residue from earlier tests.)
    setSession({ startVerseKey: "79:11", currentVerseKey: "79:11", page: 583, pageFirstVerseKey: "79:1" });
    const first = await mountSheet();
    await setStopPoint(first.root, "custom");
    await act(async () => {
      rangeTypeButtons(first.root, "Verse")[1].props.onClick();
    });
    const firstStopOptions = first.root.findAll(
      (el: any) => el.props?.["data-testid"] === "surah-option",
    );
    const idx79 = surahOptions(first.root)
      .slice(-3)
      .map(surahIdOf)
      .indexOf(79);
    expect(idx79).toBeGreaterThanOrEqual(0);
    await act(async () => {
      firstStopOptions.slice(-3)[idx79].props.onClick();
    });
    await act(async () => {
      versePickers(first.root)[1].props.onChange(20);
    });
    expect(versePickers(first.root)[1].props.value).toBe(20);
    first.unmount();

    // Second session starts at 80:5 — the cached 79:20 precedes it and must
    // be ignored, defaulting the stop to >= 80:5.
    setSession({ startVerseKey: "80:5", currentVerseKey: "80:5", page: 585, pageFirstVerseKey: "80:1" });
    const renderer = await mountSheet();
    const root = renderer.root;

    expect(startGroup(root).props.value).toBe("custom-start");
    expect(versePickers(root)[0].props.value).toBe(5);

    await setStopPoint(root, "custom");
    await act(async () => {
      rangeTypeButtons(root, "Verse")[1].props.onClick();
    });
    const [, stopAyah] = versePickers(root);
    expect(stopAyah.props.value).toBe(5);
    expect(stopAyah.props.values[0]).toBe(5);
    expect(stopAyah.props.values.at(-1)).toBe(42);
    expect(startGroup(root).props.value).toBe("custom-start");
    expect(versePickers(root)[0].props.value).toBe(5);

    renderer.unmount();
  });

  it("floors custom page stops to the start page on a 5:1 launch", async () => {
    setSession({ startVerseKey: "5:1", currentVerseKey: "5:1", page: 106, pageFirstVerseKey: "5:1" });
    const renderer = await mountSheet();
    const root = renderer.root;

    expect(startGroup(root).props.value).toBe("custom-start");
    expect(versePickers(root)[0].props.value).toBe(1);

    await setStopPoint(root, "custom");

    const [stopPage] = pagePickers(root);
    expect(stopPage.props.values[0]).toBe(106);
    expect(stopPage.props.values.at(-1)).toBe(604);
    expect(stopPage.props.values).toHaveLength(604 - 106 + 1);
    expect(startGroup(root).props.value).toBe("custom-start");
    expect(versePickers(root)[0].props.value).toBe(1);

    renderer.unmount();
  });

  it("offers exactly four Start From options and excludes the redundant current-verse option", async () => {
    setSession({ startVerseKey: "79:11", currentVerseKey: "79:11", page: 583, pageFirstVerseKey: "79:1" });
    const renderer = await mountSheet();
    const root = renderer.root;

    const startRadioGroup = startGroup(root);
    const radioItems = startRadioGroup.findAll((el: any) => el.props?.type === "radio");
    const itemValues = radioItems.map((el: any) => el.props.value);

    expect(itemValues).toEqual(["current-page", "surah-start", "rub-start", "custom-start"]);
    expect(itemValues).not.toContain("current-verse");

    renderer.unmount();
  });

  it("floors custom page stop to the exact page on a mid-surah launch (2:50 on page 8)", async () => {
    setSession({ startVerseKey: "2:50", currentVerseKey: "2:50", page: 8, pageFirstVerseKey: "2:49" });
    const renderer = await mountSheet();
    const root = renderer.root;

    expect(startGroup(root).props.value).toBe("custom-start");
    expect(versePickers(root)[0].props.value).toBe(50);

    await setStopPoint(root, "custom");

    // Page options must floor to page 8 (not surah 2's starting page 2)
    const [stopPage] = pagePickers(root);
    expect(stopPage.props.values[0]).toBe(8);
    expect(stopPage.props.values.at(-1)).toBe(604);
    expect(stopPage.props.values).toHaveLength(604 - 8 + 1);

    renderer.unmount();
  });

  it("floors custom page stop to the surah start page when surah-start preset is selected", async () => {
    setSession({ startVerseKey: "2:50", currentVerseKey: "2:50", page: 8, pageFirstVerseKey: "2:49" });
    const renderer = await mountSheet();
    const root = renderer.root;

    // Switch start preset to surah-start
    await act(async () => {
      startGroup(root).props.onValueChange("surah-start");
    });
    expect(startGroup(root).props.value).toBe("surah-start");

    await setStopPoint(root, "custom");

    // Page options must floor to surah 2's start page (page 2, not referencePage 8)
    const [stopPage] = pagePickers(root);
    expect(stopPage.props.values[0]).toBe(2);
    expect(stopPage.props.values.at(-1)).toBe(604);
    expect(stopPage.props.values).toHaveLength(604 - 2 + 1);

    renderer.unmount();
  });
});
