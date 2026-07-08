import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { DecksApi, StudyApi } from "../api/endpoints";
import { useActivePair } from "../context/ActivePairContext";
import Button from "../components/Button";
import ProgressBar from "../components/ProgressBar";

function extractError(e) {
  if (e?.response?.data) return JSON.stringify(e.response.data);
  return e?.message ?? "Request failed";
}

export default function StudyPage() {
  const { deckId } = useParams();
  const id = Number(deckId);
  const urlSourceId = Number(new URLSearchParams(window.location.search).get("sourceId") || 0);

  const { activePair } = useActivePair();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [batch, setBatch] = useState(null);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [deckName, setDeckName] = useState("");

  const current = useMemo(() => batch?.cards?.[idx] ?? null, [batch, idx]);
  const remaining = useMemo(() => {
    if (!batch?.cards?.length) return 0;
    return Math.max(0, batch.cards.length - idx - 1);
  }, [batch, idx]);

  const progress = batch?.cards?.length ? Math.round(((idx) / batch.cards.length) * 100) : 0;

  // Keyboard support: Space = flip, K = I Know, D = I Don't Know
  const handleKey = useCallback((e) => {
    if (busy || !current) return;

    if (!revealed && (e.key === " " || e.key === "Enter")) {
      e.preventDefault();
      setRevealed(true);
      return;
    }

    if (revealed) {
      const key = e.key.toLowerCase();
      if (key === "k") {
        e.preventDefault();
        doAnswer(3); // I Know (positive recall)
      } else if (key === "d") {
        e.preventDefault();
        doAnswer(0); // I Don't Know (negative)
      }
    }

    if (e.key.toLowerCase() === "r") {
      // reload batch
      loadBatch();
    }
  }, [revealed, current, busy]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  async function loadBatch() {
    setLoading(true);
    setError("");
    setBatch(null);
    setIdx(0);
    setRevealed(false);

    try {
      const params = urlSourceId > 0 ? { reading_source_id: urlSourceId } : {};
      const res = await StudyApi.next(id, params);
      setBatch(res.data || res); // support both
    } catch (e) {
      setError(extractError(e));
    } finally {
      setLoading(false);
    }
  }

  async function doAnswer(quality) {
    if (!current) return;
    setBusy(true);
    setError("");

    try {
      // Support both answer and submit shapes
      if (StudyApi.submit) {
        await StudyApi.submit(current.id, { quality });
      } else {
        await StudyApi.answer(current.id, quality > 2);
      }

      const nextIdx = idx + 1;
      if (batch && nextIdx < batch.cards?.length) {
        setIdx(nextIdx);
        setRevealed(false);
      } else {
        await loadBatch();
      }
    } catch (e) {
      setError(extractError(e));
    } finally {
      setBusy(false);
    }
  }

  // Load deck + first batch
  useEffect(() => {
    async function init() {
      if (id <= 0) {
        setError("Invalid deck id");
        setLoading(false);
        return;
      }
      try {
        const decksRes = await DecksApi.list(50, 0, { pair_id: activePair?.id });
        const decks = decksRes.data?.items || [];
        const match = decks.find(d => d.id === id);
        if (match) setDeckName(match.name || "Deck");

        await loadBatch();
      } catch (e) {
        setError(extractError(e));
        setLoading(false);
      }
    }
    if (activePair) init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, urlSourceId, activePair?.id]);

  const card = current;

  // Nice flip card with CSS
  const FlipCard = ({ front, back, revealed: isRevealed, onFlip }) => (
    <div 
      className="relative h-[320px] w-full cursor-pointer perspective-1000" 
      onClick={onFlip}
    >
      <div 
        className={`relative h-full w-full rounded-3xl shadow-2xl transition-transform duration-500 preserve-3d ${isRevealed ? 'rotate-y-180' : ''}`}
      >
        {/* Front */}
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-white p-8 text-center backface-hidden">
          <div className="text-xs uppercase tracking-[2px] text-zinc-500 mb-3">Recall</div>
          <div className="text-5xl font-semibold tracking-tight leading-tight break-words">
            {front}
          </div>
          <div className="mt-6 text-xs text-zinc-400">Tap or press SPACE to flip</div>
        </div>

        {/* Back */}
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-white p-8 text-center rotate-y-180 backface-hidden">
          <div className="text-xs uppercase tracking-[2px] text-emerald-600 mb-2">Answer</div>
          <div className="text-4xl font-semibold tracking-tight">{front}</div>
          <div className="mt-3 text-3xl text-zinc-800">{back}</div>
          {card?.source_sentence && (
            <div className="mt-4 max-w-[85%] text-sm text-zinc-500 italic line-clamp-3">
              “{card.source_sentence}”
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto px-4 py-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="text-sm text-zinc-500">Reading Review</div>
          <div className="font-semibold text-xl">{deckName || "Session"}</div>
        </div>
        <div className="text-right text-xs text-zinc-500">
          {idx + 1} / {batch?.cards?.length || 0} <br /> remaining: {remaining}
        </div>
      </div>

      {/* Progress */}
      {batch?.cards?.length > 0 && (
        <div className="mb-6">
          <ProgressBar value={progress} max={100} fillClassName="bg-zinc-900" />
        </div>
      )}

      {loading && <div className="text-center py-12 text-zinc-400">Loading cards…</div>}

      {error && (
        <div className="rounded-2xl bg-red-50 p-4 text-red-700 text-sm mb-4">{error}</div>
      )}

      {!loading && card && (
        <div className="space-y-6">
          <FlipCard 
            front={card.front} 
            back={card.back} 
            revealed={revealed} 
            onFlip={() => !busy && setRevealed(!revealed)} 
          />

          {!revealed ? (
            <Button 
              onClick={() => setRevealed(true)} 
              disabled={busy} 
              className="w-full py-6 text-lg"
            >
              Reveal (space)
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <button
                  disabled={busy}
                  onClick={() => doAnswer(3)}
                  className="rounded-3xl py-8 text-xl font-semibold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white transition active:scale-[0.985] disabled:opacity-60"
                >
                  I Know
                </button>
                <button
                  disabled={busy}
                  onClick={() => doAnswer(0)}
                  className="rounded-3xl py-8 text-xl font-semibold bg-red-100 hover:bg-red-200 active:bg-red-300 text-red-700 transition active:scale-[0.985] disabled:opacity-60"
                >
                  I Don't Know
                </button>
              </div>
              <p className="text-xs text-center text-zinc-400">Space = flip • K = I Know • D = I Don't Know • R = reload</p>
            </div>
          )}
        </div>
      )}

      {!loading && !card && !error && (
        <div className="rounded-3xl border p-8 text-center">
          <div className="text-2xl mb-2">🎉</div>
          <div className="font-semibold">Session complete</div>
          <p className="text-sm text-zinc-500 mt-1">Great work! Come back later for more reviews.</p>
          <Button onClick={loadBatch} className="mt-6">Load more</Button>
        </div>
      )}
    </div>
  );
}
