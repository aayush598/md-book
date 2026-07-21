export interface RepoFile {
  name: string;
  path: string;
  type: "file" | "dir";
}

export interface BookChapter {
  name: string;
  shortName: string;
  path: string;
  files: RepoFile[];
  depth: number;
}

export interface Book {
  id: string;
  name: string;
  repo: string;
  owner: string;
  branch: string;
  path: string;
  chapters: BookChapter[];
}

export interface BookConfig {
  owner: string;
  repo: string;
  branch: string;
  path: string;
  name: string;
  id: string;
}

const BOOKS_CONFIG: BookConfig[] = [
  {
    owner: "aayush598",
    repo: "learn-techstacks",
    branch: "main",
    path: "samora-ai",
    name: "Samora AI",
    id: "samora-ai",
  },
  {
    owner: "aayush598",
    repo: "learn-techstacks",
    branch: "main",
    path: "subject/os",
    name: "Operating Systems",
    id: "os",
  },
  {
    owner: "aayush598",
    repo: "learn-techstacks",
    branch: "main",
    path: "interview_prep_june/dsa_java",
    name: "DSA Java",
    id: "dsa-java",
  },
  {
    owner: "aayush598",
    repo: "learn-techstacks",
    branch: "main",
    path: "Infosys_SP_DSE_Preparation",
    name: "Infosys SP DSE Preparation",
    id: "infosys-sp-dse",
  },
];

interface GitTreeItem {
  path: string;
  mode: string;
  type: "tree" | "blob";
  sha: string;
  size?: number;
}

export async function getBookTree(config: BookConfig): Promise<Book> {
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/git/trees/${config.branch}?recursive=1`;
  const res = await fetch(url, {
    headers: { Accept: "application/vnd.github.v3+json" },
  });
  if (!res.ok) throw new Error(`Failed to fetch repo tree: ${res.status}`);
  const data = await res.json();
  const items: GitTreeItem[] = data.tree;

  const bookPrefix = config.path ? config.path + "/" : "";

  // Collect all supported files under the book path
  const supportedFiles = items.filter(
    (item) => item.type === "blob" && (config.path ? item.path.startsWith(bookPrefix) : true) && (item.path.endsWith(".md") || item.path.endsWith(".txt"))
  );

  // Group files by their parent directory path
  const chapterMap = new Map<string, { dirPath: string; files: RepoFile[] }>();

  for (const file of supportedFiles) {
    const relativePath = config.path ? file.path.slice(bookPrefix.length) : file.path;
    const parts = relativePath.split("/");
    const fileName = parts.pop()!;
    const dirPath = parts.join("/");
    const fullDirPath = file.path.slice(0, file.path.lastIndexOf("/"));

    if (!chapterMap.has(fullDirPath)) {
      chapterMap.set(fullDirPath, { dirPath: fullDirPath, files: [] });
    }
    chapterMap.get(fullDirPath)!.files.push({
      name: fileName,
      path: file.path,
      type: "file",
    });
  }

  // Add intermediate directory chapters so the tree shows full nesting
  const bookRoot = config.path ? bookPrefix.replace(/\/$/, "") : "";
  const allDirs = Array.from(chapterMap.keys());
  for (const dirPath of allDirs) {
    const parts = dirPath.split("/");
    for (let i = 1; i < parts.length; i++) {
      const parent = parts.slice(0, i).join("/");
      if (parent === bookRoot) continue;
      if (bookRoot && !parent.startsWith(bookRoot)) continue;
      if (!chapterMap.has(parent)) {
        chapterMap.set(parent, { dirPath: parent, files: [] });
      }
    }
  }

  const chapterList: BookChapter[] = [];

  for (const [, { dirPath, files }] of chapterMap) {
    const relativeDir = config.path ? dirPath.slice(bookPrefix.length) : dirPath;
    if (!relativeDir) {
      if (files.length === 0 && config.path) continue;
    }
    const parts = relativeDir.split("/");
    const rawName = parts[parts.length - 1] || config.path?.split("/").pop() || "";
    const name = rawName.replace(/^[\d-]+/, "").replace(/[-_]/g, " ").trim() || rawName.replace(/[-_]/g, " ").trim();

    // Sort files by name
    files.sort((a, b) => a.name.localeCompare(b.name));

    chapterList.push({
      name,
      shortName: name,
      path: dirPath,
      files,
      depth: parts.length,
    });
  }

  // Sort chapters in depth-first order (parent dirs before children, siblings by name)
  chapterList.sort((a, b) => a.path.localeCompare(b.path));

  return {
    id: config.id,
    name: config.name,
    repo: config.repo,
    owner: config.owner,
    branch: config.branch,
    path: config.path,
    chapters: chapterList,
  };
}

export async function fetchFileContent(config: BookConfig, path: string): Promise<string> {
  const url = `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch file ${path}: ${res.status}`);
  return res.text();
}

export function getBookConfig(bookId: string): BookConfig | undefined {
  return BOOKS_CONFIG.find((b) => b.id === bookId);
}

export function getAllBookConfigs(): BookConfig[] {
  return [...BOOKS_CONFIG];
}

export function normalizeName(name: string): string {
  return name
    .replace(/^[\d-]+/, "")
    .replace(/[-_]/g, " ")
    .replace(/\.(md|txt)$/i, "")
    .trim();
}
