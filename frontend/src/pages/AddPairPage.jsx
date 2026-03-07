import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LanguagesApi, UsersApi } from "../api/endpoints";
import PairForm from "../components/PairForm";
import Card from "../components/Card";
import { useActivePair } from "../context/ActivePairContext";

function extractError(e) {
  if (e?.response?.data) return JSON.stringify(e.response.data);
  return e?.message ?? "Request failed";
}

function parsePairs(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

export default function AddPairPage() {
  const nav = useNavigate();
  const { activePair, refreshPairs } = useActivePair();

  const [languages, setLanguages] = useState([]);
  const [existingPairs, setExistingPairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [setAsDefault, setSetAsDefault] = useState(true);

  async function load() {
    setLoading(true);
    setError("");

    try {
      const [languagesRes, pairsRes] = await Promise.all([LanguagesApi.list(), UsersApi.pairs()]);
      setLanguages(languagesRes.data ?? []);
      setExistingPairs(parsePairs(pairsRes.data));
    } catch (e) {
      setError(extractError(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit({ learningId, translationId }) {
    setSaving(true);
    setError("");

    try {
      await UsersApi.addPair(learningId, translationId);

      if (setAsDefault) {
        await UsersApi.setDefaults(learningId, translationId);
      }

      await refreshPairs();
      nav("/app", { replace: true });
    } catch (e) {
      setError(extractError(e));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const initialLearningId = useMemo(() => {
    return activePair?.source_language_id ? String(activePair.source_language_id) : "";
  }, [activePair]);

  const initialTranslationId = useMemo(() => {
    return activePair?.target_language_id ? String(activePair.target_language_id) : "";
  }, [activePair]);

  if (loading) return <p>Loading...</p>;

  return (
    <div className="space-y-4">
      <Link to="/app" className="text-sm text-gray-500 underline">
        Back to dashboard
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Add language pair</h1>
        <p className="mt-1 text-sm text-gray-600">Create an additional learning and translation pair.</p>
      </div>

      <Card className="space-y-4">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={setAsDefault}
            onChange={(e) => setSetAsDefault(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          Make this pair my default
        </label>

        <PairForm
          languages={languages}
          existingPairs={existingPairs}
          initialLearningId={initialLearningId}
          initialTranslationId={initialTranslationId}
          submitLabel="Add pair"
          saving={saving}
          error={error}
          onSubmit={handleSubmit}
        />
      </Card>
    </div>
  );
}
