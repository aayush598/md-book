"use client";

import { useEffect, useState } from "react";
import { renderCircuit } from "@/lib/viz/pyodide";

const EXAMPLES: { name: string; code: string }[] = [
  {
    name: "Voltage divider",
    code: `V = elm.SourceV().up().label('V_in 10V')
R1 = elm.Resistor().right().label('R1 10k', loc='bottom')
elm.Line().right()
R2 = elm.Resistor().down().label('R2 10k', loc='bottom')
elm.Line().down()
elm.Line().left()
elm.Ground()`,
  },
  {
    name: "RC low-pass",
    code: `V = elm.SourceSin().up().label('1V 1kHz')
elm.Resistor().right().label('R 1k', loc='bottom')
C = elm.Capacitor().down().label('C 1uF  ', loc='bottom')
elm.Line().left()
elm.Ground()
elm.Label().at(V.end).label('Vin', loc='left')
elm.Label().at(C.start).label('Vout', loc='right')`,
  },
  {
    name: "Diode bridge rectifier",
    code: `V = elm.SourceV().up().label('220V')
D1 = elm.Diode().right().label('D1')
D2 = elm.Diode().right().reverse().label('D2', loc='bottom')
elm.Line().right()
elm.Line().down().at(D2.end)
D3 = elm.Diode().down().label('D3', loc='bottom')
elm.Line().down()
elm.Line().left()
elm.Line().left().at(D1.end)
D4 = elm.Diode().down().label('D4', loc='bottom')
elm.Line().left().at(D4.start)
elm.Ground()`,
  },
  {
    name: "Transistor amplifier",
    code: `Vcc = elm.Dot(open=True).label('Vcc = 9V', loc='top')
R1 = elm.Resistor().down().label('R1 100k', loc='bottom').at(Vcc.center)
elm.Line().down().length(2)
Q = elm.BjtNpn().right().anchor('base').label('2N3904', loc='right')
elm.Line().down().length(2)
elm.Resistor().down().label('Re 1k', loc='bottom')
elm.Ground()
elm.Line().up().at(Q.collector).length(6)
Rc = elm.Resistor().up().label('Rc 4.7k', loc='bottom').at(Q.collector)
elm.Dot().label('Vout', loc='right')
elm.Line().up().length(2).at(Rc.start)
elm.Ground().at(Vcc.center)`,
  },
];

export default function CircuitStudio() {
  const [code, setCode] = useState<string>(EXAMPLES[0].code);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const render = async (src?: string) => {
    const source = src ?? code;
    setLoading(true);
    setError(null);
    try {
      setSvg(await renderCircuit(source));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSvg(null);
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    if (!svg) return;
    navigator.clipboard.writeText(svg).then(() => setCopied(true));
  };

  useEffect(() => {
    const timeout = setTimeout(render, 0);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto" }}>
      <header style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>ECE Circuit Studio</h1>
        <p style={{ color: "#8a94a6", fontSize: 13.5, margin: "0.35rem 0 0" }}>
          Draw circuits with <code style={{ color: "#7c9cff" }}>schemdraw</code> — write a snippet, hit render, and
          inspect the schematic.
        </p>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1.4fr)",
          gap: "1.25rem",
          alignItems: "start",
        }}
      >
        <section style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {EXAMPLES.map((ex) => (
              <button
                key={ex.name}
                onClick={() => {
                  setCode(ex.code);
                  setSvg(null);
                  setError(null);
                  render(ex.code);
                }}
                style={{
                  padding: "0.4rem 0.7rem",
                  fontSize: 12.5,
                  borderRadius: 8,
                  border: "1px solid #2a2f3a",
                  background: "#161b22",
                  color: "#b6bfcc",
                  cursor: "pointer",
                }}
              >
                {ex.name}
              </button>
            ))}
          </div>

          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            style={{
              width: "100%",
              minHeight: 300,
              resize: "vertical",
              background: "#0d1117",
              border: "1px solid #2a2f3a",
              borderRadius: 10,
              color: "#d2d9e2",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 12.5,
              lineHeight: 1.6,
              padding: "0.75rem 0.85rem",
            }}
          />

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => render()}
              disabled={loading}
              style={{
                padding: "0.5rem 1rem",
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 8,
                border: "1px solid #7c9cff",
                background: "rgba(124,156,255,0.16)",
                color: "#cfe0ff",
                cursor: loading ? "wait" : "pointer",
              }}
            >
              {loading ? "Rendering…" : "Render circuit"}
            </button>
            <button
              onClick={copy}
              disabled={!svg}
              style={{
                padding: "0.5rem 1rem",
                fontSize: 13,
                borderRadius: 8,
                border: "1px solid #2a2f3a",
                background: "#161b22",
                color: "#b6bfcc",
                cursor: svg ? "pointer" : "not-allowed",
              }}
            >
              {copied ? "Copied!" : "Copy SVG"}
            </button>
          </div>
        </section>

        <section
          style={{
            minWidth: 0,
            border: "1px solid #2a2f3a",
            borderRadius: 12,
            background: "#161b22",
            padding: "1rem",
            minHeight: 320,
          }}
        >
          {error ? (
            <pre
              style={{
                whiteSpace: "pre-wrap",
                color: "#ff9f9f",
                fontSize: 12,
                fontFamily: "ui-monospace, monospace",
                margin: 0,
              }}
            >
              {error}
            </pre>
          ) : svg ? (
            <>
              <div
                dangerouslySetInnerHTML={{ __html: svg }}
                style={{
                  display: "flex",
                  justifyContent: "center",
                  background: "#ffffff",
                  borderRadius: 8,
                  padding: "1rem",
                  overflowX: "auto",
                }}
              />
              <p style={{ color: "#8a94a6", fontSize: 11.5, margin: "0.75rem 0 0" }}>
                Generated by schemdraw, rendered in your browser.
              </p>
            </>
          ) : (
            <p style={{ color: "#8a94a6", fontSize: 13, margin: 0 }}>Press “Render circuit” to preview the schematic.</p>
          )}
        </section>
      </div>
    </div>
  );
}