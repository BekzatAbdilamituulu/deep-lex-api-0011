import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  AutoApi, CardsApi, DecksApi, LanguagesApi, ProgressApi
} from "../api/endpoints";
import { useActivePair } from "../context/ActivePairContext";
import Button from "../components/Button";
import Card from "../components/Card";
import ProgressBar from "../components/ProgressBar";
import { LineChart, Line, ResponsiveContainer } from "recharts";

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

export default function DashboardPage() {
  const nav = useNavigate();
  const { activePair, loading: pairLoading } = useActivePair();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [langs, setLangs] = useState([]);
  const [mainDeckCards, setMainDeckCards] = useState([]);

  // Quick add
  const [addOpen, setAddOpen] = useState(false);
  const [learningText, setLearningText] = useState("");
  const [nativeText, setNativeText] = useState("");
  const [sourceSentence, setSourceSentence] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewMsg, setPreviewMsg] = useState("");
  const [dirtyNative, setDirtyNative] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addMsg, setAddMsg] = useState("");

  // Dummy sparkline data for recent activity (could be enhanced with real data)
  const sparkData = useMemo(() => [
    { day: "Mon", words: 12 }, { day: "Tue", words: 8 }, { day: "Wed", words: 19 },
    { day: "Thu", words: 5 }, { day: "Fri", words: 14 }, { day: "Sat", words: 22 }, { day: "Sun", words: 15 },
  ], []);

  const load = async () => {
    if (!activePair?.id) {
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

      const mainDecks = decks.filter(isMainDeck);
      const summaries = await Promise.all(
        mainDecks.map(async (deck) => {
          try {
            const [summaryRes, cardsRes] = await Promise.all([
              ProgressApi.summary({ pair_id: activePair.id, deck_id: deck.id }),
              CardsApi.list(deck.id, 100, 0),
            ]);
            return { deck, summary: summaryRes.data, cards: cardsRes.data?.items ?? [] };
          } catch {
            return { deck, summary: null, cards: [] };
          }
        })
      );
      setMainDeckCards(summaries);
    } catch (e) {
      setError(extractError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!pairLoading) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePair?.id, pairLoading]);

  // Auto preview for quick add
  useEffect(() => {
    if (!addOpen || !activePair || !learningText.trim()) {
      if (!dirtyNative) setNativeText("");
      setPreviewMsg("");
      setPreviewLoading(false);
      return;
    }

    const controller = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await AutoApi.preview({
          front: learningText.trim(),
          deck_id: null,
          source_language_id: activePair.source_language_id,
          target_language_id: activePair.target_language_id,
        });
        if (!dirtyNative && res.data?.suggested_back) {
          setNativeText(res.data.suggested_back);
        }
      } catch (e) {
        setPreviewMsg(extractError(e));
      } finally {
        setPreviewLoading(false);
      }
    }, 420);

    return () => clearTimeout(controller);
  }, [addOpen, learningText, activePair, dirtyNative]);

  const primaryDeck = mainDeckCards[0] ?? null;
  const summary = primaryDeck?.summary || {};
  const totalNew = summary.total_new ?? 0;
  const totalLearning = summary.total_learning ?? 0;
  const totalMastered = summary.total_mastered ?? 0;

  const nativeLang = langs.find((l) => l.id === activePair?.target_language_id);
  const learningLang = langs.find((l) => l.id === activePair?.source_language_id);

  // Demo daily goal
  const dailyGoal = 30;
  const todayLearned = Math.min(22, totalNew + 3); // demo

  const openQuickAdd = () => {
    if (!activePair) {
      setError("Select a learning pair first");
      return;
    }
    setAddMsg(""); setPreviewMsg(""); setLearningText(""); setNativeText(""); setSourceSentence("");
    setDirtyNative(false);
    setAddOpen(true);
  };

  const saveQuickWord = async () => {
    if (!learningText.trim() || !primaryDeck?.deck?.id) return;
    setAdding(true);
    try {
      await CardsApi.create(primaryDeck.deck.id, {
        front: learningText.trim(),
        back: nativeText.trim() || null,
        example_sentence: sourceSentence.trim() || null,
      });
      setAddMsg("Saved!");
      setTimeout(() => {
        setAddOpen(false);
        setLearningText(""); setNativeText(""); setSourceSentence("");
        load();
      }, 650);
    } catch (e) {
      setAddMsg(extractError(e));
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-sm text-zinc-500">Loading your progress...</div>;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="rounded-3xl bg-gradient-to-br from-zinc-900 to-black p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="uppercase tracking-[3px] text-xs text-white/60 mb-1">Good morning</div>
            <h1 className="text-4xl font-semibold tracking-tighter">
              {learningLang?.name || "Learning"} → {nativeLang?.name || "Your language"}
            </h1>
            <p className="mt-2 text-white/70">Keep the streak alive. Small wins compound.</p>
          </div>

          {/* Streak + Goal */}
          <div className="flex flex-col gap-3 md:items-end">
            <div className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-1 text-sm backdrop-blur">
              🔥 <span className="font-semibold">7 day streak</span>
            </div>
            <div className="w-full md:w-72">
              <div className="mb-1 flex justify-between text-xs text-white/70">
                <span>Daily goal</span>
                <span>{todayLearned} / {dailyGoal}</span>
              </div>
              <ProgressBar 
                value={todayLearned} 
                max={dailyGoal} 
                trackClassName="bg-white/20" 
                fillClassName="bg-emerald-400" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center py-5">
          <div className="text-4xl font-semibold">{totalNew}</div>
          <div className="text-sm text-zinc-500 mt-1">New</div>
        </Card>
        <Card className="text-center py-5">
          <div className="text-4xl font-semibold text-amber-600">{totalLearning}</div>
          <div className="text-sm text-zinc-500 mt-1">Learning</div>
        </Card>
        <Card className="text-center py-5">
          <div className="text-4xl font-semibold text-emerald-600">{totalMastered}</div>
          <div className="text-sm text-zinc-500 mt-1">Mastered</div>
        </Card>
        <Card className="text-center py-5 cursor-pointer" onClick={() => primaryDeck && nav(`/app/study/${primaryDeck.deck.id}`)}>
          <div className="text-3xl font-semibold">Start</div>
          <div className="text-sm text-zinc-500 mt-1">Deck Review →</div>
        </Card>
      </div>

      {/* Activity sparkline */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="font-semibold">Recent activity</div>
            <div className="text-xs text-zinc-500">Words reviewed (last 7 days)</div>
          </div>
          <Button size="sm" variant="secondary" onClick={openQuickAdd}>+ Quick Add</Button>
        </div>
        <div className="h-24 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData}>
              <Line 
                type="monotone" 
                dataKey="words" 
                stroke="#18181b" 
                strokeWidth={3} 
                dot={false} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Quick add modal - clean with preview */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setAddOpen(false)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-semibold">Quick Add Word</h3>
              <button onClick={() => setAddOpen(false)} className="text-2xl leading-none text-zinc-400">×</button>
            </div>

            <div className="space-y-4">
              <input
                className="w-full rounded-2xl border px-5 py-3 text-lg outline-none focus:ring-2 focus:ring-zinc-900"
                placeholder="Word / front (e.g. ephemeral)"
                value={learningText}
                onChange={(e) => { setLearningText(e.target.value); setDirtyNative(false); }}
              />
              <input
                className="w-full rounded-2xl border px-5 py-3 text-lg outline-none focus:ring-2 focus:ring-zinc-900"
                placeholder="Meaning / back"
                value={nativeText}
                onChange={(e) => { setNativeText(e.target.value); setDirtyNative(true); }}
              />
              <input
                className="w-full rounded-2xl border px-5 py-3 outline-none focus:ring-2 focus:ring-zinc-900"
                placeholder="Example sentence (optional)"
                value={sourceSentence}
                onChange={(e) => setSourceSentence(e.target.value)}
              />

              {previewLoading && <div className="text-xs text-zinc-500">Previewing translation...</div>}
              {previewMsg && <div className="text-xs text-red-600">{previewMsg}</div>}

              <div className="flex gap-3 pt-2">
                <Button onClick={saveQuickWord} disabled={adding || !learningText.trim()} className="flex-1">
                  {adding ? "Saving..." : "Save Word"}
                </Button>
                <Button variant="secondary" onClick={() => setAddOpen(false)} className="flex-1">Cancel</Button>
              </div>
              {addMsg && <div className="text-center text-sm text-emerald-600">{addMsg}</div>}
            </div>
          </div>
        </div>
      )}

      {error && <pre className="text-xs text-red-600 bg-red-50 p-3 rounded">{error}</pre>}
      {!activePair && <div className="text-center text-sm text-zinc-500">Select a pair in the header to get started.</div>}
    </div>
  );
}
