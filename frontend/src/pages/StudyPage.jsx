import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { DecksApi, StudyApi } from "../api/endpoints";
import Button from "../components/Button";
import Card from "../components/Card";
import { useActivePair } from "../context/ActivePairContext";

function extractError(e) {
  if (e?.response?.data) return JSON.stringify(e.response.data);
  return e?.message ?? "Request failed";
}

export default function StudyPage() {
  const { deckId } = useParams();
  const id = Number(deckId);
  const { activePair } = useActivePair();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deckName, setDeckName] = useState("");

  const [batch, setBatch] = useState(null);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const current = useMemo(() => batch?.cards?.[idx] ?? null, [batch, idx]);
  const remaining = useMemo(() => {
    if (!batch?.cards?.length) return 0;
    return Math.max(0, batch.cards.length - idx - 1);
  }, [batch, idx]);

  async function loadBatch() {
    setLoading(true);
    setError("");
    setBatch(null);
    setIdx(0);
    setRevealed(false);

    try {
      const res = await StudyApi.next(id);
      setBatch(res.data);
    } catch (e) {
      setError(extractError(e));
    } finally {
      setLoading(false);
    }
  }

  async function answer(learned) {
    if (!current) return;
    setBusy(true);
    setError("");

    try {
      await StudyApi.answer(current.id, learned);

      const nextIndex = idx + 1;
      if (batch && nextIndex < batch.cards.length) {
        setIdx(nextIndex);
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

  useEffect(() => {
    async function loadDeck() {
      if (!activePair?.id) {
        setDeckName("");
        setError("No active learning pair selected.");
        setLoading(false);
        return;
      }

      try {
        const decksRes = await DecksApi.list(200, 0, { pair_id: activePair.id });
        const pairDecks = decksRes.data?.items ?? [];
        const match = pairDecks.find((deck) => Number(deck.id) === id) ?? null;

        if (!match) {
          setDeckName("");
          setError("This deck is not available for the active pair.");
          setLoading(false);
          return;
        }

        setDeckName(match.name || "");
      } catch (e) {
        setDeckName("");
        setError(extractError(e));
        setLoading(false);
        return;
      }

      await loadBatch();
    }

    if (id > 0) {
      loadDeck();
    } else {
      setError("Invalid deck id.");
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, activePair?.id]);

  return (
    <div className="mx-auto w-full max-w-md space-y-4 pb-8">
      <div className="rounded-xl border border-gray-200 bg-white p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="h-11 w-11" />
          <div className="text-center">
            <p className="text-xs text-gray-500">Study</p>
            <p className="text-sm font-medium text-gray-900">{deckName || `Deck #${id}`}</p>
          </div>
          <div className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700">
            {idx + 1} / {batch?.cards?.length ?? 0}
          </div>
        </div>
      </div>

      {loading ? <p className="text-center text-sm text-gray-500">Loading cards...</p> : null}

      {error ? (
        <pre className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</pre>
      ) : null}

      {!loading && current ? (
        <div className="space-y-5">
          <div className="relative mx-3 mt-2">
            <div className="pointer-events-none absolute inset-x-3 top-3 h-full rounded-2xl border border-gray-200 bg-gray-50" />
            <div className="pointer-events-none absolute inset-x-1 top-1 h-full rounded-2xl border border-gray-200 bg-gray-100" />
            <Card className="relative rounded-2xl px-6 py-8 text-center shadow-sm">
              <div className="flex min-h-[220px] items-center justify-center">
                {!revealed ? (
                  <div className="space-y-4">
                    <p className="text-4xl font-bold leading-tight text-black">{current.front}</p>
                    {current.example_sentence ? (
                      <p className="text-sm text-gray-500">{current.example_sentence}</p>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Front</p>
                    <p className="text-3xl font-bold leading-tight text-black">{current.front}</p>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Back</p>
                    <p className="text-2xl font-semibold leading-tight text-gray-900">{current.back}</p>
                    {current.example_sentence ? (
                      <p className="text-sm text-gray-600">{current.example_sentence}</p>
                    ) : null}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {!revealed ? (
            <Button variant="primary" onClick={() => setRevealed(true)} disabled={busy} className="w-full">
              Reveal Answer
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={() => answer(false)} disabled={busy} className="w-full">
                Didn&apos;t know
              </Button>
              <Button variant="primary" onClick={() => answer(true)} disabled={busy} className="w-full">
                Knew it
              </Button>
            </div>
          )}

          <p className="text-center text-xs text-gray-500">Remaining in this batch: {remaining}</p>
        </div>
      ) : null}

      {!loading && !current && !error ? (
        <Card className="text-center">
          <h2 className="text-lg font-semibold">No studyable cards</h2>
          <p className="mt-1 text-gray-700">No cards available for this deck in the active pair.</p>
          <Button className="mt-4 w-full" variant="primary" onClick={loadBatch}>
            Load next batch
          </Button>
        </Card>
      ) : null}
    </div>
  );
}
