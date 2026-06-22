import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DecksApi, ReadingSourcesApi } from "../api/endpoints";
import { useActivePair } from "../context/ActivePairContext";
import Card from "../components/Card";
import Button from "../components/Button";

function isMainDeck(deck) {
  return deck?.deck_type === "main" || deck?.deck_type === "MAIN" || deck?.is_main === true ||
    (typeof deck?.name === "string" && deck.name.toLowerCase().includes("main"));
}

export default function StudyHomePage() {
  const { activePair } = useActivePair();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [decks, setDecks] = useState([]);
  const [sources, setSources] = useState([]);

  const mainDeck = useMemo(() => decks.find(isMainDeck) ?? decks[0], [decks]);

  useEffect(() => {
    async function load() {
      if (!activePair?.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const [dRes, sRes] = await Promise.all([
          DecksApi.list(100, 0, { pair_id: activePair.id }),
          ReadingSourcesApi.list({ pair_id: activePair.id, include_stats: true, limit: 30 }),
        ]);
        setDecks(dRes.data?.items ?? []);
        setSources(sRes.data?.items ?? []);
      } catch (e) {
        setError(e?.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [activePair?.id]);

  if (loading) return <div className="p-8 text-center">Loading study options...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Study</h1>
        <p className="text-zinc-600">Review words you saved from reading.</p>
      </div>

      {error && <div className="text-red-600">{error}</div>}

      {mainDeck ? (
        <Card>
          <div className="font-semibold mb-1">Main review</div>
          <p className="text-sm text-zinc-600 mb-4">All words from your reading sources.</p>
          <Link to={`/app/study/${mainDeck.id}`}>
            <Button className="w-full">Start Full Review</Button>
          </Link>
        </Card>
      ) : (
        <Card>
          <p>No decks ready yet. Add words from your sources.</p>
          <Link to="/app/sources" className="inline-block mt-3"><Button variant="secondary">Go to Sources</Button></Link>
        </Card>
      )}

      {sources.length > 0 && (
        <div>
          <h2 className="font-medium mb-3 text-sm tracking-wide text-zinc-500">Review by source</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sources.filter(s => (s.total_cards || 0) > 0).slice(0, 6).map(src => (
              <Link 
                key={src.id} 
                to={mainDeck ? `/app/study/${mainDeck.id}?sourceId=${src.id}` : "#"}
                className="block"
              >
                <Card className="hover:shadow-md transition">
                  <div className="font-medium">{src.title}</div>
                  {src.author && <div className="text-xs text-zinc-500">{src.author}</div>}
                  <div className="mt-3 text-sm text-emerald-700">{src.due_cards || 0} due</div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
