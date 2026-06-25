"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Book, getBookConfig, getBookTree, fetchFileContent, normalizeName } from "@/lib/github";
import { useReadingSettings, type FontSize } from "@/lib/reading-settings";
import Sidebar from "@/components/sidebar";
import MarkdownViewer from "@/components/markdown-viewer";
import ReadingControls from "@/components/reading-controls";
import ChapterDivider from "@/components/chapter-divider";

interface LoadedFile {
  path: string;
  content: string;
  chapterName: string;
  progress: number; // index within chapter
  totalInChapter: number;
}

export default function BookPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookId = params.bookId as string;
  const mainRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showHeader, setShowHeader] = useState(true);
  const lastScrollY = useRef(0);
  const [showControls, setShowControls] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [readingTime, setReadingTime] = useState(0);
  const [initialLoad, setInitialLoad] = useState(true);

  const { fontSize, lineHeight, readingMode, sidebarPinned, setSidebarPinned } = useReadingSettings();

  const [book, setBook] = useState<Book | null>(null);
  const [bookLoading, setBookLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Stacked loaded files for infinite scroll
  const [loadedFiles, setLoadedFiles] = useState<LoadedFile[]>([]);
  const [anchorFile, setAnchorFile] = useState<string | null>(null);
  const [loadingNext, setLoadingNext] = useState(false);
  const [allFiles, setAllFiles] = useState<{ path: string; chapterName: string; progress: number; totalInChapter: number }[]>([]);

  const config = useMemo(() => getBookConfig(bookId), [bookId]);
  const configId = config?.id;

  // Load book
  useEffect(() => {
    if (!config) {
      setError("Book not found");
      setBookLoading(false);
      return;
    }
    if (loadedRef.current) return;
    loadedRef.current = true;
    setBookLoading(true);
    getBookTree(config)
      .then((b) => {
        setBook(b);
        // Build flat file list
        const flat = b.chapters.flatMap((ch) =>
          ch.files.map((f, i) => ({
            path: f.path,
            chapterName: ch.shortName,
            progress: i + 1,
            totalInChapter: ch.files.length,
          }))
        );
        setAllFiles(flat);

        const fileParam = searchParams.get("file");
        let startPath: string | null = null;
        if (fileParam) {
          startPath = decodeURIComponent(fileParam);
        } else if (flat.length > 0) {
          startPath = flat[0].path;
        }
        if (startPath) {
          setAnchorFile(startPath);
          loadFileRange(flat, startPath, 1);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setBookLoading(false));
  }, [configId]);

  // Load a range of files starting from anchor
  function loadFileRange(
    flat: { path: string; chapterName: string; progress: number; totalInChapter: number }[],
    anchor: string,
    count: number
  ) {
    if (!config) return;
    const startIdx = flat.findIndex((f) => f.path === anchor);
    if (startIdx === -1) return;
    const toLoad = flat.slice(startIdx, startIdx + count);
    const loaded: LoadedFile[] = [];
    const cfg = config;

    let loadIndex = 0;
    function loadNext() {
      if (loadIndex >= toLoad.length) {
        setLoadedFiles(loaded);
        setBookLoading(false);
        setInitialLoad(false);
        return;
      }
      const f = toLoad[loadIndex];
      fetchFileContent(cfg, f.path)
        .then((text) => {
          loaded.push({ ...f, content: text });
          loadIndex++;
          loadNext();
        })
        .catch(() => {
          loaded.push({ ...f, content: "> *Error loading this file.*" });
          loadIndex++;
          loadNext();
        });
    }
    loadNext();
  }

  // Load next file (infinite scroll)
  const loadNextFile = useCallback(() => {
    if (loadingNext || !config) return;
    const lastLoaded = loadedFiles[loadedFiles.length - 1];
    if (!lastLoaded) return;
    const lastIdx = allFiles.findIndex((f) => f.path === lastLoaded.path);
    if (lastIdx === -1 || lastIdx >= allFiles.length - 1) return;

    setLoadingNext(true);
    const next = allFiles[lastIdx + 1];
    const cfg = config;
    fetchFileContent(cfg, next.path)
      .then((text) => {
        setLoadedFiles((prev) => [...prev, { ...next, content: text }]);
        setLoadingNext(false);
      })
      .catch(() => {
        setLoadedFiles((prev) => [...prev, { ...next, content: "> *Error loading this file.*" }]);
        setLoadingNext(false);
      });
  }, [loadingNext, config, loadedFiles, allFiles]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (readingMode !== "scroll") return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadNextFile();
        }
      },
      { rootMargin: "400px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadNextFile, readingMode, loadedFiles.length]);

  // Calculate reading time for first loaded file
  useEffect(() => {
    if (loadedFiles.length > 0) {
      const words = loadedFiles[0].content.split(/\s+/).length;
      setReadingTime(Math.max(1, Math.ceil(words / 200)));
    }
  }, [loadedFiles.length > 0 ? loadedFiles[0].content : null]);

  // Scroll handler
  const handleScroll = useCallback(() => {
    const el = mainRef.current;
    if (!el) return;
    const scrollTop = el.scrollTop;
    const scrollHeight = el.scrollHeight - el.clientHeight;
    setScrollProgress(scrollHeight > 0 ? scrollTop / scrollHeight : 0);
    setShowBackToTop(scrollTop > 400);

    if (scrollTop > 80) {
      if (scrollTop > lastScrollY.current + 10) setShowHeader(false);
      else if (scrollTop < lastScrollY.current - 10) setShowHeader(true);
    } else setShowHeader(true);
    lastScrollY.current = scrollTop;
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!book) return;
      if (e.key === "Escape") setSidebarOpen(false);
      else if (e.key === "b") setSidebarOpen((v) => !v);
      else if (e.key === "t") setShowControls((v) => !v);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [book]);

  // Jump to file from sidebar
  const handleFileSelect = useCallback(
    (_chapter: unknown, filePath: string) => {
      if (!config) return;
      if (readingMode === "page") {
        setIsTransitioning(true);
        setTimeout(() => {
          router.push(`/book/${bookId}?file=${encodeURIComponent(filePath)}`);
          setAnchorFile(filePath);
          loadFileRange(allFiles, filePath, 1);
          setIsTransitioning(false);
        }, 200);
      } else {
        router.push(`/book/${bookId}?file=${encodeURIComponent(filePath)}`);
        setAnchorFile(filePath);
        loadFileRange(allFiles, filePath, readingMode === "scroll" ? 2 : 1);
      }
      if (mainRef.current) mainRef.current.scrollTop = 0;
    },
    [bookId, config, readingMode, allFiles]
  );

  const currentIdx = anchorFile ? allFiles.findIndex((f) => f.path === anchorFile) : -1;

  const fontSizeClass: Record<FontSize, string> = {
    sm: "text-[0.9375rem]", base: "text-[1.0625rem]", lg: "text-[1.1875rem]", xl: "text-[1.375rem]", "2xl": "text-[1.5rem]",
  };

  if (!config) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "var(--bg-page)" }}>
        <div className="text-center">
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Book not found</p>
          <a href="/" className="mt-2 inline-block text-xs" style={{ color: "var(--accent)" }}>Go back home</a>
        </div>
      </div>
    );
  }

  if (bookLoading && initialLoad) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "var(--bg-page)" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border-default)] border-t-[var(--accent)]" />
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>Loading book...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "var(--bg-page)" }}>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--accent-bg)" }}>
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: "var(--accent)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Failed to load book</p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!book || loadedFiles.length === 0) return null;

  return (
    <div className="flex h-screen" style={{ background: "var(--bg-page)" }}>
      <div className="ambient-bg" />

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-[60] h-[2px] bg-[var(--border-subtle)]/50">
        <div
          className="h-full transition-all duration-150"
          style={{ width: `${scrollProgress * 100}%`, background: "linear-gradient(90deg, var(--accent), var(--accent-soft))" }}
        />
      </div>

      {/* Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          showHeader ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        }`}
        style={{ background: "var(--glass-bg)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-3 px-4 py-2.5">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <a href="/" className="flex items-center gap-1.5 text-xs font-medium transition-colors" style={{ color: "var(--text-tertiary)" }}
               onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-secondary)"}
               onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-tertiary)"}>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
              Books
            </a>
            <span style={{ color: "var(--text-muted)" }} className="text-xs">/</span>
            <span className="truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>{book.name}</span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => setShowControls(!showControls)}
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
              style={{ color: showControls ? "var(--accent)" : "var(--text-tertiary)", background: showControls ? "var(--accent-bg)" : "transparent" }}
              onMouseEnter={(e) => !showControls && (e.currentTarget.style.background = "var(--bg-hover)")}
              onMouseLeave={(e) => !showControls && (e.currentTarget.style.background = "transparent")}
              title="Reading settings (T)"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
              </svg>
            </button>

            {currentIdx !== -1 && (
              <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>
                <span className="flex h-6 min-w-[22px] items-center justify-center rounded-md px-1.5" style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}>
                  {currentIdx + 1}
                </span>
                <span>/ {allFiles.length}</span>
                {readingTime > 0 && (
                  <>
                    <span className="hidden sm:inline mx-0.5" style={{ color: "var(--text-muted)" }}>·</span>
                    <span className="hidden sm:inline" style={{ color: "var(--text-muted)" }}>{readingTime} min</span>
                  </>
                )}
              </div>
            )}

            <button
              onClick={() => setSidebarPinned(!sidebarPinned)}
              className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
              style={{ color: sidebarPinned ? "var(--accent)" : "var(--text-tertiary)" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              title={sidebarPinned ? "Unpin sidebar" : "Pin sidebar"}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </button>
          </div>
        </div>

        {showControls && (
          <div className="animate-slide-up border-t px-4 py-2.5 overflow-x-auto" style={{ borderColor: "var(--border-subtle)" }}>
            <ReadingControls />
          </div>
        )}
      </header>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 lg:hidden" style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}
             onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-[280px] transform transition-all duration-300 ease-out ${sidebarPinned ? "lg:relative" : "lg:absolute"} ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <Sidebar chapters={book.chapters} currentFile={anchorFile} onFileSelect={handleFileSelect} />
      </div>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        <main ref={mainRef} onScroll={handleScroll} className="flex-1 overflow-y-auto" style={{ background: "transparent" }} tabIndex={0}>
          <div className="mx-auto max-w-2xl px-6 py-20 sm:px-8 lg:px-10 lg:py-24">

            {/* Stacked content */}
            {loadedFiles.map((file, fileIndex) => {
              const isFirst = fileIndex === 0;
              return (
                <div key={file.path} className="content-section">
                  {/* Chapter header */}
                  <div className={isFirst ? "mb-10 pb-8 border-b" : "mb-8 pb-6"} style={{ borderColor: "var(--border-subtle)" }}>
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider" style={{ color: "var(--accent)" }}>
                      <span>{file.chapterName}</span>
                      {file.totalInChapter > 1 && (
                        <span style={{ color: "var(--text-muted)" }}>· Part {file.progress} of {file.totalInChapter}</span>
                      )}
                    </div>
                    <h1 className="mt-3 text-3xl font-bold tracking-tight leading-tight" style={{ color: "var(--text-primary)" }}>
                      {normalizeName(file.path.split("/").pop() || "")}
                    </h1>
                    {isFirst && readingTime > 0 && (
                      <p className="mt-2 text-sm" style={{ color: "var(--text-tertiary)" }}>{readingTime} min read</p>
                    )}
                  </div>

                  {/* Content */}
                  <div className={`${fontSizeClass[fontSize]} transition-all duration-300`} style={{ lineHeight }}>
                    <MarkdownViewer content={file.content} enableDropcap={isFirst} />
                  </div>

                  {/* Chapter divider (between files) */}
                  {fileIndex < loadedFiles.length - 1 && (
                    <ChapterDivider
                      chapterName={file.chapterName}
                      chapterCount={currentIdx + fileIndex + 1}
                      totalCount={allFiles.length}
                      onContinue={() => {}}
                      loading={false}
                    />
                  )}

                  {/* End of stacked content divider for last file */}
                  {fileIndex === loadedFiles.length - 1 && (
                    <div className="mt-16 pt-6 border-t" style={{ borderColor: "var(--border-subtle)" }}>
                      <div className="flex items-center justify-between">
                        <div>
                          {(currentIdx + fileIndex) > 0 && (
                            <button
                              onClick={() => {
                                const prevFile = loadedFiles[fileIndex - 1];
                                if (prevFile) handleFileSelect(null, prevFile.path);
                              }}
                              className="group flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all shadow-sm hover:-translate-y-0.5"
                              style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
                            >
                              <svg className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                              </svg>
                              <span className="hidden sm:inline">Previous</span>
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowControls(!showControls)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl transition-all"
                            style={{ border: "1px solid var(--border-subtle)", color: "var(--text-tertiary)" }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                            </svg>
                          </button>
                        </div>

                        <div>
                          <button
                            onClick={loadNextFile}
                            disabled={loadingNext || (currentIdx + fileIndex) >= allFiles.length - 1}
                            className="group flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all shadow-sm hover:-translate-y-0.5 disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
                          >
                            {loadingNext ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2" style={{ borderColor: "var(--border-subtle)", borderTopColor: "var(--accent)" }} />
                            ) : (
                              <>
                                <span className="hidden sm:inline">Next</span>
                                <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                </svg>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Auto-load sentinel */}
            <div ref={sentinelRef} className="h-4" />

            {/* Loading indicator for infinite scroll */}
            {loadingNext && (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
                  <div className="h-3 w-3 animate-spin rounded-full border-2" style={{ borderColor: "var(--border-subtle)", borderTopColor: "var(--accent)" }} />
                  Loading more...
                </div>
              </div>
            )}

            {/* End of book */}
            {loadedFiles.length >= allFiles.length && allFiles.length > 0 && (
              <div className="py-12 text-center animate-reveal">
                <div className="mx-auto max-w-sm">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <span className="h-1 w-1 rounded-full" style={{ background: "var(--text-muted)" }} />
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
                    <span className="h-1 w-1 rounded-full" style={{ background: "var(--text-muted)" }} />
                  </div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.15em]" style={{ color: "var(--text-muted)" }}>You&apos;ve reached the end</p>
                  <p className="mt-2 text-sm" style={{ color: "var(--text-tertiary)" }}>All {allFiles.length} files have been read</p>
                  <button
                    onClick={() => {
                      handleFileSelect(null, allFiles[0].path);
                      if (mainRef.current) mainRef.current.scrollTop = 0;
                    }}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium transition-all hover:-translate-y-0.5"
                    style={{ background: "var(--accent-bg)", color: "var(--accent)" }}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Start from beginning
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Back to top */}
      {showBackToTop && (
        <button
          onClick={() => mainRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-xl shadow-lg transition-all hover:-translate-y-0.5"
          style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
          </svg>
        </button>
      )}

      {/* Keyboard hints */}
      <div className="fixed bottom-6 left-6 z-50 hidden sm:flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] shadow-sm"
           style={{ background: "var(--bg-elevated)", color: "var(--text-tertiary)", border: "1px solid var(--border-subtle)" }}>
        <kbd className="rounded border px-1 py-0.5 font-mono text-[10px]" style={{ borderColor: "var(--border-default)", background: "var(--bg-hover)" }}>B</kbd>
        <span>sidebar</span>
        <span className="mx-0.5" style={{ color: "var(--text-muted)" }}>·</span>
        <kbd className="rounded border px-1 py-0.5 font-mono text-[10px]" style={{ borderColor: "var(--border-default)", background: "var(--bg-hover)" }}>T</kbd>
        <span>settings</span>
      </div>
    </div>
  );
}
