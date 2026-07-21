"use client";

import Link from "next/link";
import { useState, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { parseGitHubUrl, addCustomBook, getCustomBooks, type CustomBook } from "@/lib/storage";
import { isSoundMuted, toggleSound, subscribeToSoundMuted } from "@/lib/sounds";

const configuredBooks = [
  {
    id: "samora-ai",
    name: "Samora AI",
    description: "Comprehensive interview questions covering AI agents, LangChain, RAG, vector databases, and modern ML stacks.",
    chapters: 60,
    files: 115,
    gradient: "from-violet-500 to-indigo-600",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    ),
  },
  {
    id: "os",
    name: "Operating Systems",
    description: "Deep dive into OS internals: processes, threads, synchronization, memory management, file systems, deadlocks, and more.",
    chapters: 60,
    files: 88,
    gradient: "from-emerald-500 to-teal-600",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
  {
    id: "dsa-java",
    name: "DSA Java",
    description: "Data structures and algorithms in Java — arrays, linked lists, trees, graphs, sorting, dynamic programming, and interview problems.",
    chapters: 10,
    files: 40,
    gradient: "from-orange-500 to-red-600",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
      </svg>
    ),
  },
  {
    id: "infosys-sp-dse",
    name: "Infosys SP DSE Preparation",
    description: "Preparation material for Infosys SP DSE role — system design, Java, DSA, databases, and interview questions.",
    chapters: 8,
    files: 30,
    gradient: "from-blue-500 to-cyan-600",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
      </svg>
    ),
  },
];

