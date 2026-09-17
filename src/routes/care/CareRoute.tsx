import { useEffect, useRef, useState, type ReactNode } from "react";
import { Drawer } from "../../components/shared/Drawer";
import { TodayScreen } from "../../components/caregiver/TodayScreen";
import { AlbumPanel } from "../../components/caregiver/AlbumPanel";
import { SettingsPanel } from "../../components/caregiver/SettingsPanel";
import { CommunityPackPanel } from "../../components/caregiver/CommunityPackPanel";
import { PhotosPanel } from "../../components/caregiver/PhotosPanel";
import { PeoplePanel } from "../../components/caregiver/PeoplePanel";
import { TrendsPanel } from "../../components/caregiver/TrendsPanel";
import { AlertsPanel } from "../../components/caregiver/AlertsPanel";
import { RudasPanel } from "../../components/caregiver/RudasPanel";
import { HowAreYouPanel } from "../../components/caregiver/HowAreYouPanel";
import { YourDataPanel } from "../../components/caregiver/YourDataPanel";
import { StartSessionButton } from "../../components/caregiver/SessionStarter";
import { useAlerts } from "../../game/alerts/AlertsContext";
import { useProfile } from "../../game/profiles/ProfileContext";
import { personWords } from "../../game/profiles/words";

export interface CareRouteProps {
  onBackToPlay: () => void;
  onBackToTitle?: () => void;
  /** The caregiver has handed the device over — go to the patient side and begin. */
  onStartSession: () => void;
  /** From Setup › Your data: see exactly what a health worker can see. */
  onShowHealthWorkerView: () => void;
}

type TabId = "today" | "world" | "progress" | "you" | "setup";

/** Sections inside a tab. Two levels only: tab, then segment — never a third. */
const SEGMENTS = {
  world: [
    { id: "people", label: "People" },
    { id: "photos", label: "Photos" },
    { id: "album", label: "Album" },
  ],
  progress: [
    { id: "trends", label: "Trends" },
    { id: "assessments", label: "Assessments" },
  ],
  setup: [
    { id: "preferences", label: "Preferences" },
    { id: "community", label: "Community pack" },
    { id: "data", label: "Your data" },
  ],
} as const;

type SegmentedTab = keyof typeof SEGMENTS;
type SegmentId = (typeof SEGMENTS)[SegmentedTab][number]["id"];

const NAV_KEY = "loom_care_nav";

function readNav(): { tab: TabId; segments: Partial<Record<SegmentedTab, SegmentId>> } {
  try {
    const raw = sessionStorage.getItem(NAV_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // start on Today
  }
  return { tab: "today", segments: {} };
}

function Icon({ tab }: { tab: TabId }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (tab) {
    case "today":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      );
    case "world":
      return (
        <svg {...common}>
          <path d="M3 11l9-7 9 7" />
          <path d="M5 10v10h14V10" />
          <path d="M10 20v-5h4v5" />
        </svg>
      );
    case "progress":
      return (
        <svg {...common}>
          <path d="M3 20h18" />
          <path d="M4 16l5-5 4 3 7-7" />
        </svg>
      );
    case "you":
      return (
        <svg {...common}>
          <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
        </svg>
      );
    case "setup":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      );
  }
}

