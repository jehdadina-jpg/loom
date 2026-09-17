import { useRef, useState } from "react";
import { useSettings } from "../../game/state/SettingsContext";
import { useSession } from "../../game/session/SessionContext";

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
      <span>
        <span className="block font-medium text-slate-800">{label}</span>
        <span className="block text-sm text-slate-500">{hint}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 ${
          checked ? "bg-emerald-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-6" : "left-1"}`}
        />
      </button>
    </label>
  );
}

export function SettingsPanel() {
  const { settings, update, reset } = useSettings();
  const { restartGuide } = useSession();
  const [recording, setRecording] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    setRecError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        const reader = new FileReader();
        reader.onload = () => {
          update({
            familyVoiceUrl: reader.result as string,
            familyVoiceLabel: settings.familyVoiceLabel ?? "A Voice from Family",
          });
        };
        reader.readAsDataURL(blob);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      // keep recordings short so they fit comfortably in local storage
      window.setTimeout(() => {
        if (recorderRef.current?.state === "recording") stopRecording();
      }, 30000);
    } catch {
      setRecError("Microphone unavailable. Check the browser's permission for this site.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Setup</h1>
        <p className="text-slate-500">Adjust how the village looks, sounds and guides — changes apply immediately.</p>
      </header>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-slate-800">Reading &amp; comfort</h2>
        <p className="mb-3 text-slate-600">How large and how clear everything looks and sounds on the patient side.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <span className="block font-medium text-slate-800">Text size</span>
            <span className="mb-3 block text-sm text-slate-500">Larger text throughout the game</span>
            <div className="flex gap-2">
              {[
                { label: "Regular", value: 1 },
                { label: "Large", value: 1.15 },
                { label: "Largest", value: 1.3 },
              ].map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => update({ textScale: opt.value })}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    settings.textScale === opt.value
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <Toggle
            label="Stronger contrast"
            hint="Deepens the scene edges so figures stand out more"
            checked={settings.highContrast}
            onChange={(v) => update({ highContrast: v })}
          />
          <Toggle
            label="Reduce movement"
            hint="Stills the water, animals and gentle idle motion"
            checked={settings.reducedMotion}
            onChange={(v) => update({ reducedMotion: v })}
          />
          <Toggle
            label="Ambient sound"
            hint="Soft birds, water and village air. No alerts or buzzers, ever."
            checked={settings.audioEnabled}
            onChange={(v) => update({ audioEnabled: v })}
          />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-slate-800">The village clock &amp; weather</h2>
        <p className="mb-3 text-slate-600">What time of day and what weather the village shows.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <span className="block font-medium text-slate-800">Time of day</span>
            <span className="mb-3 block text-sm text-slate-500">
              The whole village shares one sky — sunrise, midday, golden hour, night.
            </span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Slow cycle", value: "cycle" as const, hint: "A full day every few minutes" },
                { label: "Match real time", value: "real" as const, hint: "Follows the clock" },
                { label: "Always daytime", value: "fixed-day" as const, hint: "Bright and even" },
                { label: "Golden hour", value: "fixed-golden" as const, hint: "Warm and calm" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => update({ timeMode: opt.value })}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                    settings.timeMode === opt.value
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className="block font-medium">{opt.label}</span>
                  <span className="block text-sm text-slate-500">{opt.hint}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <span className="block font-medium text-slate-800">Weather</span>
            <span className="mb-3 block text-sm text-slate-500">Rain and mist are gentle and silent — no thunder.</span>
            <div className="flex gap-2">
              {[
                { label: "Clear", value: "clear" as const },
                { label: "Light rain", value: "rain" as const },
                { label: "Morning mist", value: "mist" as const },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => update({ weather: opt.value })}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    settings.weather === opt.value
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-slate-800">Guidance</h2>
        <p className="mb-3 text-slate-600">How much the app helps along the way, and whether it adapts on its own.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle
            label="Guided session"
            hint="Suggests one gentle next step at a time. Always optional."
            checked={settings.guideMode}
            onChange={(v) => update({ guideMode: v })}
          />
          <Toggle
            label="Read aloud"
            hint="Speaks prompts, dialogue and photo captions in a slow, calm voice."
            checked={settings.narration}
            onChange={(v) => update({ narration: v })}
          />
          <Toggle
            label="Adapt to how much help is needed"
            hint="Shows fewer choices after a round that needed lots of help, more after one that needed little. Every change is explained on the Alerts page."
            checked={settings.adaptiveDifficulty}
            onChange={(v) => update({ adaptiveDifficulty: v })}
          />
          <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
            <span>
              <span className="block font-medium text-slate-800">Start the visit again</span>
              <span className="block text-sm text-slate-500">Returns the guide to its first suggestion</span>
            </span>
            <button
              onClick={restartGuide}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Restart
            </button>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-1 text-lg font-semibold text-slate-800">Family voice note</h2>
        <p className="mb-3 text-sm text-slate-500">
          Record a short message from someone they love. It appears only at the water point, as something to listen to —
          never as a task. Up to 30 seconds, stored on this device.
        </p>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-3">
            {!recording ? (
              <button
                onClick={startRecording}
                className="rounded-lg bg-rose-600 px-4 py-2 font-medium text-white hover:bg-rose-700"
              >
                Record a message
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="rounded-lg bg-slate-800 px-4 py-2 font-medium text-white hover:bg-slate-700"
              >
                Stop recording
              </button>
            )}
            {settings.familyVoiceUrl && (
              <>
                <audio controls src={settings.familyVoiceUrl} className="h-10" />
                <button
                  onClick={() => update({ familyVoiceUrl: null, familyVoiceLabel: null })}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Remove
                </button>
              </>
            )}
          </div>
          {settings.familyVoiceUrl && (
            <label className="mt-4 block">
              <span className="block text-sm text-slate-600">Label shown in the game</span>
              <input
                value={settings.familyVoiceLabel ?? ""}
                onChange={(e) => update({ familyVoiceLabel: e.target.value })}
                placeholder="e.g. Bimal's message"
                className="mt-1 w-full max-w-sm rounded-lg border border-slate-200 px-3 py-2 text-slate-800 focus:border-emerald-500 focus:outline-none"
              />
            </label>
          )}
          {recording && <p className="mt-3 text-sm text-rose-600">Recording… speak now, then press stop.</p>}
          {recError && <p className="mt-3 text-sm text-rose-600">{recError}</p>}
          {!settings.familyVoiceUrl && !recording && (
            <p className="mt-3 text-sm text-slate-500">
              No voice note yet — the option stays hidden in the game until one is recorded.
            </p>
          )}
        </div>
      </section>

      <button onClick={reset} className="text-sm text-slate-500 underline underline-offset-2 hover:text-slate-700">
        Reset all settings to defaults
      </button>
    </div>
  );
}
