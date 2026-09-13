import { useState } from "react";
import { CaregiverDashboard } from "../../components/caregiver/Dashboard";
import { AshaDashboard } from "../../components/caregiver/AshaDashboard";
import { AlbumPanel } from "../../components/caregiver/AlbumPanel";
import { SettingsPanel } from "../../components/caregiver/SettingsPanel";
import { PhotosPanel } from "../../components/caregiver/PhotosPanel";
import { PeoplePanel } from "../../components/caregiver/PeoplePanel";
import { TrendsPanel } from "../../components/caregiver/TrendsPanel";

export interface CareRouteProps {
  onBackToPlay: () => void;
  onBackToTitle?: () => void;
}

const TABS = [
  { id: "caregiver", label: "Caregiver" },
  { id: "asha", label: "Health Worker" },
  { id: "trends", label: "Trends" },
  { id: "album", label: "Album" },
  { id: "photos", label: "Photos" },
  { id: "people", label: "People" },
  { id: "settings", label: "Setup" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function CareRoute({ onBackToPlay, onBackToTitle }: CareRouteProps) {
  const [tab, setTab] = useState<TabId>("caregiver");

  return (
    <div className="h-full w-full overflow-y-auto bg-slate-50">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div className="flex shrink-0 items-center gap-2">
            <span className="font-pixel text-xs text-slate-700">LOOM</span>
            <span className="text-sm text-slate-500">Care Console</span>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex min-w-0 flex-nowrap gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 text-sm">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`shrink-0 rounded-md px-3 py-1.5 font-medium transition ${
                    tab === t.id ? "bg-white text-slate-800 shadow" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {onBackToTitle && (
              <button
                onClick={onBackToTitle}
                className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Title screen
              </button>
            )}
            <button
              onClick={onBackToPlay}
              className="shrink-0 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Back to Game
            </button>
          </div>
        </div>
      </div>

      <div key={tab} className="animate-crossfade">
        {tab === "caregiver" && <CaregiverDashboard />}
        {tab === "asha" && <AshaDashboard />}
        {tab === "trends" && <TrendsPanel />}
        {tab === "album" && <AlbumPanel />}
        {tab === "photos" && <PhotosPanel />}
        {tab === "people" && <PeoplePanel />}
        {tab === "settings" && <SettingsPanel />}
      </div>
    </div>
  );
}
