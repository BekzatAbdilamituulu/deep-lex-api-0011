import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function HealthPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/health");
      setData(res.data);
    } catch (e) {
      setError(e?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>API Health</h1>

      <button onClick={load} disabled={loading}>
        {loading ? "Loading..." : "Refresh"}
      </button>

      {error && (
        <pre style={{ marginTop: 16, padding: 12, background: "#ffecec" }}>
          {error}
        </pre>
      )}

      {data && (
        <pre style={{ marginTop: 16, padding: 12, background: "#f5f5f5" }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}