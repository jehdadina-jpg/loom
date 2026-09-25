interface DiscoveryBadgeProps {
  found: number;
  total: number;
  textScale?: number;
}

export function DiscoveryBadge({ found, total, textScale = 1 }: DiscoveryBadgeProps) {
  return (
    <div
      className="pointer-events-none absolute left-4 top-16 z-10 flex items-center gap-2 rounded-xl px-3 py-2 text-[#f7ecd2] shadow-lg"
      aria-label={`${found} of ${total} little discoveries found`}
      style={{
        background: "linear-gradient(135deg, rgba(50,35,23,0.94), rgba(91,58,31,0.9))",
        border: "2px solid rgba(244,202,112,0.7)",
        boxShadow: "0 3px 0 rgba(28,18,11,0.5), 0 8px 18px rgba(0,0,0,0.24)",
        fontSize: 12 * textScale,
      }}
    >
      <span className="text-[#f4c861]" aria-hidden>
        ✦
      </span>
      <span>
        <strong className="font-semibold">Little discoveries</strong>
        <span className="ml-2 text-[#f7ecd2]/80">
          {found}/{total}
        </span>
      </span>
    </div>
  );
}