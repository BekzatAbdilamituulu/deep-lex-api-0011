import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DecksApi, LanguagesApi, ProgressApi } from "../api/endpoints";
import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import { useActivePair } from "../context/ActivePairContext";

function extractError(e) {
  const detail = e?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
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

  const [decksPage, setDecksPage] = useState(null);
  const [languages, setLanguages] = useState([]);
  const [progressByDeck, setProgressByDeck] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [toast, setToast] = useState(null);

  const langById = useMemo(() => {
    const m = new Map();
    for (const l of languages) m.set(l.id, l);
    return m;
  }, [languages]);

  const activeLearning = activePair ? langById.get(activePair.source_language_id) : null;
  const activeTranslation = activePair ? langById.get(activePair.target_language_id) : null;

  async function load() {
    if (!activePair?.id) {
      setDecksPage({ items: [], meta: { total: 0, has_more: false, offset: 0, limit: 200 } });
      setProgressByDeck({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [decksRes, langsRes] = await Promise.all([
        DecksApi.list(200, 0, { pair_id: activePair.id }),
        LanguagesApi.list(),
      ]);
      const payload = decksRes.data ?? { items: [] };
      const decks = Array.isArray(payload?.items) ? payload.items : [];
      setDecksPage({ ...payload, items: decks });
      setLanguages(langsRes.data ?? []);

      const progressPairs = await Promise.all(
        decks.map(async (deck) => {
          try {
            const res = await ProgressApi.summary({ pair_id: activePair.id, deck_id: deck.id });
            return [deck.id, res.data];
          } catch {
            return [deck.id, null];
          }
        })
      );
      setProgressByDeck(Object.fromEntries(progressPairs));
    } catch (e) {
      setError(extractError(e));
    } finally {
      setLoading(false);
    }
  }

  async function createDeck(e) {
    e.preventDefault();
    if (!activePair?.id || !name.trim()) return;

    setCreating(true);
    setError("");
    try {
      await DecksApi.create({
        pair_id: activePair.id,
        name: name.trim(),
      });
      setShowCreateModal(false);
      setName("");
      setToast({ message: "Deck created", type: "success" });
      setTimeout(() => setToast(null), 2500);
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
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePair?.id, activePairLoading]);

  const filteredDecks = useMemo(() => {
    const decks = decksPage?.items ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return decks;
    return decks.filter((deck) =>
      (deck.name || "").toLowerCase().includes(q)
    );
  }, [decksPage, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Decks</h1>
          <p className="mt-1 text-sm text-gray-500">Build flashcards for the words you want to remember.</p>
          {activePair ? (
            <p className="mt-2 text-sm text-gray-700">
              Active pair: <span className="font-semibold">{langLabel(activeLearning)}</span> →{" "}
              <span className="font-semibold">{langLabel(activeTranslation)}</span>
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search decks..." className="w-48" />
          <Button onClick={() => setShowCreateModal(true)} disabled={!activePair}>+ Add Deck</Button>
        </div>
      </div>

      {toast ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{toast.message}</div> : null}

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !creating && setShowCreateModal(false)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-semibold">Add New Deck</h3>
            <form onSubmit={createDeck} className="grid gap-4">
              <label className="grid gap-1.5"><span className="text-sm text-gray-700">Deck name *</span><Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Travel vocabulary" /></label>
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={creating || !name.trim()} className="flex-1">{creating ? "Creating..." : "Create Deck"}</Button>
                <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)} disabled={creating} className="flex-1">Cancel</Button>
              </div>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
            </form>
          </div>
        </div>
      ) : null}

      {error && !showCreateModal ? <pre className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</pre> : null}

      {loading || activePairLoading ? (
        <p className="text-sm text-gray-500">Loading decks...</p>
      ) : !activePair ? (
        <Card><p className="text-sm text-gray-600">Select an active pair to view decks.</p></Card>
      ) : filteredDecks.length === 0 ? (
        <Card><p className="text-sm text-gray-600">{search ? "No decks match your search." : "No decks yet. Add your first deck."}</p></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredDecks.map((deck) => {
            const stats = progressByDeck[deck.id];
            return (
              <Card key={deck.id} className="cursor-pointer border-zinc-200 transition-all hover:shadow-lg active:scale-[0.985]" onClick={() => nav(`/app/decks/${deck.id}`)}>
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="pr-2 text-lg font-semibold tracking-tight line-clamp-2">{deck.name}</h3>
                  </div>
                  {deck.author_name ? <p className="text-sm text-zinc-600">{deck.author_name}</p> : null}
                  <div className="grid grid-cols-2 gap-2 pt-2 text-sm">
                    <span>Total: <span className="font-semibold">{stats?.total_cards ?? "-"}</span></span>
                    <span className="text-amber-600">Due: <span className="font-semibold">{stats?.due_count ?? "-"}</span></span>
                    <span className="text-emerald-600">Mastered: <span className="font-semibold">{stats?.total_mastered ?? "-"}</span></span>
                    <span>New: <span className="font-semibold">{stats?.total_new ?? "-"}</span></span>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button variant="primary" size="sm" onClick={() => nav(`/app/decks/${deck.id}`)}>Open</Button>
                  <Button variant="secondary" size="sm" onClick={() => nav(`/app/study/${deck.id}`)}>Study</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
