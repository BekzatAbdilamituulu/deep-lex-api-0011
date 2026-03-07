import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { UsersApi } from "../api/endpoints";

function parsePairs(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

export default function RequireNoPairs({ children }) {
  const [loading, setLoading] = useState(true);
  const [hasPairs, setHasPairs] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function checkPairs() {
      setLoading(true);
      setError("");
      try {
        const res = await UsersApi.pairs();
        const pairs = parsePairs(res.data);
        if (!cancelled) {
          setHasPairs(pairs.length > 0);
        }
      } catch (e) {
        if (!cancelled) {
          if (e?.response?.data) setError(JSON.stringify(e.response.data));
          else setError(e?.message ?? "Failed to check learning pairs.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    checkPairs();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <p>Loading...</p>;

  if (error) {
    return <pre className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</pre>;
  }

  if (hasPairs) {
    return <Navigate to="/app" replace />;
  }

  return children;
}
