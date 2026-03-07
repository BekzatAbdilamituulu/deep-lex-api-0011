import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CardsApi, DecksApi } from "../api/endpoints";
import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import { useActivePair } from "../context/ActivePairContext";

function extractError(e) {
  if (e?.response?.data) return JSON.stringify(e.response.data);
  return e?.message ?? "Request failed";
}

const PAGE_LIMIT = 20;

export default function DeckDetailPage() {
  const nav = useNavigate();
  const { deckId } = useParams();
  const id = Number(deckId);
  const { activePair } = useActivePair();

  const [deck, setDeck] = useState(null);
  const [cardsPage, setCardsPage] = useState(null);
  const [offset, setOffset] = useState(0);

  const [loadingDeck, setLoadingDeck] = useState(true);
  const [loadingCards, setLoadingCards] = useState(true);
  const [error, setError] = useState("");
  const [cardsError, setCardsError] = useState("");

  const [creating, setCreating] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [example, setExample] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");
  const [editExample, setEditExample] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const cards = useMemo(() => cardsPage?.items ?? [], [cardsPage]);
  const meta = cardsPage?.meta;

  async function loadDeck() {
    setLoadingDeck(true);
    setError("");
    try {
      if (!activePair) {
        setDeck(null);
        setError("Select an active learning pair first.");
        return false;
      }

      const res = await DecksApi.get(id);
      const loadedDeck = res.data;
      const matchesActivePair =
        String(loadedDeck?.source_language_id) === String(activePair.source_language_id) &&
        String(loadedDeck?.target_language_id) === String(activePair.target_language_id);

      if (!matchesActivePair) {
        setDeck(null);
        setError("This deck does not belong to the active learning pair.");
        return false;
      }

      setDeck(loadedDeck);
      return true;
    } catch (e) {
      setError(extractError(e));
      return false;
    } finally {
      setLoadingDeck(false);
    }
  }

  async function loadCards(nextOffset = offset) {
    setLoadingCards(true);
    setCardsError("");
    try {
      const res = await CardsApi.list(id, PAGE_LIMIT, nextOffset);
      setCardsPage(res.data);
      setOffset(nextOffset);
    } catch (e) {
      setCardsError(extractError(e));
    } finally {
      setLoadingCards(false);
    }
  }

  async function createCard(e) {
    e.preventDefault();
    if (!activePair || !deck) {
      setCardsError("Select the active pair deck before adding cards.");
      return;
    }
    if (!front.trim() || !back.trim()) return;

    setCreating(true);
    setCardsError("");
    try {
      await CardsApi.create(id, {
        front: front.trim(),
        back: back.trim(),
        example_sentence: example.trim() ? example.trim() : null,
      });
      setFront("");
      setBack("");
      setExample("");
      await loadCards(offset);
    } catch (e2) {
      setCardsError(extractError(e2));
    } finally {
      setCreating(false);
    }
  }

  function startEdit(card) {
    setEditingId(card.id);
    setEditFront(card.front ?? "");
    setEditBack(card.back ?? "");
    setEditExample(card.example_sentence ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditFront("");
    setEditBack("");
    setEditExample("");
  }

  async function saveEdit(cardId) {
    if (!editFront.trim() || !editBack.trim()) return;

    setSavingId(cardId);
    setCardsError("");
    try {
      await CardsApi.update(id, cardId, {
        front: editFront.trim(),
        back: editBack.trim(),
        example_sentence: editExample.trim() ? editExample.trim() : null,
      });
      cancelEdit();
      await loadCards(offset);
    } catch (e) {
      setCardsError(extractError(e));
    } finally {
      setSavingId(null);
    }
  }

  async function deleteCard(cardId) {
    const ok = window.confirm("Delete this card?");
    if (!ok) return;

    setDeletingId(cardId);
    setCardsError("");
    try {
      await CardsApi.delete(id, cardId);

      const currentCount = cards.length;
      if (currentCount === 1 && offset > 0) {
        const prevOffset = Math.max(0, offset - PAGE_LIMIT);
        await loadCards(prevOffset);
      } else {
        await loadCards(offset);
      }
    } catch (e) {
      setCardsError(extractError(e));
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    async function loadAll() {
      if (!(id > 0)) {
        setError("Invalid deck id.");
        setLoadingDeck(false);
        setLoadingCards(false);
        return;
      }

      const deckOk = await loadDeck();
      if (deckOk) {
        loadCards(0);
      } else {
        setLoadingCards(false);
      }
    }

    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, activePair?.id]);

  return (
    <div className="space-y-4">
      <Link to="/app/decks" className="text-sm text-gray-500 underline">
        Back to decks
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {loadingDeck ? "Loading deck..." : deck?.name || `Deck #${id}`}
          </h1>
          {deck ? (
            <p className="mt-1 text-sm text-gray-500">
              #{deck.id} · {deck.source_language_id} to {deck.target_language_id} · {deck.deck_type}
            </p>
          ) : null}
        </div>

        <Button variant="primary" onClick={() => nav(`/app/study/${id}`)}>
          Study
        </Button>
      </div>

      {error ? (
        <pre className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</pre>
      ) : null}

      <Card>
        <h2 className="text-lg font-semibold">Add card</h2>
        <form onSubmit={createCard} className="mt-4 grid gap-3">
          <Input placeholder="Front" value={front} onChange={(e) => setFront(e.target.value)} />
          <Input placeholder="Back" value={back} onChange={(e) => setBack(e.target.value)} />
          <Input
            placeholder="Example (optional)"
            value={example}
            onChange={(e) => setExample(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              type="submit"
              disabled={creating || !front.trim() || !back.trim() || !activePair || !deck}
            >
              {creating ? "Adding..." : "Add card"}
            </Button>
            <Button variant="secondary" type="button" onClick={() => loadCards(offset)} disabled={loadingCards}>
              {loadingCards ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </form>
      </Card>

      {cardsError ? (
        <pre className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{cardsError}</pre>
      ) : null}

      <div className="space-y-3">
        {loadingCards ? <p className="text-sm text-gray-500">Loading cards...</p> : null}

        {!loadingCards && cards.length === 0 ? (
          <Card>
            <p className="text-gray-700">No cards yet.</p>
          </Card>
        ) : null}

        {!loadingCards
          ? cards.map((card) => {
              const isEditing = editingId === card.id;
              const isSaving = savingId === card.id;
              const isDeleting = deletingId === card.id;

              return (
                <Card key={card.id}>
                  {isEditing ? (
                    <div className="grid gap-3">
                      <Input value={editFront} onChange={(e) => setEditFront(e.target.value)} />
                      <Input value={editBack} onChange={(e) => setEditBack(e.target.value)} />
                      <Input value={editExample} onChange={(e) => setEditExample(e.target.value)} />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="primary"
                          onClick={() => saveEdit(card.id)}
                          disabled={isSaving || !editFront.trim() || !editBack.trim()}
                        >
                          {isSaving ? "Saving..." : "Save"}
                        </Button>
                        <Button variant="secondary" onClick={cancelEdit} disabled={isSaving}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-500">Front</p>
                        <p className="text-gray-700">{card.front}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Back</p>
                        <p className="text-gray-700">{card.back}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Example</p>
                        <p className="text-gray-700">{card.example_sentence || "-"}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                          variant="secondary"
                          onClick={() => startEdit(card)}
                          disabled={deletingId != null || savingId != null}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => deleteCard(card.id)}
                          disabled={isDeleting || editingId != null || savingId != null}
                        >
                          {isDeleting ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })
          : null}
      </div>

      {meta ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <Button
            variant="secondary"
            onClick={() => loadCards(Math.max(0, offset - PAGE_LIMIT))}
            disabled={loadingCards || offset === 0}
          >
            Prev
          </Button>

          <p className="text-xs text-gray-500">
            {cards.length ? `${offset + 1}-${Math.min(offset + cards.length, meta.total)}` : "0"} of {meta.total}
          </p>

          <Button
            variant="secondary"
            onClick={() => loadCards(offset + PAGE_LIMIT)}
            disabled={loadingCards || !meta.has_more}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
