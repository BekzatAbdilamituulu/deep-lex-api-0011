import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DecksApi, LanguagesApi, UsersApi } from "../api/endpoints";
import PairForm from "../components/PairForm";
import Card from "../components/Card";
import ProgressBar from "../components/ProgressBar";
import { useActivePair } from "../context/ActivePairContext";

function extractError(e) {
  if (e?.response?.data) return JSON.stringify(e.response.data);
  return e?.message ?? "Request failed";
}

function findLangIdByCode(langs, code) {
  const targetCode = String(code || "").toLowerCase();
  const hit = langs.find((language) => String(language.code || "").toLowerCase() === targetCode);
  return hit ? String(hit.id) : "";
}

export default function OnboardingPage() {
  const nav = useNavigate();
  const { refreshPairs } = useActivePair();

  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [initialLearningId, setInitialLearningId] = useState("");
  const [initialTranslationId, setInitialTranslationId] = useState("");

  async function loadLanguages() {
    setLoading(true);
    setError("");

    try {
      const res = await LanguagesApi.list();
      const langs = res.data ?? [];
      setLanguages(langs);

      const en = findLangIdByCode(langs, "en");
      const ru = findLangIdByCode(langs, "ru");

      if (en && ru) {
        setInitialLearningId(en);
        setInitialTranslationId(ru);
      } else if (langs.length >= 2) {
        setInitialLearningId(String(langs[0].id));
        const second = langs.find((item) => item.id !== langs[0].id);
        setInitialTranslationId(second ? String(second.id) : String(langs[1].id));
      }
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
      await UsersApi.setDefaults(learningId, translationId);
      await UsersApi.addPair(learningId, translationId);

      const source = languages.find((language) => Number(language.id) === Number(learningId));
      const target = languages.find((language) => Number(language.id) === Number(translationId));
      const sourceLabel = (source?.code || source?.name || "learning").toLowerCase();
      const targetLabel = (target?.code || target?.name || "target").toLowerCase();

      await DecksApi.create({
        name: `My deck (${sourceLabel}→${targetLabel})`,
        source_language_id: learningId,
        target_language_id: translationId,
        deck_type: "users",
      }).catch(() => {});

      await refreshPairs();
      nav("/app", { replace: true });
    } catch (e) {
      setError(extractError(e));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadLanguages();
  }, []);

  if (loading) return (
    <div className="max-w-xl mx-auto p-6">
      <div className="text-center text-sm text-zinc-500">Loading languages…</div>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto p-6 space-y-8">
      {/* Progress indicator */}
      <div>
        <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
          <div>Step 2 of 2</div>
          <div>Choose your languages</div>
        </div>
        <ProgressBar value={100} max={100} fillClassName="bg-zinc-900" />
      </div>

      <div>
        <h1 className="text-3xl font-semibold tracking-tighter">Set up your first pair</h1>
        <p className="mt-2 text-zinc-600">
          Tell us which language you're learning and your native language. We'll create your first deck.
        </p>
      </div>

      <Card>
        <div className="mb-4">
          <div className="uppercase text-xs tracking-widest text-zinc-500 mb-1">Why this matters</div>
          <ul className="text-sm text-zinc-600 space-y-1">
            <li>• Words stay tied to the exact sentence you read</li>
            <li>• Review in the direction that makes sense for you</li>
            <li>• Start capturing vocabulary immediately</li>
          </ul>
        </div>

        <PairForm
          languages={languages}
          initialLearningId={initialLearningId}
          initialTranslationId={initialTranslationId}
          submitLabel="Create my first pair"
          saving={saving}
          error={error}
          onSubmit={handleSubmit}
        />
      </Card>

      <div className="text-center text-xs text-zinc-500">
        You can add more language pairs later from your profile.
      </div>
    </div>
  );
}
