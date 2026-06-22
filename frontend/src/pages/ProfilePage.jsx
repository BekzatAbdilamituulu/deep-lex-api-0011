import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UsersApi, ProgressApi, AuthApi } from "../api/endpoints";
import { tokens } from "../api/tokens";
import { useActivePair } from "../context/ActivePairContext";
import Button from "../components/Button";
import Card from "../components/Card";
import ProgressBar from "../components/ProgressBar";

function formatDate(d) {
  return d.toISOString().split("T")[0];
}

function getMonthMatrix(year, month) {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);

  const startDay = first.getDay(); // 0=Sun
  const daysInMonth = last.getDate();

  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month - 1, d));
  }

  return cells;
}

function colorForCount(count) {
  if (!count) return "#eee";
  if (count < 5) return "#c6e48b";
  if (count < 10) return "#7bc96f";
  if (count < 20) return "#239a3b";
  return "#196127";
}

function textClassForCount(count) {
  // Use white text for darker cells.
  return count >= 10 ? "text-white" : "text-gray-900 dark:text-zinc-100";
}

function pairLabel(pair) {
  if (!pair) return "Unknown";
  const s = pair.source_language_name || pair.source_language?.name || pair.source_language?.code || pair.source_language_id || "?";
  const t = pair.target_language_name || pair.target_language?.name || pair.target_language?.code || pair.target_language_id || "?";
  return `${s} → ${t}`;
}

