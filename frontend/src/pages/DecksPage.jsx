import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DecksApi, LanguagesApi } from "../api/endpoints";
import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import { useActivePair } from "../context/ActivePairContext";

function extractError(e) {
  if (e?.response?.data) return JSON.stringify(e.response.data);
  return e?.message ?? "Request failed";
}

function langLabel(l) {
  if (!l) return "?";
  return `${l.name}${l.code ? ` (${l.code})` : ""}`;
}

export default function DecksPage() {
  const nav = useNavigate();
  const { activePair, loading: activePairLoading } = useActivePair();
  const [page, setPage] = useState(null);
  const [languages, setLanguages] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [sourceLangId, setSourceLangId] = useState("");
  const [targetLangId, setTargetLangId] = useState("");
  const [creating, setCreating] = useState(false);

  const langById = useMemo(() => {
    const m = new Map();
    for (const l of languages) m.set(l.id, l);
    return m;
  }, [languages]);

  async function load() {
    if (!activePair?.id) {
      setPage({ items: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [decksRes, langsRes] = await Promise.all([
        DecksApi.list(50, 0, { pair_id: activePair.id }),
        LanguagesApi.list(),
      ]);

      setPage(decksRes.data);

      const langs = langsRes.data ?? [];
      setLanguages(langs);

      if (activePair && !sourceLangId && !targetLangId) {
        setSourceLangId(String(activePair.source_language_id));
        setTargetLangId(String(activePair.target_language_id));
      }
    } catch (e) {
      setError(extractError(e));
    } finally {
      setLoading(false);
    }
  }

  async function createDeck(e) {
    e.preventDefault();

    if (!activePair) {
      setError("Select an active learning pair before creating a deck.");
      return;
    }

    const s = Number(activePair.source_language_id);
    const t = Number(activePair.target_language_id);
    if (!name.trim()) return;
    if (!(s > 0 && t > 0 && s !== t)) {
      setError("Please choose two different languages.");
      return;
    }

    setCreating(true);
    setError("");
    try {
      await DecksApi.create({
        name: name.trim(),
        source_language_id: s,
        target_language_id: t,
        deck_type: "users",
      });
      setName("");
      await load();
    } catch (e) {
      setError(extractError(e));
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    if (activePairLoading) {
      setLoading(true);
      return;
    }
    if (!activePair?.id) {
      setPage({ items: [] });
      setLoading(false);
      setError("");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePair?.id, activePairLoading]);

  useEffect(() => {
    if (!activePair) return;
    setSourceLangId(String(activePair.source_language_id));
    setTargetLangId(String(activePair.target_language_id));
  }, [activePair]);

  const activeLearning = activePair ? langById.get(activePair.source_language_id) : null;
  const activeTranslation = activePair ? langById.get(activePair.target_language_id) : null;
  const decks = page?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Decks</h1>
        <p className="mt-1 text-sm text-gray-500">
          Cards format: Learning (front) to Translation (back)
        </p>
        {activePair ? (
          <p className="mt-2 text-sm text-gray-700">
            Active pair: <span className="font-semibold">{langLabel(activeLearning)}</span> to{" "}
            <span className="font-semibold">{langLabel(activeTranslation)}</span>
          </p>
        ) : null}
      </div>

      <Card>
        <h2 className="text-lg font-semibold">Create deck</h2>
        {!activePair ? (
          <p className="mt-2 text-sm text-gray-600">Choose an active pair first to create a deck.</p>
        ) : (
          <p className="mt-2 text-sm text-gray-600">Deck language is fixed to the active pair.</p>
        )}
        <form onSubmit={createDeck} className="mt-4 grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm text-gray-700">Deck name</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm text-gray-700">Learning language</span>
              <select
                value={sourceLangId}
                onChange={(e) => setSourceLangId(e.target.value)}
                disabled
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
              >
                <option value="" disabled>
                  Select...
                </option>
                {languages.map((l) => (
                  <option key={l.id} value={l.id}>
                    {langLabel(l)}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm text-gray-700">Translation language</span>
              <select
                value={targetLangId}
                onChange={(e) => setTargetLangId(e.target.value)}
                disabled
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
              >
                <option value="" disabled>
                  Select...
                </option>
                {languages.map((l) => (
                  <option key={l.id} value={l.id}>
                    {langLabel(l)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <Button variant="primary" type="submit" disabled={creating || !activePair}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </Card>

      {error ? (
        <pre className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</pre>
      ) : null}

      {loading || activePairLoading ? (
        <p className="text-sm text-gray-500">Loading decks...</p>
      ) : !activePair ? (
        <Card>
          <p className="text-sm text-gray-600">Select an active pair to view decks.</p>
        </Card>
      ) : (
        decks.length === 0 ? (
          <Card>
            <p className="text-sm text-gray-600">
              No decks yet for the active pair. Create your first deck for this language pair.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {decks.map((d) => {
            const s = langById.get(d.source_language_id);
            const t = langById.get(d.target_language_id);
            const cardsCount = d.cards_count ?? d.cardsCount ?? null;

            return (
              <Card key={d.id} className="transition-shadow hover:shadow-md">
                <div className="flex h-full flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">{d.name}</h3>
                    <p className="text-sm text-gray-700">
                      {s?.code || d.source_language_id} to {t?.code || d.target_language_id}
                    </p>
                    <p className="text-sm text-gray-500">
                      Cards: {cardsCount == null ? "-" : cardsCount}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="primary" onClick={() => nav(`/app/decks/${d.id}`)}>
                      Open
                    </Button>
                    <Button variant="secondary" onClick={() => nav(`/app/study/${d.id}`)}>
                      Study
                    </Button>
                  </div>
                </div>
              </Card>
            );
            })}
          </div>
        )
      )}
    </div>
  );
}
