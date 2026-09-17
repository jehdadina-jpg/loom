import { useCallback, useEffect, useState } from "react";
import { PlayRoute } from "./routes/play/PlayRoute";
import { CareRoute } from "./routes/care/CareRoute";
import { AshaRoute } from "./routes/asha/AshaRoute";
import { TitleScreen } from "./routes/title/TitleScreen";
import { TelemetryProvider } from "./game/telemetry/store";
import { SettingsProvider, useSettings } from "./game/state/SettingsContext";
import { SessionProvider, useSession } from "./game/session/SessionContext";
import { ProfileProvider } from "./game/profiles/ProfileContext";
import { PhotoProvider } from "./game/photos/PhotoLibrary";
import { speechEngine } from "./game/speech/SpeechEngine";
import { ReminderProvider } from "./game/reminders/ReminderContext";
import { AlertsProvider } from "./game/alerts/AlertsContext";
import { useSyncLoop } from "./game/sync/useSyncStatus";

type View = "title" | "play" | "care" | "asha";

const PATHS: Record<View, string> = { title: "/", play: "/play", care: "/care", asha: "/asha" };

function viewFromPath(): View {
  const found = (Object.entries(PATHS) as [View, string][]).find(([, p]) => p !== "/" && window.location.pathname.startsWith(p));
  return found?.[0] ?? "title";
}

function Shell({ view, go }: { view: Exclude<View, "asha">; go: (v: View) => void }) {
  const { settings } = useSettings();
  const { setLastLocation, restartGuide } = useSession();
  useSyncLoop();

  // narration preference is global, so the engine follows the setting wherever we are
  useEffect(() => {
    speechEngine.setEnabled(settings.narration);
  }, [settings.narration]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0b140e]">
      {view === "title" && (
        <TitleScreen
          onPlay={() => go("play")}
          onContinue={() => {
            restartGuide();
            setLastLocation("path");
            go("play");
          }}
          onCaregiver={() => go("care")}
          onHealthWorker={() => go("asha")}
        />
      )}
      {view === "play" && <PlayRoute onRequestCaregiver={() => go("care")} />}
      {view === "care" && (
        <CareRoute
          onBackToPlay={() => go("play")}
          onBackToTitle={() => go("title")}
          onStartSession={() => go("play")}
          onShowHealthWorkerView={() => go("asha")}
        />
      )}
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>(viewFromPath);

  useEffect(() => {
    const onPop = () => setView(viewFromPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const go = useCallback((v: View) => {
    if (window.location.pathname !== PATHS[v]) window.history.pushState(null, "", PATHS[v]);
    setView(v);
  }, []);

  // The health worker's route sits outside every family data provider. Nothing under it
  // can read profiles, settings, the album, photos, telemetry, reminders or alerts.
  if (view === "asha") {
    return (
      <div className="h-screen w-screen overflow-hidden">
        <AshaRoute onBackToTitle={() => go("title")} />
      </div>
    );
  }

  return (
    <ProfileProvider>
      <SettingsProvider>
        <SessionProvider>
          <PhotoProvider>
            <TelemetryProvider>
              <ReminderProvider>
                <AlertsProvider>
                  <Shell view={view} go={go} />
                </AlertsProvider>
              </ReminderProvider>
            </TelemetryProvider>
          </PhotoProvider>
        </SessionProvider>
      </SettingsProvider>
    </ProfileProvider>
  );
}
