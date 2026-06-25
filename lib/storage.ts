"use client";

const BOOKMARKS_KEY = "md-book-bookmarks";
const PROGRESS_KEY = "md-book-progress";
const CUSTOM_BOOKS_KEY = "md-book-custom";

export interface Bookmark {
  bookId: string;
  bookName: string;
  filePath: string;
  title: string;
  timestamp: number;
}

export interface ReadingProgress {
  bookId: string;
  filePath: string;
  timestamp: number;
}

export interface CustomBook {
  id: string;
  name: string;
  owner: string;
  repo: string;
  branch: string;
  path: string;
  addedAt: number;
}

function parseGitHubUrl(url: string): { owner: string; repo: string; branch: string; path: string } | null {
  try {
    const u = new URL(url);
    if (u.hostname !== "github.com") return null;
    const segments = u.pathname.replace(/^\/|\/$/g, "").split("/");
    if (segments.length < 2) return null;
    const owner = segments[0];
    const repo = segments[1].replace(/\.git$/, "");
    const treeIdx = segments.indexOf("tree");
    let branch = "main";
    let path = "";
    if (treeIdx !== -1 && segments.length > treeIdx + 1) {
      branch = segments[treeIdx + 1];
      path = segments.slice(treeIdx + 2).join("/");
    }
    return { owner, repo, branch, path };
  } catch {
    return null;
  }
}

function deriveBookId(owner: string, repo: string, branch: string, path: string): string {
  return `gh__${owner}__${repo}__${branch}${path ? `__${path.replace(/\//g, "__")}` : ""}`;
}

export function bookIdFromSlug(slug: string[]): string | null {
  if (slug.length === 0) return null;
  if (slug[0] === "gh" && slug.length >= 4) {
    return deriveBookId(slug[1], slug[2], slug[3], slug.slice(4).join("/"));
  }
  return slug[0];
}

export function parseBookSlug(slug: string[]): { config: { owner: string; repo: string; branch: string; path: string }; bookId: string } | null {
  if (slug.length < 1) return null;
  if (slug[0] === "gh" && slug.length >= 4) {
    const owner = slug[1];
    const repo = slug[2];
    const branch = slug[3];
    const path = slug.slice(4).join("/");
    const bookId = deriveBookId(owner, repo, branch, path);
    return {
      config: { owner, repo, branch, path },
      bookId,
    };
  }
  return null;
}

export { parseGitHubUrl, deriveBookId };

export function getBookmarks(): Bookmark[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function addBookmark(b: Bookmark): void {
  const list = getBookmarks().filter((x) => !(x.bookId === b.bookId && x.filePath === b.filePath));
  list.push(b);
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list));
}

export function removeBookmark(bookId: string, filePath: string): void {
  const list = getBookmarks().filter((x) => !(x.bookId === bookId && x.filePath === filePath));
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list));
}

export function isBookmarked(bookId: string, filePath: string): boolean {
  return getBookmarks().some((x) => x.bookId === bookId && x.filePath === filePath);
}

export function getReadingProgress(bookId: string): ReadingProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const all = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
    return all[bookId] || null;
  } catch {
    return null;
  }
}

export function saveReadingProgress(bookId: string, filePath: string): void {
  if (typeof window === "undefined") return;
  try {
    const all = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
    all[bookId] = { bookId, filePath, timestamp: Date.now() };
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
  } catch {}
}

export function getCustomBooks(): CustomBook[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_BOOKS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function addCustomBook(owner: string, repo: string, branch: string, path: string): CustomBook {
  const id = deriveBookId(owner, repo, branch, path);
  const name = path
    ? `${owner}/${repo}/${path}`
    : `${owner}/${repo}`;
  const book: CustomBook = { id, name, owner, repo, branch, path, addedAt: Date.now() };
  const list = getCustomBooks().filter((b) => b.id !== id);
  list.push(book);
  localStorage.setItem(CUSTOM_BOOKS_KEY, JSON.stringify(list));
  return book;
}