export default function Home() {
  const router = useRouter();
  const soundMuted = useSyncExternalStore(subscribeToSoundMuted, isSoundMuted, () => true);
  const [customBooks, setCustomBooks] = useState<CustomBook[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState("");
  const [importing, setImporting] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setCustomBooks(getCustomBooks()); }, []);

  const totalChapters = configuredBooks.reduce((a, b) => a + b.chapters, 0);
  const totalFiles = configuredBooks.reduce((a, b) => a + b.files, 0);
  const allBooks = [...configuredBooks, ...customBooks.map((b) => ({
    id: b.id,
    name: b.name,
    description: `GitHub: ${b.owner}/${b.repo}${b.path ? "/" + b.path : ""}`,
    chapters: 0,
    files: 0,
    gradient: "from-gray-500 to-slate-600",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
  }))];

  const handleImport = async () => {
    setUrlError("");
    if (!urlInput.trim()) {
      setUrlError("Please enter a GitHub URL");
      return;
    }
    const parsed = parseGitHubUrl(urlInput.trim());
    if (!parsed) {
      setUrlError("Invalid GitHub URL. Use format: https://github.com/owner/repo or https://github.com/owner/repo/tree/branch/path");
      return;
    }
    setImporting(true);
    try {
      addCustomBook(parsed.owner, parsed.repo, parsed.branch, parsed.path);
      setCustomBooks(getCustomBooks());
      setUrlInput("");
      const path = `/book/gh/${parsed.owner}/${parsed.repo}/${parsed.branch}${parsed.path ? "/" + parsed.path : ""}`;
      router.push(path);
    } catch {
      setUrlError("Failed to import book");
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen gradient-mesh">
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-200">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-tight text-zinc-800">md book</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleSound}
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-zinc-100"
              title={soundMuted ? "Unmute sounds" : "Mute sounds"}>
              {soundMuted ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>
            <a
              href="https://github.com/aayush598/learn-techstacks"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full border border-zinc-200/60 bg-white/50 px-4 py-1.5 text-xs font-medium text-zinc-600 transition-all hover:border-zinc-300 hover:bg-white hover:text-zinc-800"
            >
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </a>
          </div>
        </div>
      </nav>

      <section className="relative pt-28 pb-20 overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-300/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-300/15 rounded-full blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-6 text-center">
          <div className="animate-fade-in inline-flex items-center gap-2 rounded-full border border-violet-200/60 bg-white/60 px-4 py-1.5 text-xs font-medium text-violet-600 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
            {allBooks.length} {allBooks.length === 1 ? "book" : "books"} available
          </div>

          <h1 className="animate-fade-in animate-fade-in-delay-1 mt-8 text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
            <span className="text-gradient">Learn faster</span>
            <br />
            <span className="text-zinc-800">with open-source ebooks</span>
          </h1>

          <p className="animate-fade-in animate-fade-in-delay-2 mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-500">
            Turn any GitHub repo into a beautiful, readable ebook. Navigate chapters,
            search topics, and absorb knowledge in a distraction-free reading environment.
          </p>

          {/* Import form */}
          <div className="animate-fade-in animate-fade-in-delay-3 mx-auto mt-10 max-w-xl">
            <div className="glass rounded-2xl p-1.5 flex items-center gap-1.5 shadow-sm">
              <div className="flex-1 flex items-center gap-2 pl-3">
                <svg className="h-4 w-4 shrink-0 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
                <input
                  type="text"
                  placeholder="Paste a GitHub repo URL..."
                  value={urlInput}
                  onChange={(e) => { setUrlInput(e.target.value); setUrlError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleImport(); }}
                  className="w-full bg-transparent py-2 text-sm text-zinc-700 placeholder-zinc-400 outline-none"
                />
              </div>
              <button
                onClick={handleImport}
                disabled={importing}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-200 transition-all hover:from-violet-500 hover:to-indigo-500 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    Import
                  </>
                )}
              </button>
            </div>
            {urlError && (
              <p className="mt-2 text-xs text-red-500 text-left pl-3">{urlError}</p>
            )}
            <p className="mt-2 text-xs text-zinc-400 text-left pl-3">
              e.g., https://github.com/owner/repo or https://github.com/owner/repo/tree/branch/path
            </p>
          </div>

          <div className="animate-fade-in animate-fade-in-delay-3 mt-8 flex items-center justify-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-xs font-medium text-violet-700">{totalChapters}</span>
              chapters
            </div>
            <div className="h-1 w-1 rounded-full bg-zinc-300" />
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-xs font-medium text-violet-700">{totalFiles}</span>
              files
            </div>
            <div className="h-1 w-1 rounded-full bg-zinc-300" />
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-xs font-medium text-violet-700">{allBooks.length}</span>
              {allBooks.length === 1 ? "book" : "books"}
            </div>
          </div>
        </div>
      </section>

      <section className="relative pb-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="animate-fade-in animate-fade-in-delay-3 mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-800">Available books</h2>
              <p className="mt-0.5 text-sm text-zinc-400">Pick a book and start reading</p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {allBooks.map((book) => {
              const isCustom = customBooks.some((b) => b.id === book.id);
              const href = isCustom
                ? `/book/${book.id.replace(/__/g, "/")}`
                : `/book/${book.id}`;
              return (
                <Link
                  key={book.id}
                  href={href}
                  className="group relative animate-fade-in animate-fade-in-delay-4"
                >
                  <div className="glass-card relative overflow-hidden rounded-2xl p-6 transition-all duration-300 group-hover:translate-y-[-2px]">
                    <div className={`absolute top-0 right-0 h-24 w-24 rounded-bl-full bg-gradient-to-br ${book.gradient} opacity-5 transition-opacity group-hover:opacity-10`} />

                    <div className="flex items-start justify-between">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${book.gradient} text-white shadow-lg`}>
                        {book.icon}
                      </div>
                      {isCustom ? (
                        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                          Custom
                        </span>
                      ) : (
                        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                          {book.chapters} chapters
                        </span>
                      )}
                    </div>

                    <h3 className="mt-4 text-lg font-semibold text-zinc-800 transition-colors group-hover:text-violet-600">
                      {book.name}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
                      {book.description}
                    </p>

                    <div className="mt-5 flex items-center gap-1.5 text-sm font-medium text-violet-600">
                      <span>Start reading</span>
                      <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {allBooks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100">
                <svg className="h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <p className="mt-4 text-sm font-medium text-zinc-500">No books available yet</p>
              <p className="mt-1 text-xs text-zinc-400">Import a GitHub repo above to get started</p>
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-zinc-200/60 bg-white/40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-xs text-zinc-400">
          <span>md book &mdash; open-source knowledge</span>
          <div className="flex items-center gap-4">
            <span>Built with Next.js</span>
            <a href="https://github.com/aayush598/learn-techstacks" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-600 transition-colors">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
