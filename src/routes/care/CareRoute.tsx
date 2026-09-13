import { useState } from "react";
import { CaregiverDashboard } from "../../components/caregiver/Dashboard";
import { AshaDashboard } from "../../components/caregiver/AshaDashboard";
import { AlbumPanel } from "../../components/caregiver/AlbumPanel";
import { SettingsPanel } from "../../components/caregiver/SettingsPanel";
import { PhotosPanel } from "../../components/caregiver/PhotosPanel";
import { PeoplePanel } from "../../components/caregiver/PeoplePanel";

export interface CareRouteProps {
  onBackToPlay: () => void;
  onBackToTitle?: () => void;
}

const TABS = [
  { id: "caregiver", label: "Caregiver" },
  { id: "asha", label: "Health Worker" },
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
          <div className="flex items-center gap-2">
            <span className="font-pixel text-xs text-slate-700">LOOM</span>
            <span className="text-sm text-slate-500">Care Console</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-slate-100 p-1 text-sm">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`rounded-md px-3 py-1.5 font-medium transition ${
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
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Title screen
              </button>
            )}
            <button
              onClick={onBackToPlay}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Back to Game
            </button>
          </div>
        </div>
      </div>

      {tab === "caregiver" && <CaregiverDashboard />}
      {tab === "asha" && <AshaDashboard />}
      {tab === "album" && <AlbumPanel />}
      {tab === "photos" && <PhotosPanel />}
      {tab === "people" && <PeoplePanel />}
      {tab === "settings" && <SettingsPanel />}
    </div>
  );
}
