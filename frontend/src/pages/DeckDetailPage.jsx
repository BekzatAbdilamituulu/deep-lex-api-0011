import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CardsApi, DecksApi, ProgressApi } from "../api/endpoints";
import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import { memoryStrengthFromCard } from "../utils/memoryStrength";

function extractError(e) {
  const detail = e?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (e?.response?.data) return JSON.stringify(e.response.data);
  return e?.message ?? "Request failed";
}

const PAGE_LIMIT = 20;
const CONTENT_KIND_OPTIONS = ["word", "phrase", "quote", "idea"];

export default function DeckDetailPage() {
  const nav = useNavigate();
  const { deckId: deckIdParam } = useParams();
  const deckId = Number(deckIdParam);

  const [deck, setDeck] = useState(null);
  const [stats, setStats] = useState(null);
  const [cardsPage, setCardsPage] = useState(null);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingCards, setLoadingCards] = useState(true);
  const [error, setError] = useState("");
  const [cardsError, setCardsError] = useState("");

  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [contentKind, setContentKind] = useState("word");
  const [sourceSentence, setSourceSentence] = useState("");
  const [sourcePage, setSourcePage] = useState("");
  const [contextNote, setContextNote] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");
  const [editContentKind, setEditContentKind] = useState("word");
  const [editSourceSentence, setEditSourceSentence] = useState("");
  const [editSourcePage, setEditSourcePage] = useState("");
  const [editContextNote, setEditContextNote] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const cards = useMemo(() => cardsPage?.items ?? [], [cardsPage]);
  const meta = cardsPage?.meta;

  async function loadDeck() {
    setLoading(true);
    setError("");
    try {
      const deckRes = await DecksApi.get(deckId);
      setDeck(deckRes.data);
      try {
        const progressRes = await ProgressApi.summary({ deck_id: deckId });
        setStats(progressRes.data);
      } catch {
        setStats(null);
      }
    } catch (e) {
      setError(extractError(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadCards(nextOffset = offset) {
    setLoadingCards(true);
    setCardsError("");
    try {
      const res = await CardsApi.list(deckId, PAGE_LIMIT, nextOffset);
      setCardsPage(res.data ?? { items: [], meta: { total: 0, offset: nextOffset, limit: PAGE_LIMIT, has_more: false } });
      setOffset(nextOffset);
    } catch (e) {
      setCardsError(extractError(e));
    } finally {
      setLoadingCards(false);
    }
  }

  async function refresh(nextOffset = offset) {
    await Promise.all([loadDeck(), loadCards(nextOffset)]);
  }

  useEffect(() => {
    if (!(deckId > 0)) {
      setError("Invalid deck id.");
      setLoading(false);
      setLoadingCards(false);
      return;
    }
    refresh(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);

  async function createCard(e) {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;
    const sentence = sourceSentence.trim();
    setCreating(true);
    setCardsError("");
    try {
      await CardsApi.create(deckId, {
        front: front.trim(),
        back: back.trim(),
        example_sentence: sentence || null,
        content_kind: contentKind || null,
        source_sentence: sentence || null,
        source_page: sourcePage.trim() || null,
        context_note: contextNote.trim() || null,
      });
      setFront("");
      setBack("");
      setContentKind("word");
      setSourceSentence("");
      setSourcePage("");
      setContextNote("");
      await refresh(offset);
    } catch (e) {
      setCardsError(extractError(e));
    } finally {
      setCreating(false);
    }
  }

  function startEdit(card) {
    setEditingId(card.id);
    setEditFront(card.front ?? "");
    setEditBack(card.back ?? "");
    setEditContentKind(card.content_kind ?? "word");
    setEditSourceSentence(card.source_sentence ?? card.example_sentence ?? "");
    setEditSourcePage(card.source_page ?? "");
    setEditContextNote(card.context_note ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditFront("");
    setEditBack("");
    setEditContentKind("word");
    setEditSourceSentence("");
    setEditSourcePage("");
    setEditContextNote("");
  }

  async function saveEdit(card) {
    if (!editFront.trim() || !editBack.trim()) return;
    const sentence = editSourceSentence.trim();
    setSavingId(card.id);
    setCardsError("");
    try {
      await CardsApi.update(deckId, card.id, {
        front: editFront.trim(),
        back: editBack.trim(),
        example_sentence: sentence || null,
        content_kind: editContentKind || null,
        source_sentence: sentence || null,
        source_page: editSourcePage.trim() || null,
        context_note: editContextNote.trim() || null,
      });
      cancelEdit();
      await refresh(offset);
    } catch (e) {
      setCardsError(extractError(e));
    } finally {
      setSavingId(null);
    }
  }

  async function deleteCard(card) {
    if (!window.confirm("Delete this card?")) return;
    setDeletingId(card.id);
    setCardsError("");
    try {
      await CardsApi.delete(deckId, card.id);
      const nextOffset = cards.length === 1 && offset > 0 ? Math.max(0, offset - PAGE_LIMIT) : offset;
      await refresh(nextOffset);
    } catch (e) {
      setCardsError(extractError(e));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <Link to="/app/decks" className="text-sm text-gray-500 underline">Back to decks</Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{loading ? "Loading deck..." : deck?.name || `Deck #${deckId}`}</h1>
          {deck ? <p className="mt-1 text-sm text-gray-500">{deck.author_name ? `${deck.author_name} · ` : ""}{deck.source_type || deck.deck_type}</p> : null}
        </div>
        <Button variant="primary" onClick={() => nav(`/app/study/${deckId}`)} disabled={!deck}>▶ Study deck</Button>
      </div>

      {error ? <pre className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</pre> : null}

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Deck progress</h2>
        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div>Total cards: <span className="font-bold">{stats?.total_cards ?? meta?.total ?? "-"}</span></div>
          <div>Due reviews: <span className="font-bold text-amber-600">{stats?.due_count ?? "-"}</span></div>
          <div>Learning: <span className="font-bold text-blue-600">{stats?.total_learning ?? "-"}</span></div>
          <div>Mastered: <span className="font-bold text-emerald-600">{stats?.total_mastered ?? "-"}</span></div>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">Add card</h2>
        <form onSubmit={createCard} className="mt-4 grid gap-3">
          <Input placeholder="Front" value={front} onChange={(e) => setFront(e.target.value)} />
          <Input placeholder="Back / meaning" value={back} onChange={(e) => setBack(e.target.value)} />
          <Input placeholder="Sentence (optional)" value={sourceSentence} onChange={(e) => setSourceSentence(e.target.value)} />
          <details>
            <summary className="cursor-pointer text-sm font-medium text-gray-700">Optional book/source context</summary>
            <div className="mt-3 grid gap-3">
              <select value={contentKind} onChange={(e) => setContentKind(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black">
                {CONTENT_KIND_OPTIONS.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
              </select>
              <Input placeholder="Page/location (optional)" value={sourcePage} onChange={(e) => setSourcePage(e.target.value)} />
              <Input placeholder="Context note (optional)" value={contextNote} onChange={(e) => setContextNote(e.target.value)} />
            </div>
          </details>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" type="submit" disabled={creating || !front.trim() || !back.trim()}>{creating ? "Saving..." : "Save card"}</Button>
            <Button variant="secondary" type="button" onClick={() => refresh(offset)} disabled={loadingCards}>Refresh</Button>
          </div>
        </form>
      </Card>

      {cardsError ? <pre className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{cardsError}</pre> : null}

      <div className="space-y-3">
        <Card><h2 className="text-lg font-semibold">Cards</h2></Card>
        {loadingCards ? <p className="text-sm text-gray-500">Loading cards...</p> : null}
        {!loadingCards && cards.length === 0 ? <Card><p className="text-gray-700">No cards in this deck yet.</p></Card> : null}
        {!loadingCards ? cards.map((card) => {
          const isEditing = editingId === card.id;
          return (
            <Card key={card.id}>
              {isEditing ? (
                <div className="grid gap-3">
                  <Input value={editFront} onChange={(e) => setEditFront(e.target.value)} placeholder="Front" />
                  <Input value={editBack} onChange={(e) => setEditBack(e.target.value)} placeholder="Back / meaning" />
                  <Input value={editSourceSentence} onChange={(e) => setEditSourceSentence(e.target.value)} placeholder="Sentence (optional)" />
                  <details>
                    <summary className="cursor-pointer text-sm font-medium text-gray-700">Optional context</summary>
                    <div className="mt-3 grid gap-3">
                      <select value={editContentKind} onChange={(e) => setEditContentKind(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black">
                        {CONTENT_KIND_OPTIONS.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
                      </select>
                      <Input value={editSourcePage} onChange={(e) => setEditSourcePage(e.target.value)} placeholder="Page/location" />
                      <Input value={editContextNote} onChange={(e) => setEditContextNote(e.target.value)} placeholder="Context note" />
                    </div>
                  </details>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="primary" onClick={() => saveEdit(card)} disabled={savingId === card.id || !editFront.trim() || !editBack.trim()}>{savingId === card.id ? "Saving..." : "Save"}</Button>
                    <Button variant="secondary" onClick={cancelEdit} disabled={savingId === card.id}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div><p className="text-xs text-gray-500">Front</p><p className="text-gray-800">{card.front}</p></div>
                  <div><p className="text-xs text-gray-500">Back / meaning</p><p className="text-gray-800">{card.back}</p></div>
                  <div><p className="text-xs text-gray-500">Sentence</p><p className="text-gray-700">{card.source_sentence || card.example_sentence || "-"}</p></div>
                  <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                    <span>Memory: <span className="font-semibold">{card.memory_strength || memoryStrengthFromCard(card)}</span></span>
                    <span>Status: <span className="font-semibold">{card.status || "new"}</span></span>
                    <span>Kind: <span className="font-semibold">{card.content_kind || "-"}</span></span>
                    <span>Page: <span className="font-semibold">{card.source_page || "-"}</span></span>
                  </div>
                  {card.context_note ? <p className="text-sm text-gray-600">Note: {card.context_note}</p> : null}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button variant="secondary" onClick={() => startEdit(card)} disabled={deletingId != null || savingId != null}>Edit</Button>
                    <Button variant="danger" onClick={() => deleteCard(card)} disabled={deletingId === card.id || editingId != null || savingId != null}>{deletingId === card.id ? "Deleting..." : "Delete"}</Button>
                  </div>
                </div>
              )}
            </Card>
          );
        }) : null}
      </div>

      {meta ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <Button variant="secondary" onClick={() => loadCards(Math.max(0, offset - PAGE_LIMIT))} disabled={loadingCards || offset === 0}>Prev</Button>
          <p className="text-xs text-gray-500">{cards.length ? `${offset + 1}-${Math.min(offset + cards.length, meta.total)}` : "0"} of {meta.total}</p>
          <Button variant="secondary" onClick={() => loadCards(offset + PAGE_LIMIT)} disabled={loadingCards || !meta.has_more}>Next</Button>
        </div>
      ) : null}
    </div>
  );
}
