import React, { useState, useEffect } from 'react';
import { 
  Brain, Search, FolderPlus, Tag, Plus, Trash2, ExternalLink, 
  Sparkles, BookOpen, Layers, Download, Check, X
} from 'lucide-react';
import { BrainMemory, Workspace } from '../types';
import { api } from '../services/api';

export const BrainScreen: React.FC = () => {
  const [memories, setMemories] = useState<BrainMemory[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);

  // New Note Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState('personal');
  const [noteWorkspaceId, setNoteWorkspaceId] = useState<string>('');

  // New Workspace Modal state
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsDesc, setNewWsDesc] = useState('');

  useEffect(() => {
    loadData();
  }, [selectedCategory, selectedWorkspace]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [memRes, wsRes] = await Promise.all([
        api.getMemories(
          selectedCategory === 'all' ? undefined : selectedCategory,
          selectedWorkspace === 'all' ? undefined : selectedWorkspace
        ),
        api.getWorkspaces()
      ]);
      setMemories(memRes);
      setWorkspaces(wsRes);
    } catch (e) {
      console.warn("Could not load brain data", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    try {
      setLoading(true);
      const res = await api.searchBrain(searchQuery);
      setSearchResults(res);
    } catch (err) {
      console.warn("Brain search failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim()) return;

    try {
      await api.saveMemory({
        title: noteTitle,
        content: noteContent,
        category: noteCategory,
        workspace_id: noteWorkspaceId || undefined,
        tags: [noteCategory, 'manual_note']
      });
      setShowAddModal(false);
      setNoteTitle('');
      setNoteContent('');
      loadData();
    } catch (e: any) {
      alert(`Could not save memory: ${e.message}`);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;

    try {
      await api.createWorkspace(newWsName, newWsDesc);
      setShowWorkspaceModal(false);
      setNewWsName('');
      setNewWsDesc('');
      loadData();
    } catch (e: any) {
      alert(`Could not create workspace: ${e.message}`);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    if (!window.confirm("Are you sure you want RealityLens to forget this memory?")) return;
    try {
      await api.deleteMemory(id);
      setMemories((prev) => prev.filter((m) => m.id !== id));
      if (searchResults) {
        setSearchResults((prev) => prev?.filter((m) => m.id !== id) || null);
      }
    } catch (e: any) {
      alert(`Delete failed: ${e.message}`);
    }
  };

  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(memories, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "realitylens_brain_export.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const categories = [
    { id: 'all', label: 'All Knowledge' },
    { id: 'college', label: 'College' },
    { id: 'study', label: 'Study & Notes' },
    { id: 'receipt', label: 'Receipts & Money' },
    { id: 'code', label: 'Code & Dev' },
    { id: 'work', label: 'Work' },
    { id: 'personal', label: 'Personal' },
  ];

  const displayedItems = searchResults !== null ? searchResults : memories;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-28 space-y-6 animate-in fade-in duration-300">
      {/* Header & Export */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-violet-400 bg-violet-500/10 px-2.5 py-0.5 rounded-full border border-violet-500/20">
              Personal Knowledge Layer
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white mt-1">
            Personal Brain
          </h1>
          <p className="text-xs text-slate-400">
            Your private, grounded memory index. Zero cross-user sharing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportData}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
            title="Export Brain Data"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-violet-900/30"
          >
            <Plus className="w-4 h-4" /> Add Note
          </button>
        </div>
      </div>

      {/* Natural Language RAG Search Bar */}
      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!e.target.value.trim()) setSearchResults(null);
          }}
          placeholder="Ask your Brain: 'Find the scholarship circular', 'project deadline'..."
          className="w-full bg-[#121522] border border-white/10 rounded-2xl pl-11 pr-24 py-3.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-violet-500 transition shadow-inner"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-4" />
        <button
          type="submit"
          className="absolute right-2.5 top-2.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition"
        >
          Search
        </button>
      </form>

      {/* Workspaces Pill Strip */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
          <span>Workspaces</span>
          <button
            onClick={() => setShowWorkspaceModal(true)}
            className="text-violet-400 hover:text-violet-300 font-semibold lowercase flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> new workspace
          </button>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setSelectedWorkspace('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              selectedWorkspace === 'all'
                ? 'bg-violet-600 text-white shadow-md'
                : 'bg-[#141724] text-slate-400 hover:text-white'
            }`}
          >
            All Workspaces
          </button>
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => setSelectedWorkspace(ws.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedWorkspace === ws.id
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'bg-[#141724] text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              📁 {ws.name}
            </button>
          ))}
        </div>
      </div>

      {/* Categories Filter Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setSelectedCategory(c.id);
              setSearchResults(null);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
              selectedCategory === c.id && searchResults === null
                ? 'bg-white/15 text-white border border-white/20'
                : 'bg-[#12141f] text-slate-400 hover:text-slate-200'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Memory Items Feed */}
      <div className="space-y-3">
        {searchResults !== null && (
          <div className="flex items-center justify-between text-xs text-slate-400 bg-violet-950/20 px-3 py-2 rounded-xl border border-violet-500/20">
            <span>Search results for: "{searchQuery}"</span>
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchResults(null);
              }}
              className="text-violet-400 hover:underline"
            >
              Clear
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            Querying your Brain index...
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="text-center py-14 px-6 rounded-2xl bg-[#11131e] border border-white/5 space-y-2">
            <Brain className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-200">Your Brain is empty.</p>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Scan documents, notices, or save useful notes from your camera to populate your private knowledge layer.
            </p>
          </div>
        ) : (
          displayedItems.map((mem) => (
            <div
              key={mem.id}
              className="p-4 rounded-2xl bg-[#121522] border border-white/5 hover:border-violet-500/30 transition space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-violet-500/20 text-violet-300">
                    {mem.category}
                  </span>
                  {mem.score && (
                    <span className="text-[10px] text-cyan-400 font-mono">
                      Relevance: {Math.round(mem.score * 100)}%
                    </span>
                  )}
                  <span className="text-[11px] text-slate-400">
                    {new Date(mem.created_at).toLocaleDateString()}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteMemory(mem.id)}
                  className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition"
                  title="Forget memory"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <h2 className="text-sm font-bold text-white">{mem.title}</h2>
              <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                {mem.content}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Add Note Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#121522] border border-white/10 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Save Note to Brain</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMemory} className="space-y-3">
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Title (e.g. Exam guidelines, Wi-Fi password)"
                className="w-full bg-[#181c2e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-violet-500"
                required
              />
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Content..."
                rows={4}
                className="w-full bg-[#181c2e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-violet-500"
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={noteCategory}
                  onChange={(e) => setNoteCategory(e.target.value)}
                  className="bg-[#181c2e] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="personal">Personal</option>
                  <option value="college">College</option>
                  <option value="study">Study</option>
                  <option value="receipt">Receipt</option>
                  <option value="code">Code</option>
                </select>

                <select
                  value={noteWorkspaceId}
                  onChange={(e) => setNoteWorkspaceId(e.target.value)}
                  className="bg-[#181c2e] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="">No Workspace</option>
                  {workspaces.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition"
                >
                  Save Memory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Workspace Modal */}
      {showWorkspaceModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#121522] border border-white/10 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Create New Workspace</h3>
              <button onClick={() => setShowWorkspaceModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkspace} className="space-y-3">
              <input
                type="text"
                value={newWsName}
                onChange={(e) => setNewWsName(e.target.value)}
                placeholder="Workspace Name (e.g. Final Year Project)"
                className="w-full bg-[#181c2e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-violet-500"
                required
              />
              <input
                type="text"
                value={newWsDesc}
                onChange={(e) => setNewWsDesc(e.target.value)}
                placeholder="Optional description"
                className="w-full bg-[#181c2e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-violet-500"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWorkspaceModal(false)}
                  className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