export function CareRoute({ onBackToPlay, onBackToTitle, onStartSession, onShowHealthWorkerView }: CareRouteProps) {
  const [nav, setNav] = useState(readNav);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const { open } = useAlerts();
  const { active } = useProfile();
  const possessive = personWords(active.person).possessive;
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(NAV_KEY, JSON.stringify(nav));
    } catch {
      // not remembering the tab is fine
    }
  }, [nav]);

  const TABS: { id: TabId; label: string; short: string }[] = [
    { id: "today", label: "Today", short: "Today" },
    // the person's world, in their own words: "Her world", "Kamala's world", "Their world"
    { id: "world", label: `${possessive.charAt(0).toUpperCase()}${possessive.slice(1)} world`, short: "World" },
    { id: "progress", label: "Progress", short: "Progress" },
    { id: "you", label: "You", short: "You" },
    { id: "setup", label: "Setup", short: "Setup" },
  ];

  function goTab(tab: TabId) {
    setNav((n) => ({ ...n, tab }));
    scroller.current?.scrollTo({ top: 0 });
  }

  const segment = (tab: SegmentedTab): SegmentId => nav.segments[tab] ?? SEGMENTS[tab][0].id;
  const setSegment = (tab: SegmentedTab, id: SegmentId) => setNav((n) => ({ ...n, segments: { ...n.segments, [tab]: id } }));

  const needsYou = open.length > 0;

  return (
    <div ref={scroller} className="theme-care h-full w-full overflow-y-auto overflow-x-hidden bg-[var(--parchment2)]">
      <header className="sticky top-0 z-30 border-b-2 border-[var(--parchment2)] bg-[var(--parchment)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:px-6">
          <p className="flex shrink-0 items-center gap-2 text-base text-[var(--ink)]">
            <span className="font-pixel text-sm">LOOM</span>
            <span aria-hidden>·</span>
            <span>Care Console</span>
          </p>

          <nav aria-label="Care console" className="order-3 hidden w-full lg:order-2 lg:block lg:w-auto sm:block">
            <ul className="flex flex-wrap gap-1 rounded-[6px] bg-[var(--parchment2)] p-1">
              {TABS.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => goTab(t.id)}
                    aria-current={nav.tab === t.id ? "page" : undefined}
                    className={`rounded-[6px] border-2 px-3 py-2 text-base font-medium transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)] ${
                      nav.tab === t.id
                        ? "border-[var(--ink-soft)] bg-[var(--parchment)] text-[var(--ink)]"
                        : "border-transparent text-[var(--ink-soft)] hover:text-[var(--ink)]"
                    }`}
                  >
                    {t.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="order-2 ml-auto flex flex-wrap items-center justify-end gap-2 lg:order-3">
            <button
              onClick={() => setAlertsOpen(true)}
              aria-haspopup="dialog"
              // semantic colour (terracotta / good), kept apart from the single gold accent and always paired with the words
              className={`flex items-center gap-2 rounded-[6px] border-2 px-3 py-2 text-base transition hover:brightness-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)] ${
                needsYou
                  ? "border-[var(--terracotta)] bg-[var(--terracotta-soft)] font-semibold text-[var(--terracotta-ink)]"
                  : "border-[var(--good)] bg-[var(--good-soft)] text-[var(--good-ink)]"
              }`}
            >
              <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${needsYou ? "bg-[var(--terracotta)]" : "bg-[var(--good)]"}`} />
              {needsYou ? "Needs you" : "Nothing needs you"}
            </button>
            <StartSessionButton
              onHandOver={onStartSession}
              className="rounded-[6px] bg-[var(--accent)] px-4 py-2 text-base font-bold text-[var(--on-accent)] shadow-[0_3px_0_var(--accent-shadow)] transition hover:bg-[var(--accent-hover)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)] active:translate-y-0.5"
            />
          </div>
        </div>
      </header>

      <main key={nav.tab} className="animate-crossfade pb-28 sm:pb-6">
        {nav.tab === "today" && (
          <TodayScreen onStartSession={onStartSession} onOpenAlerts={() => setAlertsOpen(true)} onOpenProgress={() => goTab("progress")} />
        )}

        {nav.tab === "world" && (
          <Segmented tab="world" value={segment("world")} onChange={setSegment}>
            {segment("world") === "people" && <PeoplePanel />}
            {segment("world") === "photos" && <PhotosPanel />}
            {segment("world") === "album" && <AlbumPanel />}
          </Segmented>
        )}

        {nav.tab === "progress" && (
          <Segmented tab="progress" value={segment("progress")} onChange={setSegment}>
            {segment("progress") === "trends" && <TrendsPanel />}
            {segment("progress") === "assessments" && <RudasPanel />}
          </Segmented>
        )}

        {nav.tab === "you" && <HowAreYouPanel />}

        {nav.tab === "setup" && (
          <Segmented tab="setup" value={segment("setup")} onChange={setSegment}>
            {segment("setup") === "preferences" && <SettingsPanel />}
            {segment("setup") === "community" && <CommunityPackPanel />}
            {segment("setup") === "data" && <YourDataPanel onShowHealthWorkerView={onShowHealthWorkerView} />}
          </Segmented>
        )}
      </main>

      <footer className="border-t-2 border-[var(--parchment2)] bg-[var(--parchment)] pb-24 sm:pb-0">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <div className="ml-auto flex flex-wrap gap-2">
            <button onClick={onBackToPlay} className="rounded-[6px] px-3 py-2 text-sm text-[var(--ink-soft)] underline underline-offset-2 hover:bg-[var(--parchment2)]">
              Back to the village
            </button>
            {onBackToTitle && (
              <button onClick={onBackToTitle} className="rounded-[6px] px-3 py-2 text-sm text-[var(--ink-soft)] underline underline-offset-2 hover:bg-[var(--parchment2)]">
                Title screen
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* phones: the five tabs become a bottom bar */}
      <nav aria-label="Care console" className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-[var(--parchment2)] bg-[var(--parchment)] sm:hidden">
        <ul className="grid grid-cols-5">
          {TABS.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => goTab(t.id)}
                aria-current={nav.tab === t.id ? "page" : undefined}
                className={`flex w-full flex-col items-center gap-0.5 px-1 pb-3 pt-2 text-sm focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[var(--focus)] ${
                  nav.tab === t.id ? "font-semibold text-[var(--ink)]" : "text-[var(--ink-soft)]"
                }`}
              >
                <span className={`rounded-[6px] px-3 py-0.5 ${nav.tab === t.id ? "bg-[var(--accent)] text-[var(--on-accent)]" : ""}`}>
                  <Icon tab={t.id} />
                </span>
                {t.short}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {alertsOpen && (
        <Drawer label="Alerts" onClose={() => setAlertsOpen(false)}>
          <AlertsPanel />
        </Drawer>
      )}
    </div>
  );
}

function Segmented({
  tab,
  value,
  onChange,
  children,
}: {
  tab: SegmentedTab;
  value: SegmentId;
  onChange: (tab: SegmentedTab, id: SegmentId) => void;
  children: ReactNode;
}) {
  return (
    <>
      <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
        <div role="group" aria-label="Section" className="inline-flex max-w-full flex-wrap gap-1 rounded-[6px] border-2 border-[var(--parchment2)] bg-[var(--parchment)] p-1">
          {SEGMENTS[tab].map((s) => (
            <button
              key={s.id}
              onClick={() => onChange(tab, s.id)}
              aria-pressed={value === s.id}
              className={`rounded-[6px] px-3 py-1.5 text-base font-medium focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)] ${
                value === s.id ? "bg-[var(--ink)] text-[var(--parchment)]" : "text-[var(--ink-soft)] hover:bg-[var(--parchment2)]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div key={value} className="animate-crossfade">
        {children}
      </div>
    </>
  );
}
