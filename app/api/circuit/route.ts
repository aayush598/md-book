import { spawn } from "node:child_process";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

const VENV_PY = path.join(
  process.env.HOME || process.env.USERPROFILE || ".",
  ".cache",
  "md_book",
  ".circuit-venv",
  "bin",
  "python"
);
const RENDER_SCRIPT = path.join(process.cwd(), "scripts", "render_circuit.py");

interface RenderOut {
  svg: string;
  stderr: string;
  code: number | null;
}

const render = (snippet: string): Promise<RenderOut> =>
  new Promise((resolve, reject) => {
    const child = spawn(VENV_PY, [RENDER_SCRIPT], { cwd: process.cwd() });
    let svg = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (d) => (svg += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", reject);
    const timer = setTimeout(() => child.kill("SIGKILL"), 25_000);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ svg, stderr, code });
    });
    child.stdin.end(snippet);
  });

export async function POST(req: NextRequest): Promise<NextResponse> {
  let snippet: string;
  try {
    const body = (await req.json()) as { code?: unknown };
    snippet = typeof body.code === "string" ? body.code : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!snippet.trim()) {
    return NextResponse.json(
      { error: "Empty snippet — write some schemdraw code first" },
      { status: 400 }
    );
  }

  let out: RenderOut;
  try {
    out = await render(snippet);
  } catch {
    return NextResponse.json(
      { error: "Render couldn't start — is schemdraw installed in .circuit-venv?" },
      { status: 500 }
    );
  }

  if (!out.svg || out.svg.trim().length < 64) {
    const detail = (out.stderr || "renderer produced no output")
      .trim()
      .split("\n")
      .slice(-14)
      .join("\n");
    return NextResponse.json(
      { error: detail || "Rendering failed" },
      { status: 500 }
    );
  }
  return NextResponse.json({ svg: out.svg });
}