import { TRIAGE_WORD, type Triage } from "../../game/trajectory/trajectory";

const DOT: Record<Triage, string> = {
  refer: "bg-[#b4432f]",
  monitor: "bg-[#a87a12]",
  continue: "bg-[#4f7d4f]",
  // no colour and no ranking before a baseline exists
  wait: "bg-transparent border-2 border-[#8c7d6a]",
};

/** Colour is never the only signal: every mark carries its word. */
export function TriageMark({ triage, extra }: { triage: Triage; extra?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden className={`inline-block h-3.5 w-3.5 shrink-0 rounded-full ${DOT[triage]}`} />
      <span className="text-base font-bold tracking-wide text-[#1d2340]">
        {TRIAGE_WORD[triage]}
        {extra && <span className="font-normal text-[#4a5170]"> · {extra}</span>}
      </span>
    </span>
  );
}
