import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DecksApi } from "../api/endpoints";
import Card from "../components/Card";
import Button from "../components/Button";
import { useActivePair } from "../context/ActivePairContext";

function isMainDeck(deck) {
  return (
    deck?.deck_type === "main" ||
    deck?.deck_type === "MAIN" ||
    deck?.is_main === true ||
    (typeof deck?.name === "string" && deck.name.toLowerCase().includes("main"))
  );
}

export default function StudyHomePage() {
  const { activePair } = useActivePair();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [decks, setDecks] = useState([]);

  const mainDeck = useMemo(() => {
    if (!decks.length) return null;
    return decks.find(isMainDeck) ?? decks[0];
  }, [decks]);

  useEffect(() => {
    async function load() {
      if (!activePair?.id) {
        setDecks([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const res = await DecksApi.list(200, 0, { pair_id: activePair.id });
        setDecks(res.data?.items ?? []);
      } catch (e) {
        setError(e?.message ?? "Failed to load study decks.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [activePair?.id]);

  return (
    <div className="mx-auto w-full max-w-md">
      <Card className="text-center">
        <h1 className="text-2xl font-bold">Study</h1>
        <p className="mt-2 text-gray-700">Start studying with your active learning pair.</p>

        {loading ? <p className="mt-4 text-sm text-gray-500">Loading study decks...</p> : null}
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        {!loading && !error && !mainDeck ? (
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
            No studyable deck found for the active pair yet.
          </div>
        ) : null}

        {!loading && !error && mainDeck ? (
          <Link to={`/app/study/${mainDeck.id}`} className="mt-4 inline-block w-full">
            <Button variant="primary" className="w-full">Start Study</Button>
          </Link>
        ) : null}

        <Link to="/app/decks" className="mt-3 inline-block w-full">
          <Button variant="secondary" className="w-full">Open Decks</Button>
        </Link>
      </Card>
    </div>
  );
}
