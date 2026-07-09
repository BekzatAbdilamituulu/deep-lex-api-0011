import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { AuthApi } from "../api/endpoints";
import { tokens } from "../api/tokens";
import Button from "../components/Button";
import GoogleSignInButton from "../components/GoogleSignInButton";
import { completeSignIn } from "../utils/completeSignIn";

function extractError(e) {
  if (e?.response?.data) return JSON.stringify(e.response.data);
  return e?.message ?? "Request failed";
}

export default function WelcomePage() {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onGoogleCredential(idToken) {
    setBusy(true);
    setError("");

    try {
      const res = await AuthApi.google(idToken);
      await completeSignIn(res.data, nav);
    } catch (e) {
      tokens.clear();
      setError(extractError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-black opacity-95" />
        <div className="relative mx-auto max-w-3xl px-6 pt-16 pb-20 text-center text-white">
          <h1 className="text-5xl font-semibold tracking-tighter sm:text-6xl">
            Remember the words<br />you discover while reading.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-lg text-white/80">
            A calm vocabulary memory companion for serious readers.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/register">
              <Button size="lg" variant="primary" className="w-full sm:w-auto px-8">
                Get started free
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto px-8 bg-white/10 text-white border-white/30 hover:bg-white/20">
                Log in
              </Button>
            </Link>
          </div>

          <div className="mt-6">
            <GoogleSignInButton
              disabled={busy}
              onCredential={onGoogleCredential}
              onError={setError}
            />
          </div>

          {error && (
            <div className="mt-4 text-sm text-red-300">{error}</div>
          )}
        </div>
      </div>

      {/* Feature highlights */}
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { title: "Save from reading", desc: "Save a word from your reading as soon as it stands out." },
            { title: "Remember the moment", desc: "Add the sentence if you want to remember why it mattered." },
            { title: "Review calmly", desc: "Review words collected from your reading with SRS." },
          ].map((f, i) => (
            <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="font-semibold text-lg">{f.title}</div>
              <p className="mt-2 text-sm text-zinc-600">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center text-sm text-zinc-500">
          No streaks. No noise. Just deep vocabulary memory.
        </div>
      </div>
    </div>
  );
}
