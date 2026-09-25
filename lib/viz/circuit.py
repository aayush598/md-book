# schemdraw circuit renderer for the ECE ```circuit fences in markdown.
#
# Runs a user snippet against a fresh schemdraw.Drawing and returns the SVG as
# a string. Designed to work in BOTH CPython (tests) and Pyodide (browser):
#
#   - Figure.show() is neutralised. Drawing.__exit__ calls display() ->
#     Figure.show() -> tempfile.mkstemp + subprocess, none of which exist in a
#     WASM browser. Patching it keeps the familiar `with schemdraw.Drawing() as
#     d:` syntax working unchanged inside Pyodide.
#   - No filesystem, no subprocess, no matplotlib: schemdraw's SVG backend is
#     pure stdlib, and schemdraw itself has zero hard dependencies.
#
# The snippet is user-authored schemdraw code using the aliases below.

import schemdraw
import schemdraw.elements as elm

# Neutralise the display() path so `with Drawing() as d:` never tries to open a
# viewer or write a temp file (both unavailable / undesirable in Pyodide).
try:
    from schemdraw.backends.svg import Figure

    Figure.show = lambda self, *a, **k: None
except Exception:  # pragma: no cover - backend layout may change upstream
    pass


# Convenience aliases so markdown snippets stay short.
V = elm.SourceV
I = elm.SourceI
R = elm.Resistor
C = elm.Capacitor
L = elm.Inductor
D = elm.Diode
LED = elm.LED
G = elm.Ground
W = elm.Line
WIRE = elm.Line

_ALIASES = {
    "V": V,
    "I": I,
    "R": R,
    "C": C,
    "L": L,
    "D": D,
    "LED": LED,
    "G": G,
    "W": W,
    "WIRE": WIRE,
}

# Guardrail: refuse absurd snippets so a runaway fence cannot wedge the worker.
MAX_SNIPPET_CHARS = 20_000


def render_circuit(source):
    """Render a schemdraw snippet to an SVG string.

    Returns the SVG text. Raises ValueError with a readable message on any
    syntax error, runtime error, or empty drawing.
    """
    if not isinstance(source, str) or not source.strip():
        raise ValueError("Circuit block is empty")
    if len(source) > MAX_SNIPPET_CHARS:
        raise ValueError(
            "Circuit block is too long ({} chars, max {})".format(
                len(source), MAX_SNIPPET_CHARS
            )
        )
    # A fence that still contains its own markdown fences is a paste accident.
    if source.lstrip().startswith("```"):
        raise ValueError(
            "Remove the surrounding ``` from inside the circuit block"
        )

    namespace = {
        "__name__": "__circuit_render__",
        "schemdraw": schemdraw,
        "elm": elm,
    }
    namespace.update(_ALIASES)

    drawing = schemdraw.Drawing()
    namespace["d"] = drawing

    try:
        code = compile(source, "<circuit>", "exec")
    except SyntaxError as exc:
        raise ValueError("Syntax error: {} (line {})".format(exc.msg, exc.lineno))

    try:
        with drawing:
            exec(code, namespace)  # noqa: S102 - executing user snippet is the point
    except Exception as exc:
        raise ValueError("{}: {}".format(type(exc).__name__, exc))

    if not drawing.elements:
        raise ValueError(
            "No circuit elements were drawn - add statements like "
            "elm.Resistor().right()"
        )

    try:
        svg = drawing.get_imagedata("svg")
    except Exception as exc:
        raise ValueError("Could not build SVG: {}".format(exc))

    if isinstance(svg, (bytes, bytearray)):
        svg = bytes(svg).decode("utf-8", "replace")

    if not isinstance(svg, str) or "<svg" not in svg:
        raise ValueError("Renderer produced no SVG")

    return svg
