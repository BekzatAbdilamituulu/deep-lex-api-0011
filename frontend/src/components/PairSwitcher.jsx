import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useActivePair } from "../context/ActivePairContext";

function readLang(pair, side) {
  if (!pair) return "?";

  if (side === "source") {
    return (
      pair.source_language_name ||
      pair.learning_language_name ||
      pair.source_language?.name ||
      pair.source_language?.code ||
      pair.source_language_id ||
      "?"
    );
  }

  return (
    pair.target_language_name ||
    pair.native_language_name ||
    pair.target_language?.name ||
    pair.target_language?.code ||
    pair.target_language_id ||
    "?"
  );
}

function pairLabel(pair) {
  return `${readLang(pair, "source")} → ${readLang(pair, "target")}`;
}

export default function PairSwitcher() {
  const { pairs, activePair, loading, setActivePair } = useActivePair();
  const [switching, setSwitching] = useState(false);

  const disabled = loading || switching;
  const activeLabel = useMemo(() => (activePair ? pairLabel(activePair) : null), [activePair]);

  async function onChange(event) {
    const pairId = event.target.value;
    if (!pairId) return;
    if (String(activePair?.id) === String(pairId)) return;

    setSwitching(true);
    try {
      await setActivePair(pairId);
    } finally {
      setSwitching(false);
    }
  }

  if (!pairs?.length) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-600">
        <p>No learning pairs yet.</p>
        <div className="mt-3">
          <Link
            to="/app/pairs/new"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-gray-50"
          >
            Add Pair
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Active pair</p>
      <p className="mt-1 text-sm font-medium text-gray-900">{activeLabel || "No active pair selected"}</p>

      <select
        className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black disabled:cursor-not-allowed disabled:opacity-60"
        value={activePair?.id ? String(activePair.id) : ""}
        onChange={onChange}
        disabled={disabled}
      >
        {!activePair ? (
          <option value="" disabled>
            Select a pair
          </option>
        ) : null}
        {pairs.map((pair) => (
          <option key={pair.id} value={pair.id}>
            {pairLabel(pair)}
          </option>
        ))}
      </select>

      <div className="mt-3">
        <Link
          to="/app/pairs/new"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-gray-50"
        >
          Add Pair
        </Link>
      </div>
    </div>
  );
}
