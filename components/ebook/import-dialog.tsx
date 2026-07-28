"use client";

import { useState } from "react";
import { createProject, createProjectFromGithub, saveProject, type EbookProject } from "@/lib/ebook-storage";
import { parseGitHubUrl, addCustomBook } from "@/lib/storage";

interface ImportDialogProps {
  onProject: (project: EbookProject) => void;
  onCancel: () => void;
}

export default function ImportDialog({ onProject, onCancel }: ImportDialogProps) {
  const [tab, setTab] = useState<"paste" | "github">("paste");
  const [name, setName] = useState("");
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    setError("");
    if (!name.trim()) { setError("Book name is required"); return; }

    if (tab === "paste") {
      if (!content.trim()) { setError("Paste some content first"); return; }
      const project = createProject(name.trim(), author.trim() || "Anonymous", content);
      await saveProject(project);
      onProject(project);
      return;
    }

    // GitHub import — preserves folder structure as parts, files as chapters
    if (!url.trim()) { setError("Enter a GitHub URL"); return; }
    const parsed = parseGitHubUrl(url.trim());
    if (!parsed) { setError("Invalid GitHub URL"); return; }
    setLoading(true);
    try {
      addCustomBook(parsed.owner, parsed.repo, parsed.branch, parsed.path);
      const project = await createProjectFromGithub(
        name.trim() || parsed.repo,
        author.trim() || "Anonymous",
        parsed.owner,
        parsed.repo,
        parsed.branch,
        parsed.path || ""
      );
      saveProject(project);
      onProject(project);
    } catch (e: any) {
      setError(e.message || "Failed to import from GitHub");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="mx-4 w-full max-w-2xl rounded-2xl shadow-2xl p-8"
        style={{ background: "var(--bg-content)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>New Ebook Project</h2>
          <button onClick={onCancel} className="p-2 rounded-lg transition-colors" style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: "var(--bg-hover)" }}>
          <button
            onClick={() => setTab("paste")}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tab === "paste" ? "var(--bg-elevated)" : "transparent",
              color: tab === "paste" ? "var(--text-primary)" : "var(--text-tertiary)",
              boxShadow: tab === "paste" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            <span className="mr-1.5">📝</span> Paste Content
          </button>
          <button
            onClick={() => setTab("github")}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tab === "github" ? "var(--bg-elevated)" : "transparent",
              color: tab === "github" ? "var(--text-primary)" : "var(--text-tertiary)",
              boxShadow: tab === "github" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            <span className="mr-1.5">📦</span> Import from GitHub
          </button>
        </div>

        {/* Name / Author */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Book Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Amazing Ebook"
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
              style={{ background: "var(--bg-hover)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)" }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Author</label>
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Jane Doe"
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
              style={{ background: "var(--bg-hover)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)" }}
            />
          </div>
        </div>

        {/* Content area */}
        {tab === "paste" ? (
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Content (Markdown)
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your markdown content here...&#10;&#10;# Chapter 1&#10;Your content...&#10;&#10;# Chapter 2&#10;More content..."
              rows={12}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all resize-y"
              style={{ background: "var(--bg-hover)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)", fontFamily: "var(--font-mono, monospace)" }}
            />
          </div>
        ) : (
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>GitHub Repo URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all mb-2"
              style={{ background: "var(--bg-hover)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)" }}
            />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Supports: owner/repo or full URL with optional /tree/branch/path
            </p>
          </div>
        )}

        {error && (
          <p className="mb-4 text-xs font-medium" style={{ color: "#ef4444" }}>{error}</p>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ color: "var(--text-tertiary)", background: "var(--bg-hover)" }}
            onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-active)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-soft))" }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
            onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Importing...
              </span>
            ) : (
              "Create Project"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
