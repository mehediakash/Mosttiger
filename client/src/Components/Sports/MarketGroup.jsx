// components/MarketGroup.jsx
import MarketButton from "./MarketButton";

export default function MarketGroup({ markets = [], more }) {
  return (
    <div className="flex items-center gap-2">
      {markets.map(m => (
        <MarketButton key={m.key} value={m.value} disabled={m.value === "-"} />
      ))}

      <button className="text-xs text-sky-400 font-semibold">
        +{more}
      </button>
    </div>
  );
}
