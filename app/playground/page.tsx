import type { Metadata } from "next";
import PlaygroundPage from "@/components/viz/playground-page";

export const metadata: Metadata = {
  title: "Playground — visualise your own code",
  description: "Paste any Python code and watch it run step by step, live in your browser",
};

export default function Page() {
  return (
    <main style={{ height: "100dvh", background: "#0d1117" }}>
      <PlaygroundPage />
    </main>
  );
}