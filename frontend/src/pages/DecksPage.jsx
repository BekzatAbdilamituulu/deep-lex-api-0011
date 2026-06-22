import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LanguagesApi, ProgressApi, ReadingSourcesApi } from "../api/endpoints";
import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import { useActivePair } from "../context/ActivePairContext";

function extractError(e) {
  const detail = e?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (e?.response?.data) return JSON.stringify(e.response.data);
  return e?.message ?? "Request failed";
}

function extractDeleteError(e) {
  const detail = String(e?.response?.data?.detail || e?.message || "").toLowerCase();
  if (detail.includes("cards still reference it")) {
    return "This source can't be deleted because saved words still reference it. Delete or move those words first.";
  }
  return extractError(e);
}

function langLabel(l) {
  if (!l) return "?";
  return `${l.name}${l.code ? ` (${l.code})` : ""}`;
}

function normalizeSourceStats(source) {
  return {
    ...source,
    total_cards: Number(source?.total_cards ?? source?.cards_count ?? source?.word_count ?? 0),
    due_cards: Number(source?.due_cards ?? source?.due_count ?? 0),
  };
}

export default function SourcesPage() {
  const nav = useNavigate();
  const { activePair, loading: activePairLoading } = useActivePair();

  const [sourcesPage, setSourcesPage] = useState(null);
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [kind, setKind] = useState("");
  const [reference, setReference] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingSourceId, setEditingSourceId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAuthor, setEditAuthor] = useState("");
  const [editKind, setEditKind] = useState("");
  const [editReference, setEditReference] = useState("");
  const [savingSourceId, setSavingSourceId] = useState(null);
  const [deletingSourceId, setDeletingSourceId] = useState(null);

  // Polish: local search/filter + modal CRUD + feedback
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [toast, setToast] = useState(null); // simple feedback {message, type}

  const langById = useMemo(() => {
    const m = new Map();
    for (const l of languages) m.set(l.id, l);
    return m;
  }, [languages]);

  const activeLearning = activePair ? langById.get(activePair.source_language_id) : null;
  const activeTranslation = activePair ? langById.get(activePair.target_language_id) : null;

  async function load() {
    if (!activePair?.id) {
      setSourcesPage({ items: [], meta: { total: 0, has_more: false, offset: 0, limit: 50 } });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [sourcesRes, langsRes] = await Promise.all([
        ReadingSourcesApi.list({ pair_id: activePair.id, include_stats: true, limit: 200, offset: 0 }),
        LanguagesApi.list(),
      ]);
      const payload = sourcesRes.data ?? { items: [] };
      const items = Array.isArray(payload?.items) ? payload.items.map(normalizeSourceStats) : [];
      setSourcesPage({
        ...payload,
        items,
      });
      setLanguages(langsRes.data ?? []);
    } catch (e) {
      setError(extractError(e));
    } finally {
      setLoading(false);
    }
  }

  async function createSource(e) {
    e.preventDefault();
    if (!activePair?.id) {
      setError("Select an active learning pair before creating a source.");
      return;
    }
    if (!title.trim()) return;

    const newSource = {
      id: `temp-${Date.now()}`,
      title: title.trim(),
      author: author.trim() || null,
      kind: kind.trim() || null,
      reference: reference.trim() || null,
      total_cards: 0,
      due_cards: 0,
    };

    // Optimistic add
    const prevSources = sourcesPage?.items || [];
    setSourcesPage({ ...(sourcesPage || {}), items: [...prevSources, newSource] });

    setCreating(true);
    setError("");
    try {
      await ReadingSourcesApi.create({
        pair_id: activePair.id,
        title: title.trim(),
        author: author.trim() ? author.trim() : null,
        kind: kind.trim() ? kind.trim() : null,
        reference: reference.trim() ? reference.trim() : null,
      });
      setShowCreateModal(false);
      setTitle(""); setAuthor(""); setKind(""); setReference("");
      setToast({ message: "Source created", type: "success" });
      setTimeout(() => setToast(null), 2500);
      await load();
    } catch (e) {
      // revert optimistic
      setSourcesPage({ ...(sourcesPage || {}), items: prevSources });
      setError(extractError(e));
    } finally {
      setCreating(false);
    }
  }

  function startEditSource(source) {
    setEditingSourceId(source.id);
    setEditTitle(source.title ?? "");
    setEditAuthor(source.author ?? "");
    setEditKind(source.kind ?? "");
    setEditReference(source.reference ?? "");
    setError("");
    setShowEditModal(true);
  }

  function cancelEditSource() {
    setEditingSourceId(null);
    setEditTitle("");
    setEditAuthor("");
    setEditKind("");
    setEditReference("");
    setShowEditModal(false);
  }

  async function saveSource(sourceId) {
    if (!editTitle.trim()) return;

    setSavingSourceId(sourceId);
    setError("");
    // Optimistic update
    const prevItems = (sourcesPage?.items || []).map(s => s.id === sourceId ? { ...s, title: editTitle.trim(), author: editAuthor.trim() || null, kind: editKind.trim() || null, reference: editReference.trim() || null } : s);
    setSourcesPage({ ...(sourcesPage || {}), items: prevItems });

    try {
      await ReadingSourcesApi.update(sourceId, {
        title: editTitle.trim(),
        author: editAuthor.trim() ? editAuthor.trim() : null,
        kind: editKind.trim() ? editKind.trim() : null,
        reference: editReference.trim() ? editReference.trim() : null,
      });
      cancelEditSource();
      setToast({ message: "Source updated", type: "success" });
      setTimeout(() => setToast(null), 2000);
      await load();
    } catch (e) {
      setError(extractError(e));
      // reload to revert
      await load();
    } finally {
      setSavingSourceId(null);
    }
  }

  async function deleteSource(source) {
    const ok = window.confirm(`Delete "${source.title}"?`);
    if (!ok) return;

    setDeletingSourceId(source.id);
    setError("");
    try {
      await ReadingSourcesApi.delete(source.id);
      if (editingSourceId === source.id) cancelEditSource();
      await load();
    } catch (e) {
      setError(extractDeleteError(e));
    } finally {
      setDeletingSourceId(null);
    }
  }

  useEffect(() => {
    if (activePairLoading) {
      setLoading(true);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePair?.id, activePairLoading]);

  const allSources = sourcesPage?.items ?? [];
  const filteredSources = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allSources;
    return allSources.filter((s) =>
      (s.title || "").toLowerCase().includes(q) ||
      (s.author || "").toLowerCase().includes(q) ||
      (s.kind || "").toLowerCase().includes(q) ||
      (s.reference || "").toLowerCase().includes(q)
    );
  }, [allSources, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Books & Sources</h1>
          <p className="mt-1 text-sm text-gray-500">Organize saved words by the text where you found them.</p>
          {activePair ? (
            <p className="mt-2 text-sm text-gray-700">
              Active pair: <span className="font-semibold">{langLabel(activeLearning)}</span> →{" "}
              <span className="font-semibold">{langLabel(activeTranslation)}</span>
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sources..."
            className="w-48"
          />
          <Button onClick={() => setShowCreateModal(true)} disabled={!activePair}>+ Add Source</Button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`rounded-xl px-4 py-2 text-sm ${toast.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700"}`}>
          {toast.message}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !creating && setShowCreateModal(false)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Add New Source</h3>
            <form onSubmit={createSource} className="grid gap-4">
              <label className="grid gap-1.5">
                <span className="text-sm text-gray-700">Title *</span>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Book or article title" />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="grid gap-1.5">
                  <span className="text-sm text-gray-700">Author</span>
                  <Input value={author} onChange={(e) => setAuthor(e.target.value)} />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-sm text-gray-700">Kind</span>
                  <Input value={kind} onChange={(e) => setKind(e.target.value)} placeholder="book, article, essay" />
                </label>
              </div>
              <label className="grid gap-1.5">
                <span className="text-sm text-gray-700">Reference</span>
                <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Chapter, page, URL" />
              </label>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={creating || !title.trim()} className="flex-1">
                  {creating ? "Creating..." : "Create Source"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)} disabled={creating} className="flex-1">
                  Cancel
                </Button>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingSourceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !savingSourceId && cancelEditSource()}>
          <div className="w-full max-w-md rounded-3xl bg-white p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Edit Source</h3>
            <div className="grid gap-4">
              <label className="grid gap-1.5">
                <span className="text-sm text-gray-700">Title *</span>
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="grid gap-1.5">
                  <span className="text-sm text-gray-700">Author</span>
                  <Input value={editAuthor} onChange={(e) => setEditAuthor(e.target.value)} />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-sm text-gray-700">Kind</span>
                  <Input value={editKind} onChange={(e) => setEditKind(e.target.value)} />
                </label>
              </div>
              <label className="grid gap-1.5">
                <span className="text-sm text-gray-700">Reference</span>
                <Input value={editReference} onChange={(e) => setEditReference(e.target.value)} />
              </label>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => saveSource(editingSourceId)}
                  disabled={savingSourceId === editingSourceId || !editTitle.trim()}
                  className="flex-1"
                >
                  {savingSourceId === editingSourceId ? "Saving..." : "Save Changes"}
                </Button>
                <Button variant="secondary" onClick={cancelEditSource} disabled={savingSourceId === editingSourceId} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && !showCreateModal ? (
        <pre className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</pre>
      ) : null}

      {loading || activePairLoading ? (
        <p className="text-sm text-gray-500">Loading sources...</p>
      ) : !activePair ? (
        <Card>
          <p className="text-sm text-gray-600">Select an active pair to view sources.</p>
        </Card>
      ) : filteredSources.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-600">{search ? "No sources match your search." : "No sources yet. Add your first book or text source."}</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredSources.map((source) => {
            const lang = source.language || null;
            return (
              <Card
                key={source.id}
                className="cursor-pointer transition-all hover:shadow-lg border-zinc-200 active:scale-[0.985]"
                onClick={() => nav(`/app/sources/${source.id}`)}
              >
                <div className="space-y-1">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="text-lg font-semibold tracking-tight pr-2 line-clamp-2">{source.title}</h3>
                    <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-medium text-zinc-600 whitespace-nowrap">
                      {source.kind || "text"}
                    </span>
                  </div>
                  {source.author && (
                    <p className="text-sm text-zinc-600">{source.author}</p>
                  )}
                  {source.reference && <p className="text-xs text-gray-500">{source.reference}</p>}
                  <div className="flex items-center gap-3 pt-1 text-sm">
                    <span>Words: <span className="font-semibold">{source.total_cards ?? 0}</span></span>
                    <span className="text-amber-600">Due: <span className="font-semibold">{source.due_cards ?? 0}</span></span>
                  </div>
                  {source.last_added_at && (
                    <p className="text-[10px] text-gray-500">Last: {new Date(source.last_added_at).toLocaleDateString()}</p>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2" onClick={e => e.stopPropagation()}>
                  <Button variant="primary" size="sm" onClick={() => nav(`/app/sources/${source.id}`)}>
                    View
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => startEditSource(source)}
                    disabled={deletingSourceId != null || savingSourceId != null}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => deleteSource(source)}
                    disabled={deletingSourceId === source.id || savingSourceId != null}
                  >
                    {deletingSourceId === source.id ? "..." : "Delete"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
