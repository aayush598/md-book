"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getProjects, getProject, deleteProject, type EbookProject } from "@/lib/ebook-storage";
import ImportDialog from "@/components/ebook/import-dialog";
import EbookDesigner from "@/components/ebook/ebook-designer";

function EbookPageContent() {
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<EbookProject[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [activeProject, setActiveProject] = useState<EbookProject | null>(null);

  useEffect(() => {
    const all = getProjects();
    setProjects(all);
    const openId = searchParams.get("open");
    if (openId) {
      const found = getProject(openId);
      if (found) setActiveProject(found);
    }
  }, [searchParams]);

  const refresh = () => setProjects(getProjects());

  const handleDelete = (id: string) => {
    deleteProject(id);
    refresh();
  };

  if (activeProject) {
    return <EbookDesigner project={activeProject} onBack={() => setActiveProject(null)} />;
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-page)" }}>
      <nav className="flex items-center justify-between px-6 py-3" style={{ background: "var(--bg-content)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg text-white text-xs font-bold"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-soft))" }}
          >
            E
          </div>
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Ebook Designer</span>
        </div>
        <div className="flex items-center gap-3">
          <a href="/" className="text-xs font-medium transition-all" style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => e.currentTarget.style.color = "var(--accent)"}
            onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-tertiary)"}
          >
            ← Back to Books
          </a>
        </div>
      </nav>

      <section className="pt-16 pb-10 px-6 text-center">
        <div className="mx-auto max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium mb-4"
            style={{ background: "var(--accent-bg)", color: "var(--accent)" }}
          >
            🚀 Create & Publish on Amazon KDP
          </div>
          <h1 className="text-3xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
            Design Premium Ebooks
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
            Turn your content into a professional, publication-ready ebook. Choose from expert-crafted templates,
            preview live, and export EPUB ready for Amazon KDP.
          </p>
          <button
            onClick={() => setShowImport(true)}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-soft))" }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
            onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Ebook Project
          </button>
        </div>
      </section>

      <section className="pb-16 px-6 max-w-4xl mx-auto">
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Your Projects {projects.length > 0 && <span className="text-sm font-normal" style={{ color: "var(--text-muted)" }}>({projects.length})</span>}
        </h2>
        {projects.length === 0 ? (
          <div className="flex flex-col items-center py-16 rounded-2xl" style={{ background: "var(--bg-content)", border: "1px dashed var(--border-subtle)" }}>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: "var(--bg-hover)" }}>
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: "var(--text-muted)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <p className="mt-4 text-sm font-medium" style={{ color: "var(--text-tertiary)" }}>No projects yet</p>
            <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>Click &quot;New Ebook Project&quot; to get started</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {[...projects].sort((a, b) => b.updatedAt - a.updatedAt).map((project) => (
              <div key={project.id} className="rounded-xl p-5 transition-all"
                style={{ background: "var(--bg-content)", border: "1px solid var(--border-subtle)" }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                      {project.name}
                    </h3>
                    <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                      By {project.author} · {project.chapters.length} chapters
                    </p>
                    <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                      Updated {new Date(project.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    <button
                      onClick={() => setActiveProject(project)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{ background: "var(--accent-bg)", color: "var(--accent)" }}
                    >
                      Open
                    </button>
                    <button
                      onClick={() => handleDelete(project.id)}
                      className="p-1.5 rounded-lg transition-all"
                      style={{ color: "var(--text-muted)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "#ef4444"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {showImport && (
        <ImportDialog
          onProject={(p) => { setActiveProject(p); setShowImport(false); }}
          onCancel={() => setShowImport(false)}
        />
      )}
    </div>
  );
}

export default function EbookPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-page)" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border-default)] border-t-[var(--accent)]" />
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>Loading...</p>
        </div>
      </div>
    }>
      <EbookPageContent />
    </Suspense>
  );
}
