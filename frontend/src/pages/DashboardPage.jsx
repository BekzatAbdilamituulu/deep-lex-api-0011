import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AutoApi,
  CardsApi,
  DecksApi,
  InboxApi,
  LanguagesApi,
  ProgressApi,
} from "../api/endpoints";
import { useActivePair } from "../context/ActivePairContext";

function extractError(e) {
  if (e?.response?.data) return JSON.stringify(e.response.data);
  return e?.message ?? "Request failed";
}

function isMainDeck(deck) {
  return (
    deck?.deck_type === "main" ||
    deck?.deck_type === "MAIN" ||
    deck?.is_main === true ||
    (typeof deck?.name === "string" && deck.name.toLowerCase().includes("main"))
  );
}

function getCardStatus(card) {
  return card?.status || card?.progress_status || card?.study_status || "unknown";
}

function Modal({ open, title, children, onClose }) {
  if (!open) return null;

  return (
    <div
      onMouseDown={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 520,
          background: "white",
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            marginBottom: 10,
          }}
        >
          <strong>{title}</strong>
          <button onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const nav = useNavigate();
  const {
    activePair,
    loading: activePairLoading,
  } = useActivePair();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [langs, setLangs] = useState([]);
  const [mainDeckCards, setMainDeckCards] = useState([]);
  const [editingDeckId, setEditingDeckId] = useState(null);
  const [editingCardId, setEditingCardId] = useState(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");
  const [editExample, setEditExample] = useState("");
  const [busyCardAction, setBusyCardAction] = useState(false);

  // Add word modal state
// NOTE: User is learning English:
//   front = English (learning language)
//   back  = Russian (translation/native)
//   example_sentence = English
const [addOpen, setAddOpen] = useState(false);
const [learningText, setLearningText] = useState(""); // front (en)
const [nativeText, setNativeText] = useState(""); // translation (ru)
const [example, setExample] = useState(""); // en
const [adding, setAdding] = useState(false);
const [addMsg, setAddMsg] = useState("");

// Auto preview (read-only; does NOT save to DB)
const [previewLoading, setPreviewLoading] = useState(false);
const [previewMsg, setPreviewMsg] = useState("");
const [dirtyNative, setDirtyNative] = useState(false);
const [dirtyExample, setDirtyExample] = useState(false);

  const nativeLang = useMemo(() => {
    if (!activePair) return null;
    return langs.find((l) => l.id === activePair.target_language_id) ?? null;
  }, [langs, activePair]);

  const learningLang = useMemo(() => {
    if (!activePair) return null;
    return langs.find((l) => l.id === activePair.source_language_id) ?? null;
  }, [langs, activePair]);

// When user types English (front), call /auto/preview and suggest Russian translation + English example.
useEffect(() => {
  if (!addOpen) return;
  if (!activePair) return;

  const front = learningText.trim();
  if (!front) {
    setPreviewMsg("");
    setPreviewLoading(false);
    if (!dirtyNative) setNativeText("");
    if (!dirtyExample) setExample("");
    return;
  }

  let cancelled = false;
  const t = setTimeout(async () => {
    try {
      setPreviewLoading(true);
      setPreviewMsg("");

      const res = await AutoApi.preview({
        front,
        deck_id: null,
        source_language_id: activePair.source_language_id, // learning (en)
        target_language_id: activePair.target_language_id, // native (ru)
      });

      if (cancelled) return;

      const data = res.data;
      if (!dirtyNative && data?.suggested_back != null) {
        setNativeText(data.suggested_back);
      }
      if (!dirtyExample && data?.suggested_example_sentence != null) {
        setExample(data.suggested_example_sentence);
      }
    } catch (e) {
      if (cancelled) return;
      setPreviewMsg(extractError(e));
    } finally {
      if (!cancelled) setPreviewLoading(false);
    }
  }, 450);

  return () => {
    cancelled = true;
    clearTimeout(t);
  };
}, [addOpen, learningText, activePair, dirtyNative, dirtyExample]);

  async function load() {
    if (!activePair?.id) {
      setMainDeckCards([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [langsRes, decksRes] = await Promise.all([
        LanguagesApi.list(),
        DecksApi.list(200, 0, { pair_id: activePair.id }),
      ]);
      setLangs(langsRes.data ?? []);
      const decks = decksRes.data?.items ?? [];
      const mainDecks = decks.filter((deck) => isMainDeck(deck));
      const deckSummaries = await Promise.all(
        mainDecks.map(async (deck) => {
          try {
            const [summaryRes, cardsRes] = await Promise.all([
              ProgressApi.summary({
                pair_id: activePair.id,
                deck_id: deck.id,
              }),
              CardsApi.list(deck.id, 10, 0),
            ]);
            return {
              deck,
              summary: summaryRes.data,
              cards: cardsRes.data?.items ?? [],
            };
          } catch {
            return { deck, summary: null, cards: [] };
          }
        })
      );

      setMainDeckCards(deckSummaries);
    } catch (e) {
      setError(extractError(e));
    } finally {
      setLoading(false);
    }
  }

  function startEdit(deckId, card) {
    setEditingDeckId(deckId);
    setEditingCardId(card.id);
    setEditFront(card.front || "");
    setEditBack(card.back || "");
    setEditExample(card.example_sentence || "");
  }

  function cancelEdit() {
    setEditingDeckId(null);
    setEditingCardId(null);
    setEditFront("");
    setEditBack("");
    setEditExample("");
  }

  async function updateCard(deckId, cardId) {
    if (!editFront.trim() || !editBack.trim()) return;
    setBusyCardAction(true);
    try {
      await CardsApi.update(deckId, cardId, {
        front: editFront.trim(),
        back: editBack.trim(),
        example_sentence: editExample.trim() ? editExample.trim() : null,
      });
      cancelEdit();
      await load();
    } catch (e) {
      setError(extractError(e));
    } finally {
      setBusyCardAction(false);
    }
  }

  async function deleteCard(deckId, cardId) {
    const ok = window.confirm("Delete this card?");
    if (!ok) return;

    setBusyCardAction(true);
    try {
      await CardsApi.delete(deckId, cardId);
      await load();
    } catch (e) {
      setError(extractError(e));
    } finally {
      setBusyCardAction(false);
    }
  }

  async function refreshDeckCards(deckId) {
    try {
      const cardsRes = await CardsApi.list(deckId, 10, 0);
      const nextCards = cardsRes.data?.items ?? [];
      setMainDeckCards((current) =>
        current.map((entry) =>
          entry.deck.id === deckId ? { ...entry, cards: nextCards } : entry
        )
      );
    } catch (e) {
      setError(extractError(e));
    }
  }

  async function resetProgress(deckId, cardId) {
    const ok = window.confirm("Reset progress for this card?");
    if (!ok) return;

    setBusyCardAction(true);
    try {
      await CardsApi.reset(deckId, cardId);
      await refreshDeckCards(deckId);
    } catch (e) {
      setError(extractError(e));
    } finally {
      setBusyCardAction(false);
    }
  }

  function openAdd() {
    if (!activePair) {
      setError("Select an active learning pair before adding words.");
      return;
    }
    setAddMsg("");
    setPreviewMsg("");
    setPreviewLoading(false);
    setDirtyNative(false);
    setDirtyExample(false);
    setLearningText("");
    setNativeText("");
    setExample("");
    setAddOpen(true);
  }

  async function submitAdd(e) {
    e.preventDefault();
    if (!activePair) {
      setAddMsg("Select an active learning pair before saving.");
      return;
    }

    const learning = learningText.trim();
    const native = nativeText.trim();
    if (!learning || !native) return;

    setAdding(true);
    setAddMsg("");

    try {
      await InboxApi.addWord({
        // Duocards style:
        // front = native (target), back = learning (source)
        front: learning,
        back: native,
        example_sentence: example.trim() ? example.trim() : null,
        // ids: source=learning, target=native
        source_language_id: activePair.source_language_id,
        target_language_id: activePair.target_language_id,
      });

      setAddMsg("Saved ✅");
      // refresh summary and deck presence
      await load();

      // keep modal open for fast adding, but clear inputs
      setLearningText("");
      setNativeText("");
      setExample("");
      setDirtyNative(false);
      setDirtyExample(false);
      setPreviewMsg("");
    } catch (e2) {
      setAddMsg(extractError(e2));
    } finally {
      setAdding(false);
    }
  }

  useEffect(() => {
    if (activePairLoading) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePair?.id, activePairLoading]);

  if (loading) return <p>Loading...</p>;

  const titleLeft = learningLang?.code || learningLang?.name || "Learning";
  const titleRight = nativeLang?.code || nativeLang?.name || "Translation";
  const primaryDeck = mainDeckCards[0] ?? null;
  const primaryDeckSummary = primaryDeck?.summary ?? null;
  const sectionCards = primaryDeck?.cards ?? [];
  const hasStudyableCards = Number(primaryDeckSummary?.total_cards ?? sectionCards.length ?? 0) > 0;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", paddingBottom: 90 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          background: "#fff",
          border: "1px solid #ececec",
          borderRadius: 14,
          padding: "10px 12px",
        }}
      >
        <div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Active pair</div>
          <div style={{ fontWeight: 600 }}>{titleLeft} → {titleRight}</div>
          {primaryDeck ? (
            <div style={{ fontSize: 12, opacity: 0.7 }}>{primaryDeck.deck.name}</div>
          ) : null}
        </div>
        <button style={{ width: 44, height: 44, borderRadius: 10 }} onClick={load} title="Refresh">
          ↻
        </button>
      </div>

      {error && (
        <pre style={{ padding: 12, background: "#ffecec" }}>{error}</pre>
      )}

      {!activePair ? (
        <div style={{ padding: 12, background: "#f5f5f5", marginTop: 14, opacity: 0.75 }}>
          Select an active pair to view main decks.
        </div>
      ) : null}

      {activePair && mainDeckCards.length === 0 ? (
        <div style={{ padding: 12, background: "#fff3cd", marginTop: 14 }}>
          No main decks for this pair yet.
        </div>
      ) : null}

      {primaryDeck ? (
        <div
          style={{
            marginTop: 14,
            border: "1px solid #e7e7e7",
            borderRadius: 16,
            background: "#fff",
            padding: 16,
          }}
        >
          <div style={{ fontSize: 14, opacity: 0.8 }}>{titleLeft} → {titleRight}</div>
          <div style={{ marginTop: 4, fontSize: 13, opacity: 0.7 }}>{primaryDeck.deck.name}</div>

          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 10,
              textAlign: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Total New</div>
              <div style={{ fontSize: 26, fontWeight: 700 }}>{primaryDeckSummary?.total_new ?? "-"}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Total Learning</div>
              <div style={{ fontSize: 26, fontWeight: 700 }}>{primaryDeckSummary?.total_learning ?? "-"}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Total Mastered</div>
              <div style={{ fontSize: 26, fontWeight: 700 }}>{primaryDeckSummary?.total_mastered ?? "-"}</div>
            </div>
          </div>

          <button
            style={{
              marginTop: 14,
              width: "100%",
              minHeight: 48,
              borderRadius: 12,
              background: "#111",
              color: "#fff",
              border: "none",
              fontWeight: 600,
              opacity: hasStudyableCards ? 1 : 0.65,
            }}
            disabled={!hasStudyableCards}
            onClick={() => nav(`/app/study/${primaryDeck.deck.id}`)}
          >
            Start Study
          </button>
          {!hasStudyableCards ? (
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
              Add cards to this main deck to start studying.
            </div>
          ) : null}
        </div>
      ) : null}

      {primaryDeck ? (
        <details style={{ marginTop: 14 }}>
          <summary
            style={{
              listStyle: "none",
              cursor: "pointer",
              border: "1px solid #e5e5e5",
              borderRadius: 12,
              padding: "12px 14px",
              background: "#fff",
              fontWeight: 600,
            }}
          >
            Cards ({sectionCards.length}/10)
          </summary>
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {sectionCards.length === 0 ? (
              <div style={{ fontSize: 13, opacity: 0.7, padding: 8 }}>No cards in this deck yet.</div>
            ) : (
              sectionCards.map((card) => {
                const isEditing =
                  editingDeckId === primaryDeck.deck.id && editingCardId === card.id;
                return (
                  <div
                    key={card.id}
                    style={{
                      border: "1px solid #eee",
                      borderRadius: 10,
                      padding: 8,
                      fontSize: 13,
                      background: "#fff",
                    }}
                  >
                    {isEditing ? (
                      <div style={{ display: "grid", gap: 6 }}>
                        <input
                          value={editFront}
                          onChange={(e) => setEditFront(e.target.value)}
                          style={{ width: "100%" }}
                          placeholder="Front"
                        />
                        <input
                          value={editBack}
                          onChange={(e) => setEditBack(e.target.value)}
                          style={{ width: "100%" }}
                          placeholder="Back"
                        />
                        <input
                          value={editExample}
                          onChange={(e) => setEditExample(e.target.value)}
                          style={{ width: "100%" }}
                          placeholder="Example"
                        />
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button
                            style={{ padding: "6px 10px" }}
                            disabled={busyCardAction || !editFront.trim() || !editBack.trim()}
                            onClick={() => updateCard(primaryDeck.deck.id, card.id)}
                          >
                            Update
                          </button>
                          <button style={{ padding: "6px 10px" }} onClick={cancelEdit} disabled={busyCardAction}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gap: 4 }}>
                        <div><strong>Front:</strong> {card.front}</div>
                        <div><strong>Back:</strong> {card.back}</div>
                        {card.example_sentence ? (
                          <div><strong>Example:</strong> {card.example_sentence}</div>
                        ) : null}
                        <div><strong>Status:</strong> {getCardStatus(card)}</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                          <button
                            style={{ padding: "6px 10px" }}
                            disabled={busyCardAction}
                            onClick={() => startEdit(primaryDeck.deck.id, card)}
                          >
                            Edit
                          </button>
                          <button
                            style={{ padding: "6px 10px" }}
                            disabled={busyCardAction}
                            onClick={() => deleteCard(primaryDeck.deck.id, card.id)}
                          >
                            Delete
                          </button>
                          <button
                            style={{ padding: "6px 10px" }}
                            disabled={busyCardAction}
                            onClick={() => resetProgress(primaryDeck.deck.id, card.id)}
                          >
                            Reset progress
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </details>
      ) : null}

      <button
        onClick={openAdd}
        disabled={!activePair}
        title="Add word"
        style={{
          position: "fixed",
          right: 18,
          bottom: 92,
          width: 52,
          height: 52,
          borderRadius: "50%",
          border: "none",
          background: "#111",
          color: "#fff",
          fontSize: 28,
          lineHeight: 1,
        }}
      >
        +
      </button>

      <Modal open={addOpen} title="Add word" onClose={() => setAddOpen(false)}>
        <form onSubmit={submitAdd} style={{ display: "grid", gap: 12 }}>
          <label>
            Learning ({titleLeft}) — shown first
            <input
              value={learningText}
              onChange={(e) => setLearningText(e.target.value)}
              style={{ width: "100%" }}
              placeholder="e.g. hello"
            />
          </label>
<div style={{ display: "flex", gap: 10, alignItems: "center" }}>
  <strong>Preview</strong>
  {previewLoading ? <span>Loading...</span> : null}
  {previewMsg ? <span style={{ color: "crimson" }}>{previewMsg}</span> : null}
</div>

          <label>
            Translation ({titleRight}) — shown after tap
            <input
              value={nativeText}
              onChange={(e) => {
                setNativeText(e.target.value);
                setDirtyNative(true);
              }}
              style={{ width: "100%" }}
              placeholder="e.g. привет"
            />
          </label>

          <label>
            Example (optional)
            <input
              value={example}
              onChange={(e) => {
                setExample(e.target.value);
                setDirtyExample(true);
              }}
              style={{ width: "100%" }}
              placeholder="short sentence"
            />
          </label>

          <div style={{ display: "flex", gap: 10 }}>
            <button disabled={adding || !nativeText.trim() || !learningText.trim()}>
              {adding ? "Saving..." : "Save"}
            </button>
            <button type="button" onClick={() => setAddOpen(false)}>
              Close
            </button>
          </div>

          {addMsg && (
            <pre style={{ padding: 12, background: "#f5f5f5" }}>{addMsg}</pre>
          )}
        </form>
      </Modal>
    </div>
  );
}
