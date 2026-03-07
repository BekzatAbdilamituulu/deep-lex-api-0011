import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { UsersApi } from "../api/endpoints";

const ActivePairContext = createContext(undefined);

function parsePairs(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function parseActivePair(data) {
  if (!data) return null;
  if (data.default_learning_pair) return data.default_learning_pair;
  if (data.learning_pair) return data.learning_pair;
  if (data.pair) return data.pair;
  if (data.id) return data;
  return null;
}

function getErrorMessage(error) {
  return error?.response?.data?.detail || error?.message || "Failed to load active learning pair state.";
}

export function ActivePairProvider({ children }) {
  const [pairs, setPairs] = useState([]);
  const [activePair, setActivePairState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshPairs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [pairsResponse, defaultPairResponse] = await Promise.all([
        UsersApi.pairs(),
        UsersApi.defaultPair(),
      ]);
      setPairs(parsePairs(pairsResponse.data));
      setActivePairState(parseActivePair(defaultPairResponse.data));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const setActivePair = useCallback(async (pairId) => {
    setLoading(true);
    setError(null);

    try {
      await UsersApi.setDefaultPair(pairId);
      const [pairsResponse, defaultPairResponse] = await Promise.all([
        UsersApi.pairs(),
        UsersApi.defaultPair(),
      ]);
      setPairs(parsePairs(pairsResponse.data));
      setActivePairState(parseActivePair(defaultPairResponse.data));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoading(true);
      setError(null);

      try {
        const [pairsResponse, defaultPairResponse] = await Promise.all([
          UsersApi.pairs(),
          UsersApi.defaultPair(),
        ]);

        if (cancelled) return;

        setPairs(parsePairs(pairsResponse.data));
        setActivePairState(parseActivePair(defaultPairResponse.data));
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      pairs,
      activePair,
      loading,
      error,
      refreshPairs,
      setActivePair,
    }),
    [pairs, activePair, loading, error, refreshPairs, setActivePair]
  );

  return <ActivePairContext.Provider value={value}>{children}</ActivePairContext.Provider>;
}

export function useActivePair() {
  const context = useContext(ActivePairContext);
  if (!context) {
    throw new Error("useActivePair must be used within an ActivePairProvider");
  }
  return context;
}
