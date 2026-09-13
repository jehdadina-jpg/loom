import { useEffect, useState } from "react";
import { PlayRoute } from "./routes/play/PlayRoute";
import { CareRoute } from "./routes/care/CareRoute";
import { TitleScreen } from "./routes/title/TitleScreen";
import { TelemetryProvider } from "./game/telemetry/store";
import { SettingsProvider, useSettings } from "./game/state/SettingsContext";
import { SessionProvider, useSession } from "./game/session/SessionContext";
import { ProfileProvider } from "./game/profiles/ProfileContext";
import { PhotoProvider } from "./game/photos/PhotoLibrary";
import { speechEngine } from "./game/speech/SpeechEngine";

type View = "title" | "play" | "care";

function Shell() {
  const [view, setView] = useState<View>("title");
  const { settings } = useSettings();
  const { setLastLocation, restartGuide } = useSession();

  // narration preference is global, so the engine follows the setting wherever we are
  useEffect(() => {
    speechEngine.setEnabled(settings.narration);
  }, [settings.narration]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0b140e]">
      {view === "title" && (
        <TitleScreen
          onPlay={() => setView("play")}
          onContinue={() => {
            restartGuide();
            setLastLocation("path");
            setView("play");
          }}
          onCaregiver={() => setView("care")}
        />
      )}
      {view === "play" && <PlayRoute onRequestCaregiver={() => setView("care")} />}
      {view === "care" && <CareRoute onBackToPlay={() => setView("play")} onBackToTitle={() => setView("title")} />}
    </div>
  );
}

export default function App() {
  return (
    <ProfileProvider>
      <SettingsProvider>
        <SessionProvider>
          <PhotoProvider>
            <TelemetryProvider>
              <Shell />
            </TelemetryProvider>
          </PhotoProvider>
        </SessionProvider>
      </SettingsProvider>
    </ProfileProvider>
  );
}
