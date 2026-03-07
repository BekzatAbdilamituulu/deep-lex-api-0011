import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DecksApi, LanguagesApi, UsersApi } from "../api/endpoints";
import PairForm from "../components/PairForm";
import Card from "../components/Card";
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
      const sourceLabel = (source?.code || source?.name || "source").toLowerCase();
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

  if (loading) return <p>Loading...</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Choose your first language pair</h1>
        <p className="mt-1 text-sm text-gray-600">
          Cards will show learning language on the front and translation on the back.
        </p>
      </div>

      <Card>
        <PairForm
          languages={languages}
          initialLearningId={initialLearningId}
          initialTranslationId={initialTranslationId}
          submitLabel="Continue"
          saving={saving}
          error={error}
          onSubmit={handleSubmit}
        />
      </Card>
    </div>
  );
}
