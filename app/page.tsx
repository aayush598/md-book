import Link from "next/link";

const books = [
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
];

export default function Home() {
  const totalChapters = books.reduce((a, b) => a + b.chapters, 0);
  const totalFiles = books.reduce((a, b) => a + b.files, 0);

  return (
    <div className="min-h-screen gradient-mesh">
      {/* Nav */}
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
          <div className="flex items-center gap-4">
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

      {/* Hero */}
      <section className="relative pt-28 pb-20 overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-300/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-300/15 rounded-full blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-6 text-center">
          <div className="animate-fade-in inline-flex items-center gap-2 rounded-full border border-violet-200/60 bg-white/60 px-4 py-1.5 text-xs font-medium text-violet-600 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
            {books.length} {books.length === 1 ? "book" : "books"} available
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

          <div className="animate-fade-in animate-fade-in-delay-3 mt-10 flex items-center justify-center gap-4 flex-wrap">
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
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-xs font-medium text-violet-700">{books.length}</span>
              {books.length === 1 ? "book" : "books"}
            </div>
          </div>
        </div>
      </section>

      {/* Books */}
      <section className="relative pb-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="animate-fade-in animate-fade-in-delay-3 mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-800">Available books</h2>
              <p className="mt-0.5 text-sm text-zinc-400">Pick a book and start reading</p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((book) => (
              <Link
                key={book.id}
                href={`/book/${book.id}`}
                className="group relative animate-fade-in animate-fade-in-delay-4"
              >
                <div className="glass-card relative overflow-hidden rounded-2xl p-6 transition-all duration-300 group-hover:translate-y-[-2px]">
                  <div className={`absolute top-0 right-0 h-24 w-24 rounded-bl-full bg-gradient-to-br ${book.gradient} opacity-5 transition-opacity group-hover:opacity-10`} />

                  <div className="flex items-start justify-between">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${book.gradient} text-white shadow-lg`}>
                      {book.icon}
                    </div>
                    <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                      {book.chapters} chapters
                    </span>
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
            ))}
          </div>

          {books.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100">
                <svg className="h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <p className="mt-4 text-sm font-medium text-zinc-500">No books available yet</p>
              <p className="mt-1 text-xs text-zinc-400">Books will appear here once configured</p>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
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