export default function ProfilePage() {
  const nav = useNavigate();
  const { activePair, loading: activePairLoading, pairs = [], setActivePair } = useActivePair();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [summary, setSummary] = useState(null);
  const [streak, setStreak] = useState(null);
  const [todayAdded, setTodayAdded] = useState(null);
  const [monthly, setMonthly] = useState(null);

  // Modal for editing goals
  const [goalsModalOpen, setGoalsModalOpen] = useState(false);
  const [goalCardTarget, setGoalCardTarget] = useState(20);
  const [goalNewTarget, setGoalNewTarget] = useState(7);
  const [savingGoals, setSavingGoals] = useState(false);

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  useEffect(() => {
    async function load() {
      if (!activePair?.id) {
        setLoading(false);
        setError("");
        setUser(null);
        setSummary(null);
        setStreak(null);
        setTodayAdded(null);
        setMonthly(null);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const params = { pair_id: activePair.id };
        const [userRes, summaryRes, streakRes, todayAddedRes, monthlyRes] = await Promise.all([
          UsersApi.me(),
          ProgressApi.summary(params),
          ProgressApi.streak(params),
          ProgressApi.todayAdded(params),
          ProgressApi.monthly(year, month, params),
        ]);

        setUser(userRes.data);
        setSummary(summaryRes.data);
        setStreak(streakRes.data);
        setTodayAdded(todayAddedRes.data);
        setMonthly(monthlyRes.data);
      } catch (e) {
        setError(e?.message ?? "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [year, month, activePair?.id]);

  const monthMatrix = useMemo(() => {
    return getMonthMatrix(year, month);
  }, [year, month]);

  const monthlyMap = useMemo(() => {
    const map = {};
    monthly?.items?.forEach((d) => {
      map[d.date] = d.cards_done;
    });
    return map;
  }, [monthly]);

  function openGoalsModal() {
    if (user) {
      setGoalCardTarget(user.daily_card_target ?? 20);
      setGoalNewTarget(user.daily_new_target ?? 7);
      setGoalsModalOpen(true);
    }
  }

  async function saveGoals() {
    setSavingGoals(true);
    setError("");
    try {
      await UsersApi.updateGoals({
        daily_card_target: Number(goalCardTarget),
        daily_new_target: Number(goalNewTarget),
      });
      setGoalsModalOpen(false);
      // reload to get updated user + data
      await load();
    } catch (e) {
      setError(e?.message ?? "Failed to update goals");
    } finally {
      setSavingGoals(false);
    }
  }

  async function onLogout() {
    const refresh = tokens.getRefresh();
    try {
      if (refresh) {
        await AuthApi.logout(refresh);
      }
    } catch {
      // best-effort logout; continue with local token cleanup
    } finally {
      tokens.clear();
      nav("/login", { replace: true });
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">
      {/* Top user card */}
      {user ? (
        <Card className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center text-2xl font-semibold">
              {user.username?.[0]?.toUpperCase() || "U"}
            </div>
            <div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400">Signed in as</div>
              <div className="text-2xl font-semibold tracking-tight">{user.username}</div>
            </div>
          </div>
          <div className="sm:ml-auto flex gap-2">
            <Button variant="secondary" onClick={openGoalsModal}>
              Edit goals
            </Button>
            <Button variant="outline" onClick={onLogout}>
              Logout
            </Button>
          </div>
        </Card>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950 p-3 text-sm text-red-700 dark:text-red-300">{error}</div>
      ) : null}

      {!activePairLoading && !activePair ? (
        <Card>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Select an active pair to view your profile and goals.</p>
        </Card>
      ) : null}

      {activePair?.id && loading ? (
        <Card>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading profile…</p>
        </Card>
      ) : null}

      {!loading && activePair && (
        <>
          {/* Daily Goals */}
          <div>
            <h2 className="text-lg font-semibold mb-3 tracking-tight">Daily Goals</h2>
            <Card>
              {user ? (
                <div className="space-y-5">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Card reviews target</span>
                      <span className="font-medium">{user.daily_card_target} / day</span>
                    </div>
                    <ProgressBar
                      value={summary?.today_cards_done ?? 0}
                      max={user.daily_card_target || 1}
                      fillClassName="bg-emerald-600 dark:bg-emerald-500"
                    />
                    <div className="text-xs text-zinc-500 mt-1">{summary?.today_cards_done ?? 0} done today</div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>New words target</span>
                      <span className="font-medium">{user.daily_new_target} / day</span>
                    </div>
                    <ProgressBar
                      value={summary?.today_new_done ?? 0}
                      max={user.daily_new_target || 1}
                      fillClassName="bg-blue-600 dark:bg-blue-500"
                    />
                    <div className="text-xs text-zinc-500 mt-1">{summary?.today_new_done ?? 0} new today</div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">No goals set yet.</p>
              )}
            </Card>
          </div>

          {/* Learning Pairs */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold tracking-tight">Learning Pairs</h2>
              <Button size="sm" onClick={() => nav("/app/pairs/new")}>+ Add new</Button>
            </div>
            {pairs.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {pairs.map((p) => {
                  const isActive = activePair && p.id === activePair.id;
                  return (
                    <Card
                      key={p.id}
                      className={`cursor-pointer transition ${isActive ? "ring-2 ring-emerald-500" : "hover:border-zinc-300"}`}
                      onClick={() => {
                        if (!isActive) setActivePair(p.id);
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium">{pairLabel(p)}</div>
                          <div className="text-xs text-zinc-500 mt-0.5">ID: {p.id}</div>
                        </div>
                        {isActive && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 font-medium">
                            Active
                          </span>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <p className="text-sm text-zinc-600">No learning pairs yet.</p>
                <Button size="sm" className="mt-3" onClick={() => nav("/app/pairs/new")}>
                  Create your first pair
                </Button>
              </Card>
            )}
          </div>

          {/* Streak summary */}
          {streak && (
            <div>
              <h2 className="text-lg font-semibold mb-3 tracking-tight">Streak</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="text-center">
                  <div className="text-sm text-zinc-500">Current streak</div>
                  <div className="text-6xl font-semibold tracking-tighter mt-1 text-emerald-600 dark:text-emerald-400">
                    {streak.current_streak}
                  </div>
                  <div className="text-xs mt-1">days</div>
                </Card>
                <Card className="text-center">
                  <div className="text-sm text-zinc-500">Best streak</div>
                  <div className="text-6xl font-semibold tracking-tighter mt-1">{streak.best_streak}</div>
                  <div className="text-xs mt-1">days</div>
                </Card>
              </div>
            </div>
          )}

          {/* Summary stats */}
          {summary && (
            <div>
              <h2 className="text-lg font-semibold mb-3 tracking-tight">Overall</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="text-center">
                  <div className="text-sm text-zinc-500">Total cards</div>
                  <div className="text-4xl font-semibold mt-1">{summary.total_cards ?? 0}</div>
                </Card>
                <Card className="text-center">
                  <div className="text-sm text-zinc-500">Mastered</div>
                  <div className="text-4xl font-semibold mt-1 text-emerald-600">{summary.total_mastered ?? 0}</div>
                </Card>
                <Card className="text-center">
                  <div className="text-sm text-zinc-500">Learning</div>
                  <div className="text-4xl font-semibold mt-1 text-sky-600">{summary.total_learning ?? 0}</div>
                </Card>
                <Card className="text-center">
                  <div className="text-sm text-zinc-500">New</div>
                  <div className="text-4xl font-semibold mt-1 text-amber-600">{summary.total_new ?? 0}</div>
                </Card>
              </div>
            </div>
          )}

          {/* Monthly heatmap */}
          {monthly ? (
            <div>
              <h2 className="text-lg font-semibold mb-3 tracking-tight">Monthly Heatmap</h2>
              <Card>
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-3">
                  <div>
                    <div className="font-medium">{year} / {String(month).padStart(2, "0")}</div>
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">Cards reviewed per day</div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-zinc-400 mb-1">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                    <div key={d}>{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {monthMatrix.map((date, i) => {
                    if (!date) return <div key={`empty-${i}`} className="h-8" />;
                    const key = formatDate(date);
                    const count = monthlyMap[key] || 0;
                    const bg = colorForCount(count);
                    return (
                      <div
                        key={key}
                        title={`${key}: ${count} cards`}
                        className={[
                          "h-8 flex items-center justify-center rounded-lg text-xs font-medium transition",
                          textClassForCount(count),
                        ].join(" ")}
                        style={{ background: bg }}
                      >
                        {date.getDate()}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {[0, 4, 9, 19, 20].map((c, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span className="inline-block h-3 w-3 rounded" style={{ background: colorForCount(c + (idx === 4 ? 1 : 0)) }} />
                      {c === 0 ? "0" : `${c}+`}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          ) : null}
        </>
      )}

      {/* Goals edit modal */}
      {goalsModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => !savingGoals && setGoalsModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white dark:bg-zinc-900 p-6 shadow-xl border border-zinc-200 dark:border-zinc-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold mb-1">Edit Daily Goals</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-5">Set your daily targets for reviews and new words.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Daily card reviews target</label>
                <Input
                  type="number"
                  min="1"
                  value={goalCardTarget}
                  onChange={(e) => setGoalCardTarget(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Daily new words target</label>
                <Input
                  type="number"
                  min="0"
                  value={goalNewTarget}
                  onChange={(e) => setGoalNewTarget(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button onClick={saveGoals} disabled={savingGoals} className="flex-1">
                {savingGoals ? "Saving..." : "Save Goals"}
              </Button>
              <Button variant="secondary" onClick={() => setGoalsModalOpen(false)} disabled={savingGoals} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
