#!/usr/bin/env python3
"""
Headless schemdraw renderer for the mdbooks circuit page.

Reads a schemdraw Python snippet from stdin, executes it against a fresh
schemdraw.Drawing() (plus `schemdraw` and `elm` helpers), and prints the
rendered schematic as SVG to stdout.

The snippet is plain schemdraw code, e.g.:

    V = elm.SourceV().up().label('V_in 10V')
    elm.Resistor().right().label('R1 10k', loc='bottom')
    elm.Resistor().down()
    elm.SourceV().down().reverse().label('V 5V')
    elm.Line().left()
    elm.Ground()

Elements compose chain-wise: each new element starts where the previous one
ended. The runner wraps the snippet in `with Drawing():`, so presets should be
bare element statements (no `with schemdraw.Drawing() as d:` of your own — that
creates a second, never-emitted drawing and yields an empty `inf inf` SVG).
"""

import sys
import traceback

import schemdraw
import schemdraw.elements as elm

# Convenience aliases so snippets stay short.
V = elm.SourceV
R = elm.Resistor
C = elm.Capacitor
L = elm.Inductor
D = elm.Diode
LED = elm.LED
G = elm.Ground
W = elm.Line
WIRE = elm.Line


def main() -> int:
    code = sys.stdin.read()
    d = schemdraw.Drawing()
    g = {
        "__name__": "__circuit_render__",
        "schemdraw": schemdraw,
        "elm": elm,
        "d": d,
        "V": V, "R": R, "C": C, "L": L, "D": D, "LED": LED, "G": G, "W": W, "WIRE": WIRE,
    }
    try:
        compile(code, "<circuit>", "exec")
    except SyntaxError:
        print("Syntax error in snippet", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return 1
    try:
        with d:
            exec(code, g)
        svg = d.get_imagedata("svg")
        if isinstance(svg, str):
            svg = svg.encode("utf-8")
        if not svg or len(svg) < 64:
            print("schemdraw produced no output — the snippet may be empty", file=sys.stderr)
            return 1
        sys.stdout.buffer.write(svg)
        return 0
    except Exception:
        print("schemdraw failed to render the snippet", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())