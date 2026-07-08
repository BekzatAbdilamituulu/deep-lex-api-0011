import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DecksApi } from "../api/endpoints";
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
        const dRes = await DecksApi.list(100, 0, { pair_id: activePair.id });
        setDecks(dRes.data?.items ?? []);
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
        <p className="text-zinc-600">Review cards from your decks.</p>
      </div>

      {error && <div className="text-red-600">{error}</div>}

      {mainDeck ? (
        <Card>
          <div className="font-semibold mb-1">Main review</div>
          <p className="text-sm text-zinc-600 mb-4">All cards from your main deck.</p>
          <Link to={`/app/study/${mainDeck.id}`}>
            <Button className="w-full">Start Full Review</Button>
          </Link>
        </Card>
      ) : (
        <Card>
          <p>No decks ready yet. Create a deck and add cards.</p>
          <Link to="/app/decks" className="inline-block mt-3"><Button variant="secondary">Go to Decks</Button></Link>
        </Card>
      )}
    </div>
  );
}
