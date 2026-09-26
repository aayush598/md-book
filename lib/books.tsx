import type { ReactNode } from "react";

// Single source of truth for every book: routing config (owner/repo/branch/path)
// AND the home-page card data. All consumers import from here — never duplicate
// a book entry anywhere else.

export interface BookConfig {
  owner: string;
  repo: string;
  branch: string;
  path: string;
  name: string;
  id: string;
}

export interface BookInfo extends BookConfig {
  description: string;
  chapters: number;
  files: number;
  gradient: string;
  icon: ReactNode;
}

export type BookCard = Pick<
  BookInfo,
  "id" | "name" | "description" | "chapters" | "files" | "gradient" | "icon"
>;

export const BOOKS: BookInfo[] = [
  {
    id: "samora-ai",
    name: "Samora AI",
    owner: "aayush598",
    repo: "learn-techstacks",
    branch: "main",
    path: "samora-ai",
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
    owner: "aayush598",
    repo: "learn-techstacks",
    branch: "main",
    path: "subject/os",
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
    owner: "aayush598",
    repo: "learn-techstacks",
    branch: "main",
    path: "interview_prep_june/dsa_java",
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
    owner: "aayush598",
    repo: "learn-techstacks",
    branch: "main",
    path: "Infosys_SP_DSE_Preparation",
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
  {
    id: "infosys-sp-dse-interview",
    name: "Infosys SP DSE Interview Prep",
    owner: "aayush598",
    repo: "learn-techstacks",
    branch: "main",
    path: "Infosys-SP-DSE-Interview-Prep",
    description: "SP DSE interview prep — DSA, CS fundamentals, Python/FastAPI, AI–ML, system design, DevOps, and aptitude.",
    chapters: 540,
    files: 249,
    gradient: "from-sky-500 to-blue-700",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    id: "isro-cbt-ece",
    name: "ISRO CBT ECE Prep",
    owner: "aayush598",
    repo: "learn-techstacks",
    branch: "main",
    path: "ISRO_CBT_ECE_Prep",
    description: "ISRO CBT ECE exam prep — analog & digital circuits, EM/antennas, communications, DSP, control systems, and engineering math.",
    chapters: 352,
    files: 490,
    gradient: "from-rose-500 to-orange-600",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
      </svg>
    ),
  },
  {
    id: "sql-queries",
    name: "SQL Queries",
    owner: "aayush598",
    repo: "learn-techstacks",
    branch: "main",
    path: "subject/sql-queries",
    description: "SQL interview mastery — fundamentals, joins, window functions, schema design, query optimization, and FAANG-style scenario playbooks.",
    chapters: 5,
    files: 46,
    gradient: "from-cyan-500 to-blue-600",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 5.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
      </svg>
    ),
  },
  {
    id: "freelancing-mastery",
    name: "Freelancing Mastery",
    owner: "aayush598",
    repo: "learn-techstacks",
    branch: "main",
    path: "freelancing-mastery",
    description:
      "Build a high-income freelancing business — mindset, high-income skill mapping, service packaging, client acquisition, proposals, pricing, delivery, recurring revenue, and scaling to an agency.",
    chapters: 17,
    files: 204,
    gradient: "from-amber-400 to-orange-600",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 8.25h16.5v10.5H3.75V8.25zM8.25 8.25V6A1.5 1.5 0 019.75 4.5h4.5A1.5 1.5 0 0115.75 6v2.25M12 11.25v5.25M14.25 13.5c0-1.07-.93-1.75-2.25-1.75S9.75 12.43 9.75 13.5s.93 1.5 2.25 1.75 2.25.68 2.25 1.75-.93 1.75-2.25 1.75-2.25-.68-2.25-1.75" />
      </svg>
    ),
  },
];

export function getBookConfig(bookId: string): BookInfo | undefined {
  return BOOKS.find((b) => b.id === bookId);
}

export function getAllBookInfos(): BookInfo[] {
  return [...BOOKS];
}