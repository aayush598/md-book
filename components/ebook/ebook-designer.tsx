"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { saveProjectMeta, saveProjectContent, loadAllContent, type EbookProject } from "@/lib/ebook-storage";
import ContentEditor from "./content-editor";
import EbookPreview from "./ebook-preview";
import TemplateSelector from "./template-selector";
import CoverEditor from "./cover-editor";
import ExportPanel from "./export-panel";
import ThemeEditor from "./theme-editor";
import MetadataEditor from "./metadata-editor";
import AnalyticsPanel from "./analytics-panel";
import TocGenerator from "./toc-generator";
import ChecksPanel from "./checks-panel";
import NavigationPanel from "./navigation-panel";
import { useKeyboard, ShortcutHelp, type Shortcut } from "@/lib/keyboard-shortcuts";

interface EbookDesignerProps {
  project: EbookProject;
  onBack: () => void;
}

type RightTab = "template" | "cover" | "export" | "theme" | "metadata" | "analytics" | "toc" | "checks" | "navigation";

export default function EbookDesigner({ project: initialProject, onBack }: EbookDesignerProps) {
  const [project, setProject] = useState<EbookProject>(initialProject);
  const [loading, setLoading] = useState(true);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [rightTab, setRightTab] = useState<RightTab>("template");
  const [leftWidth, setLeftWidth] = useState(340);
  const [rightWidth, setRightWidth] = useState(300);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [projectName, setProjectName] = useState(project.name);
  const [activeChapterId, setActiveChapterId] = useState<string | undefined>();
  const dirtyRef = useRef<Set<string>>(new Set());
  const lastSaveRef = useRef(0);

  const handleChapterClick = useCallback((chapterId: string) => {
    setActiveChapterId(chapterId);
  }, []);

  // Async load all chapter content on mount
  useEffect(() => {
    let cancelled = false;
    async function init() {
      await loadAllContent(initialProject);
      if (!cancelled) {
        setProject({ ...initialProject, chapters: [...initialProject.chapters] });
        setProjectName(initialProject.name);
        setLoading(false);
      }
    }
    init();
    return () => { cancelled = true; };
  }, [initialProject]);

  const updateProject = useCallback((updates: Partial<EbookProject> | ((prev: EbookProject) => Partial<EbookProject>)) => {
    setProject((prev) => {
      const u = typeof updates === "function" ? updates(prev) : updates;
      const next = { ...prev, ...u };
      // Track dirty chapters
      if (u.chapters) {
        for (const ch of u.chapters) {
          if (ch.content) dirtyRef.current.add(ch.id);
        }
      }
      return next;
    });
  }, []);

  // Auto-save: save content to IndexedDB first, then metadata to localStorage
  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(async () => {
      if (dirtyRef.current.size > 0) {
        await saveProjectContent(project);
        dirtyRef.current = new Set();
      }
      saveProjectMeta(project);
    }, 2000);
    return () => clearTimeout(timer);
  }, [project, loading]);

  // Resize handlers (unchanged)
  const initResize = useCallback((ref: React.RefObject<HTMLDivElement | null>, axis: "left" | "right") => {
    return (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = axis === "left" ? leftWidth : rightWidth;

      const onMove = (me: MouseEvent) => {
        const dx = me.clientX - startX;
        const newWidth = axis === "left"
          ? Math.max(200, Math.min(500, startWidth + dx))
          : Math.max(200, Math.min(450, startWidth - dx));
        if (axis === "left") setLeftWidth(newWidth);
        else setRightWidth(newWidth);
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    };
  }, [leftWidth, rightWidth]);

  const [showHelp, setShowHelp] = useState(false);

  const shortcuts: Shortcut[] = useMemo(() => [
    {
      key: "?",
      handler: () => setShowHelp((s) => !s),
      description: "Toggle shortcut help",
      category: "Global",
    },
    {
      key: "s",
      ctrl: true,
      handler: async () => {
        await saveProjectContent(project);
        saveProjectMeta(project);
      },
      description: "Save project",
      category: "Global",
    },
    {
      key: "\\",
      ctrl: true,
      handler: () => setLeftOpen((o) => !o),
      description: "Toggle editor panel",
      category: "Layout",
    },
    {
      key: "\\",
      ctrl: true,
      shift: true,
      handler: () => setRightOpen((o) => !o),
      description: "Toggle settings panel",
      category: "Layout",
    },
    {
      key: "1",
      ctrl: true,
      handler: () => setRightTab("template"),
      description: "Switch to Template tab",
      category: "Layout",
    },
    {
      key: "2",
      ctrl: true,
      handler: () => setRightTab("cover"),
      description: "Switch to Cover tab",
      category: "Layout",
    },
    {
      key: "3",
      ctrl: true,
      handler: () => setRightTab("export"),
      description: "Switch to Export tab",
      category: "Layout",
    },
    {
      key: "Escape",
      handler: onBack,
      description: "Go back to project list",
      category: "Global",
    },
  ], [project, onBack]);

  useKeyboard(shortcuts, !loading);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ background: "var(--bg-page)" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>Loading project content...</span>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-screen w-screen flex flex-col overflow-hidden" style={{ background: "var(--bg-page)" }}>
      {/* Top bar */}
      <header className="shrink-0 flex items-center gap-3 px-4 py-2.5 z-10"
        style={{ background: "var(--bg-content)", borderBottom: "1px solid var(--border-subtle)" }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{ color: "var(--text-tertiary)" }}
          onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back
        </button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg text-white text-xs font-bold"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-soft))" }}
          >
            E
          </div>
          <input
            value={projectName}
            onChange={(e) => { setProjectName(e.target.value); updateProject({ name: e.target.value }); }}
            className="text-sm font-semibold bg-transparent outline-none min-w-0 flex-1"
            style={{ color: "var(--text-primary)" }}
          />
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setLeftOpen(!leftOpen)}
            className="p-2 rounded-lg transition-all"
            style={{ color: leftOpen ? "var(--accent)" : "var(--text-muted)", background: leftOpen ? "var(--accent-bg)" : "transparent" }}
            title="Toggle editor"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
          </button>
          <button
            onClick={() => setRightOpen(!rightOpen)}
            className="p-2 rounded-lg transition-all"
            style={{ color: rightOpen ? "var(--accent)" : "var(--text-muted)", background: rightOpen ? "var(--accent-bg)" : "transparent" }}
            title="Toggle settings"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Left panel - Content Editor */}
        <div
          ref={leftRef}
          className="relative shrink-0 overflow-hidden transition-all duration-300"
          style={{
            width: leftOpen ? leftWidth : 0,
            opacity: leftOpen ? 1 : 0,
          }}
        >
          <div className="h-full w-full overflow-hidden" style={{ borderRight: "1px solid var(--border-subtle)" }}>
            <ContentEditor
              project={project}
              onProjectChange={(p) => setProject(p)}
              activeChapterId={activeChapterId}
              onActiveChapterChange={handleChapterClick}
            />
          </div>
          {leftOpen && (
            <div
              onMouseDown={initResize(leftRef, "left")}
              className="absolute right-0 top-0 bottom-0 z-10 w-2 cursor-col-resize group"
            >
              <div className="absolute inset-y-0 right-0 w-px transition-all group-hover:w-[3px] group-hover:bg-accent/30" style={{ background: "var(--border-subtle)" }} />
            </div>
          )}
        </div>

        {/* Center - Preview */}
        <div className="flex-1 min-w-0">
          <EbookPreview project={project} activeChapterId={activeChapterId} onChapterClick={handleChapterClick} />
        </div>

        {/* Right panel - Settings */}
        <div
          ref={rightRef}
          className="relative shrink-0 overflow-hidden transition-all duration-300"
          style={{
            width: rightOpen ? rightWidth : 0,
            opacity: rightOpen ? 1 : 0,
          }}
        >
          <div className="h-full w-full overflow-hidden" style={{ borderLeft: "1px solid var(--border-subtle)" }}>
            {/* Right panel tabs */}
            <div className="flex shrink-0 overflow-x-auto" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              {[
                { id: "template" as const, label: "Template", icon: "🎨" },
                { id: "theme" as const, label: "Theme", icon: "🎭" },
                { id: "metadata" as const, label: "Meta", icon: "📋" },
                { id: "cover" as const, label: "Cover", icon: "🖼️" },
                { id: "analytics" as const, label: "Stats", icon: "📊" },
                { id: "toc" as const, label: "TOC", icon: "📑" },
                { id: "checks" as const, label: "Checks", icon: "✅" },
                { id: "navigation" as const, label: "Nav", icon: "🧭" },
                { id: "export" as const, label: "Export", icon: "📦" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setRightTab(tab.id)}
                  className="flex-1 py-2.5 text-xs font-medium transition-all"
                  style={{
                    color: rightTab === tab.id ? "var(--accent)" : "var(--text-tertiary)",
                    borderBottom: rightTab === tab.id ? `2px solid var(--accent)` : "2px solid transparent",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex-1 min-h-0 overflow-hidden" style={{ height: "calc(100% - 37px)" }}>
              {rightTab === "template" && (
                <TemplateSelector
                  selectedId={project.templateId}
                  onSelect={(id) => updateProject({ templateId: id })}
                />
              )}
              {rightTab === "theme" && (
                <ThemeEditor
                  project={project}
                  onThemeChange={(theme) => updateProject({ theme })}
                />
              )}
              {rightTab === "cover" && (
                <CoverEditor project={project} onChange={updateProject} />
              )}
              {rightTab === "export" && (
                <ExportPanel
                  project={project}
                  onProjectChange={(p) => setProject(p)}
                />
              )}
              {rightTab === "metadata" && (
                <MetadataEditor
                  project={project}
                  onUpdate={(updates) => updateProject(updates)}
                />
              )}
              {rightTab === "analytics" && (
                <AnalyticsPanel project={project} />
              )}
              {rightTab === "toc" && (
                <TocGenerator
                  project={project}
                  onUpdateToc={(tocHtml) => {
                    const tocCh = project.chapters.find((c) => c.isStandard && c.standardType === "toc");
                    if (tocCh) {
                      const updated = project.chapters.map((c) =>
                        c.id === tocCh.id ? { ...c, content: tocHtml } : c
                      );
                      setProject({ ...project, chapters: updated });
                    }
                  }}
                />
              )}
              {rightTab === "checks" && (
                <ChecksPanel project={project} />
              )}
              {rightTab === "navigation" && (
                <NavigationPanel
                  project={project}
                  activeChapterId={activeChapterId}
                  onChapterClick={handleChapterClick}
                />
              )}
            </div>
          </div>
          {rightOpen && (
            <div
              onMouseDown={initResize(rightRef, "right")}
              className="absolute left-0 top-0 bottom-0 z-10 w-2 cursor-col-resize group"
            >
              <div className="absolute inset-y-0 left-0 w-px transition-all group-hover:w-[3px] group-hover:bg-accent/30" style={{ background: "var(--border-subtle)" }} />
            </div>
          )}
        </div>
      </div>

      {showHelp && <ShortcutHelp shortcuts={shortcuts} onClose={() => setShowHelp(false)} />}
    </div>
  );
}
