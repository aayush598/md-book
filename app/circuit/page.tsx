import type { Metadata } from "next";
import CircuitStudio from "@/components/circuit-studio";

export const metadata: Metadata = {
  title: "Circuit Studio — ECE schematic preview",
  description: "Design and inspect ECE circuit schematics with schemdraw",
};

export default function Page() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#0d1117",
        color: "#e6e9f0",
        padding: "2rem 1.25rem 4rem",
      }}
    >
      <CircuitStudio />
    </main>
  );
}