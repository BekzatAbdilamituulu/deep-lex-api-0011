import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthApi } from "../api/endpoints";
import { tokens } from "../api/tokens";
import Button from "../components/Button";
import Card from "../components/Card";
import GoogleSignInButton from "../components/GoogleSignInButton";
import Input from "../components/Input";
import { completeSignIn } from "../utils/completeSignIn";

function extractError(e) {
  if (e?.response?.data) return JSON.stringify(e.response.data);
  return e?.message ?? "Request failed";
}

export default function LoginPage() {
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      const res = await AuthApi.login(username.trim(), password);
      await completeSignIn(res.data, nav);
    } catch (e2) {
      tokens.clear();
      setError(extractError(e2));
    } finally {
      setBusy(false);
    }
  }

  async function onGoogleCredential(idToken) {
    setBusy(true);
    setError("");

    try {
      const res = await AuthApi.google(idToken);
      await completeSignIn(res.data, nav);
    } catch (e2) {
      tokens.clear();
      setError(extractError(e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <h1 className="text-3xl font-semibold tracking-tighter">Welcome back</h1>
        <p className="mt-1 text-sm text-zinc-600">Sign in to continue learning.</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">Username</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="yourusername"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" variant="primary" disabled={busy} className="w-full mt-2" size="lg">
            {busy ? "Signing in..." : "Sign in"}
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest text-zinc-400">
              <span className="bg-white px-3">or</span>
            </div>
          </div>

          <GoogleSignInButton
            disabled={busy}
            onCredential={onGoogleCredential}
            onError={setError}
          />

          {error && (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </form>

        <p className="mt-6 text-center text-sm text-zinc-600">
          Don’t have an account?{" "}
          <Link to="/register" className="font-medium text-zinc-900 hover:underline">
            Create one
          </Link>
        </p>
      </Card>
    </div>
  );
}
