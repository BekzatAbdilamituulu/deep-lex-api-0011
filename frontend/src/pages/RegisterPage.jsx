import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthApi } from "../api/endpoints";
import { tokens } from "../api/tokens";
import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";

function extractError(e) {
  if (e?.response?.data) return JSON.stringify(e.response.data);
  return e?.message ?? "Request failed";
}

export default function RegisterPage() {
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
      const res = await AuthApi.register(username.trim(), password);
      tokens.set(res.data);
      nav("/onboarding", { replace: true });
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
        <h1 className="text-3xl font-semibold tracking-tighter">Create your account</h1>
        <p className="mt-1 text-sm text-zinc-600">Start building your personal reading vocabulary.</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">Username</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="choose a username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="create a strong password"
            />
          </div>

          <Button type="submit" variant="primary" disabled={busy} className="w-full mt-2" size="lg">
            {busy ? "Creating account..." : "Create account"}
          </Button>

          {error && (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </form>

        <p className="mt-6 text-center text-sm text-zinc-600">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-zinc-900 hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
