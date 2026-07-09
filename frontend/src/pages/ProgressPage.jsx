import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { ProgressApi } from "../api/endpoints";
import { useActivePair } from "../context/ActivePairContext";
import Card from "../components/Card";
import ProgressBar from "../components/ProgressBar";
import Button from "../components/Button";

function extractError(e) {
  if (e?.response?.data) return JSON.stringify(e.response.data);
  return e?.message ?? "Request failed";
}

function formatDateISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shortLabel(dateStr) {
  const [, m, d] = dateStr.split("-");
  return `${m}/${d}`;
}

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
  if (!count) return "#e5e7eb"; // zinc-200
  if (count < 5) return "#86efac"; // green-300
  if (count < 10) return "#4ade80";
  if (count < 20) return "#22c55e";
  return "#15803d";
}

function textClassForCount(count) {
  return count >= 10 ? "text-white" : "text-zinc-900 dark:text-zinc-100";
}

export default function ProgressPage() {
  const { activePair, loading: activePairLoading } = useActivePair();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);
  const [daily, setDaily] = useState([]);
  const [streak, setStreak] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [activeTab, setActiveTab] = useState("summary");

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  const chartData = useMemo(() => {
    return daily.map((d) => ({
      ...d,
      label: shortLabel(d.date),
    }));
  }, [daily]);

  const monthlyMap = useMemo(() => {
    const map = {};
    (monthly?.items || []).forEach((d) => {
      map[d.date] = d.cards_done || 0;
    });
    return map;
  }, [monthly]);

  const monthMatrix = useMemo(() => getMonthMatrix(year, month), [year, month]);

  const monthlyBarData = useMemo(() => {
    return (monthly?.items || []).map((d) => ({
      day: d.date.slice(8, 10),
      cards: d.cards_done || 0,
    }));
  }, [monthly]);

  async function load() {
    if (!activePair?.id) {
      setSummary(null);
      setDaily([]);
      setStreak(null);
      setMonthly(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 29); // ~30 days for daily

    try {
      const params = { pair_id: activePair.id };
      const [summaryRes, dailyRes, streakRes, monthlyRes] = await Promise.all([
        ProgressApi.summary(params),
        ProgressApi.daily(formatDateISO(from), formatDateISO(to), params),
        ProgressApi.streak(params),
        ProgressApi.monthly(year, month, params),
      ]);

      setSummary(summaryRes.data);
      setDaily(dailyRes.data?.items ?? []);
      setStreak(streakRes.data);
      setMonthly(monthlyRes.data);
    } catch (e) {
      setError(extractError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activePairLoading) {
      setLoading(true);
      return;
    }
    if (!activePair?.id) {
      setSummary(null);
      setDaily([]);
      setStreak(null);
      setMonthly(null);
      setLoading(false);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePair?.id, activePairLoading]);

  const totalCards = summary?.total_cards ?? 0;
  const mastered = summary?.total_mastered ?? 0;
  const currentStreak = streak?.current_streak ?? summary?.current_streak ?? 0;
  const bestStreak = streak?.best_streak ?? 0;

  // Simple daily goal example (30 reviews target)
  const dailyGoal = 30;
  const todayDone = summary?.today_cards_done ?? 0;
  const goalPercent = Math.min(100, Math.round((todayDone / dailyGoal) * 100));

  const tabs = [
    { key: "summary", label: "Summary" },
    { key: "daily", label: "Daily" },
    { key: "monthly", label: "Monthly" },
    { key: "streak", label: "Review rhythm" },
  ];

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tighter">Progress</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Your vocabulary memory at a glance</p>
        </div>
        <Button onClick={load} disabled={loading} variant="secondary" size="sm">
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {loading || activePairLoading ? (
        <div className="text-center py-12 text-zinc-500">Loading progress...</div>
      ) : null}

      {!loading && !activePairLoading && !activePair ? (
        <Card>
          <p className="text-sm text-zinc-600">Select an active learning pair to view your progress.</p>
        </Card>
      ) : null}

      {!loading && activePair && (
        <>
          {/* Tabs */}
          <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-700 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-5 py-2 text-sm font-medium whitespace-nowrap transition rounded-t-xl border-b-2 ${
                  activeTab === t.key
                    ? "border-zinc-900 dark:border-white text-zinc-900 dark:text-white"
                    : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* SUMMARY TAB */}
          {activeTab === "summary" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="text-center">
                  <div className="text-sm text-zinc-500">Total Cards</div>
                  <div className="text-6xl font-semibold tracking-tighter mt-2">{totalCards}</div>
                </Card>
                <Card className="text-center">
                  <div className="text-sm text-zinc-500">Mastered</div>
                  <div className="text-6xl font-semibold tracking-tighter mt-2 text-emerald-600 dark:text-emerald-400">{mastered}</div>
                </Card>
                <Card className="text-center">
                  <div className="text-sm text-zinc-500">Review Rhythm</div>
                  <div className="text-6xl font-semibold tracking-tighter mt-2">{currentStreak}</div>
                </Card>
                <Card className="text-center">
                  <div className="text-sm text-zinc-500">Best Review Run</div>
                  <div className="text-6xl font-semibold tracking-tighter mt-2">{bestStreak}</div>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card>
                  <div className="text-sm text-zinc-500 mb-1">Today Reviewed</div>
                  <div className="text-4xl font-semibold">{summary?.today_cards_done ?? 0}</div>
                  <div className="text-xs text-zinc-500 mt-3">reviews completed</div>
                </Card>
                <Card>
                  <div className="text-sm text-zinc-500 mb-1">New Words Today</div>
                  <div className="text-4xl font-semibold">{summary?.today_new_done ?? 0}</div>
                </Card>
                <Card>
                  <div className="text-sm text-zinc-500 mb-3">Daily Goal</div>
                  <ProgressBar
                    value={todayDone}
                    max={dailyGoal}
                    label={`${todayDone} / ${dailyGoal} words`}
                    fillClassName="bg-emerald-600 dark:bg-emerald-400"
                  />
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">{goalPercent}% complete</div>
                </Card>
              </div>

              <Card>
                <div className="text-sm text-zinc-500 mb-3">Memory Strength</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: "New", value: summary?.total_new ?? 0, color: "bg-amber-500" },
                    { label: "Learning", value: summary?.total_learning ?? 0, color: "bg-sky-500" },
                    { label: "Mastered", value: summary?.total_mastered ?? 0, color: "bg-emerald-600" },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="text-sm text-zinc-500">{item.label}</div>
                      <div className="text-3xl font-semibold mt-1">{item.value}</div>
                      <ProgressBar value={item.value} max={totalCards || 1} fillClassName={item.color} className="mt-2" />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* DAILY TAB */}
          {activeTab === "daily" && (
            <div className="space-y-4">
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="font-semibold">Daily Trend</div>
                    <div className="text-xs text-zinc-500">Last 30 days</div>
                  </div>
                </div>
                <div className="h-80 -mx-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="cards_done" stroke="#18181b" strokeWidth={3} dot={false} name="Cards" />
                      <Line type="monotone" dataKey="reviews_done" stroke="#3b82f6" strokeWidth={2} dot={false} name="Reviews" />
                      <Line type="monotone" dataKey="new_done" stroke="#f59e0b" strokeWidth={2} dot={false} name="New" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {daily.slice(0, 6).map((d, i) => (
                  <Card key={i} className="text-sm">
                    <div className="text-zinc-500">{d.date}</div>
                    <div className="mt-1 flex justify-between">
                      <span>Cards: <strong>{d.cards_done}</strong></span>
                      <span>Reviews: <strong>{d.reviews_done}</strong></span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* MONTHLY TAB */}
          {activeTab === "monthly" && (
            <div className="space-y-6">
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="font-semibold">Monthly Heatmap</div>
                    <div className="text-xs text-zinc-500">{year}-{String(month).padStart(2, "0")} • cards reviewed per day</div>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-zinc-400 mb-1">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                    <div key={d}>{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {monthMatrix.map((date, i) => {
                    if (!date) return <div key={`e-${i}`} className="h-9" />;
                    const key = formatDate(date);
                    const count = monthlyMap[key] || 0;
                    return (
                      <div
                        key={key}
                        title={`${key}: ${count} cards`}
                        className={`h-9 flex items-center justify-center rounded-lg text-xs font-medium transition ${textClassForCount(count)}`}
                        style={{ background: colorForCount(count) }}
                      >
                        {date.getDate()}
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card>
                <div className="font-semibold mb-4">Monthly Activity (Bar)</div>
                <div className="h-64 -mx-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyBarData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="cards" fill="#18181b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          )}

          {/* REVIEW RHYTHM TAB */}
          {activeTab === "streak" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="text-center py-10">
                  <div className="text-sm text-zinc-500 mb-2">Consecutive review days</div>
                  <div className="text-7xl font-semibold tracking-tighter">{currentStreak}</div>
                  <div className="mt-1 text-lg text-emerald-600 dark:text-emerald-400 font-medium">Review Rhythm</div>
                  <div className="text-sm text-zinc-500 mt-1">review days in a row</div>
                </Card>

                <Card className="text-center py-10">
                  <div className="text-6xl font-semibold tracking-tighter">{bestStreak}</div>
                  <div className="mt-3 text-lg text-zinc-600 dark:text-zinc-400 font-medium">Personal Best</div>
                  <div className="text-sm text-zinc-500">Longest review run</div>
                </Card>
              </div>

              <Card>
                <div className="text-sm text-zinc-500">No streaks. No noise. Small daily reviews keep words available.</div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
