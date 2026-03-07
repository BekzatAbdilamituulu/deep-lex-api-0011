import { useEffect, useMemo, useState } from "react";
import Button from "./Button";

function readPairLanguageId(pair, side) {
  if (!pair) return null;

  if (side === "source") {
    return (
      pair.source_language_id ??
      pair.learning_language_id ??
      pair.source_language?.id ??
      pair.learning_language?.id ??
      null
    );
  }

  return (
    pair.target_language_id ??
    pair.native_language_id ??
    pair.target_language?.id ??
    pair.native_language?.id ??
    null
  );
}

function languageLabel(language) {
  if (!language) return "Unknown";
  return language.code ? `${language.name} (${language.code})` : language.name;
}

export default function PairForm({
  languages,
  existingPairs = [],
  initialLearningId = "",
  initialTranslationId = "",
  submitLabel = "Save",
  saving = false,
  error = "",
  onSubmit,
}) {
  const [learningId, setLearningId] = useState(initialLearningId ? String(initialLearningId) : "");
  const [translationId, setTranslationId] = useState(initialTranslationId ? String(initialTranslationId) : "");

  useEffect(() => {
    if (!learningId && initialLearningId) {
      setLearningId(String(initialLearningId));
    }
  }, [learningId, initialLearningId]);

  useEffect(() => {
    if (!translationId && initialTranslationId) {
      setTranslationId(String(initialTranslationId));
    }
  }, [translationId, initialTranslationId]);

  const sameLanguage = useMemo(() => {
    return learningId && translationId && learningId === translationId;
  }, [learningId, translationId]);

  const duplicatePair = useMemo(() => {
    if (!learningId || !translationId || sameLanguage) return false;

    return existingPairs.some((pair) => {
      const sourceId = readPairLanguageId(pair, "source");
      const targetId = readPairLanguageId(pair, "target");
      return String(sourceId) === String(learningId) && String(targetId) === String(translationId);
    });
  }, [existingPairs, learningId, translationId, sameLanguage]);

  const canSubmit = useMemo(() => {
    const learning = Number(learningId);
    const translation = Number(translationId);
    return learning > 0 && translation > 0 && !sameLanguage && !duplicatePair && !saving;
  }, [learningId, translationId, sameLanguage, duplicatePair, saving]);

  function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;

    onSubmit({
      learningId: Number(learningId),
      translationId: Number(translationId),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <label className="grid gap-2">
        <span className="text-sm text-gray-700">Learning language (Front)</span>
        <select
          value={learningId}
          onChange={(e) => setLearningId(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
        >
          <option value="" disabled>
            Select learning language
          </option>
          {languages.map((language) => (
            <option key={language.id} value={language.id}>
              {languageLabel(language)}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-2">
        <span className="text-sm text-gray-700">Translation language (Back)</span>
        <select
          value={translationId}
          onChange={(e) => setTranslationId(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
        >
          <option value="" disabled>
            Select translation language
          </option>
          {languages.map((language) => (
            <option key={language.id} value={language.id}>
              {languageLabel(language)}
            </option>
          ))}
        </select>
      </label>

      {sameLanguage ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Please choose two different languages.
        </div>
      ) : null}

      {duplicatePair ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          This language pair already exists.
        </div>
      ) : null}

      {error ? (
        <pre className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</pre>
      ) : null}

      <div>
        <Button type="submit" variant="primary" disabled={!canSubmit}>
          {saving ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
