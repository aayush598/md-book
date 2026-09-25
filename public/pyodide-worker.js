// Dedicated Web Worker that runs Python solutions through the
// visualization tracer (lib/viz/viz_tracer.py) using Pyodide.
//
// Pyodide is loaded lazily at runtime from the jsDelivr CDN and is never
// bundled, so the app stays small and Vercel free-tier safe: all the heavy
// work happens in the visitor's browser, not on a serverless function.
importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js");

const VIS_TRACER_PY = `# viz_tracer.py
# Executes an arbitrary (DSA-style) Python solution under sys.settrace and
# produces a beginner-friendly, value-driven timeline:
#   every line event -> { line index, compact variable snapshot, plain caption }
# Plus the script's own printed result, the function used, its sample inputs,
# and a one-line "Goal". Runs under Pyodide (window) and CPython (tests).

import ast
import io
import math
import sys
import time

STEP_LIMIT = 20000
TIME_LIMIT_S = 25.0
MAX_ARR = 90            # downsampling cap for a 1-D snapshot
MAX_GRID_CELLS = 220    # downsampling cap for a 2-D snapshot
GRID_SIDE = 24

SOLUTION_FILE = "<solution>"


class VizAbort(Exception):
    pass


# ---------------------------------------------------------------------------
# Snapshotting (python value -> JSON-ish dict with __t tags)
# ---------------------------------------------------------------------------

def snap_scalar(v):
    if v is None or isinstance(v, (bool, int, str)):
        return v
    if isinstance(v, float):
        if math.isinf(v):
            return "∞" if v > 0 else "-∞"
        if math.isnan(v):
            return "?"
        return v
    return None


def snap_val(v):
    """Compact display snapshot: scalars as-is, 1-D as {__t:'arr'}, 2-D as {__t:'grid'}."""
    if type(v).__name__ == "deque":
        try:
            v = list(v)
        except Exception:
            pass
    sc = snap_scalar(v)
    if sc is not None:
        return {"__t": "v", "v": sc}
    if isinstance(v, (list, tuple)):
        if len(v) and all(isinstance(x, (list, tuple)) for x in v[:8]):
            rows, trunc, tot = [], False, 0
            for row in v:
                cells = []
                for cell in row:
                    c = snap_scalar(cell)
                    cells.append(c if c is not None else None)
                    tot += 1
                if len(cells) > GRID_SIDE or tot > MAX_GRID_CELLS:
                    cells = cells[:GRID_SIDE]
                    trunc = True
                rows.append(cells)
                if tot > MAX_GRID_CELLS:
                    trunc = True
                    break
            if len(rows) > GRID_SIDE:
                rows = rows[:GRID_SIDE]
                trunc = True
            return {"__t": "grid", "v": rows, "trunc": trunc}
        items, trunc = [], False
        for x in v:
            c = snap_scalar(x)
            items.append(c if c is not None else None)
        if len(items) > MAX_ARR:
            items = items[:MAX_ARR]
            trunc = True
        return {"__t": "arr", "v": items, "trunc": trunc}
    return {"__t": "v", "v": str(v)}


def _interesting(name, val):
    if not name or name.startswith("_") or name.startswith("__"):
        return False
    if isinstance(val, (type,)):
        return False
    if callable(val):
        return False
    modtype = type(sys)
    if isinstance(val, modtype):
        return False
    return True


def capture_vars(frame):
    out = {}
    for name, val in frame.f_locals.items():
        if _interesting(name, val):
            out[name] = snap_val(val)
    return out


# ---------------------------------------------------------------------------
# Static analysis of the source (line -> node, function/call discovery)
# ---------------------------------------------------------------------------

def analyze(source):
    tree = ast.parse(source)
    lines = source.splitlines()
    node_at = {}
    for nd in ast.walk(tree):
        if getattr(nd, "lineno", None) is not None:
            node_at.setdefault(nd.lineno, nd)

    goal_fn = None
    params = []
    doc = None
    call_args = []
    # first function def supplies goal name, docstring, parameter labels
    for nd in ast.walk(tree):
        if isinstance(nd, ast.FunctionDef):
            if goal_fn is None:
                goal_fn = nd.name
                params = [a.arg for a in nd.args.args]
                doc = ast.get_docstring(nd)
            break

    # ...but the *called* function (inside a print) is the protagonist
    call = None
    for nd in tree.body:
        if isinstance(nd, ast.Expr) and isinstance(nd.value, ast.Call):
            fn = nd.value.func
            if getattr(fn, "id", "") == "print" and nd.value.args:
                first = nd.value.args[0]
                if isinstance(first, ast.Call) and getattr(first.func, "id", "") == "input":
                    continue
                if isinstance(first, ast.Call):
                    call = first
    if call is not None:
        fname = getattr(call.func, "id", None)
        if fname:
            goal_fn = fname
            for nd in ast.walk(tree):
                if isinstance(nd, ast.FunctionDef) and nd.name == fname:
                    params = [a.arg for a in nd.args.args]
                    doc = ast.get_docstring(nd)
                    break
        for a in call.args:
            try:
                call_args.append(ast.literal_eval(a))
            except Exception:
                call_args.append(None)

    # Source span of the call \`fn(...)\` so the UI can swap in custom arguments.
    call_span = None
    if call is not None:
        call_span = {
            "line": getattr(call, "lineno", 1) - 1,
            "col": getattr(call, "col_offset", 0),
            "end": getattr(call, "end_col_offset", 0),
            "name": getattr(call.func, "id", ""),
        }

    return {
        "lines": lines,
        "node_at": node_at,
        "fn": goal_fn,
        "params": params,
        "doc": doc,
        "call_args": call_args,
        "call": call_span,
    }


# ---------------------------------------------------------------------------
# Plain-English captions from live values
# ---------------------------------------------------------------------------

def fmt(v, cap=26):
    if v is None:
        return "None"
    if isinstance(v, bool):
        return "True" if v else "False"
    if isinstance(v, float):
        if math.isinf(v):
            return "∞" if v > 0 else "-∞"
        return f"{v:g}"
    if isinstance(v, str):
        s = v if len(v) <= cap else v[: cap - 3] + "..."
        return f'"{s}"'
    if isinstance(v, (list, tuple)):
        if len(v) <= 6:
            return "[" + ", ".join(fmt(x) for x in v) + "]"
        return f"[{len(v)} items]"
    return str(v)


def _eval(nd, g, l):
    try:
        return eval(compile(ast.Expression(nd), "<e>", "eval"), g, l)
    except Exception:
        return None

# Builtin calls that are pure (no side effects) — safe to evaluate for captions.
PURE_BUILTINS = {
    "min", "max", "sum", "len", "int", "float", "abs", "bin", "ord", "str",
    "bool", "sorted", "reversed", "list", "tuple", "range", "enumerate", "zip",
    "pow", "round", "repr",
}


def _safe_expr(nd):
    """True if evaluating this expression cannot mutate any program state."""
    if isinstance(nd, ast.Constant):
        return True
    if isinstance(nd, ast.Name):
        return True
    if isinstance(nd, (ast.Tuple, ast.List)):
        return all(_safe_expr(e) for e in nd.elts)
    if isinstance(nd, ast.BinOp):
        return _safe_expr(nd.left) and _safe_expr(nd.right)
    if isinstance(nd, ast.UnaryOp):
        return _safe_expr(nd.operand)
    if isinstance(nd, ast.Compare):
        return _safe_expr(nd.left) and all(_safe_expr(c) for c in nd.comparators)
    if isinstance(nd, ast.BoolOp):
        return all(_safe_expr(v) for v in nd.values)
    if isinstance(nd, ast.IfExp):
        return _safe_expr(nd.test) and _safe_expr(nd.body) and _safe_expr(nd.orelse)
    if isinstance(nd, ast.Subscript):
        return _safe_expr(nd.value) and _safe_expr(nd.slice)
    if isinstance(nd, ast.Slice):
        return all(_safe_expr(x) for x in (nd.lower, nd.upper, nd.step) if x is not None)
    if isinstance(nd, ast.Attribute):
        return True  # attribute reads only
    if isinstance(nd, ast.Call):
        fn = nd.func
        if isinstance(fn, ast.Name) and fn.id in PURE_BUILTINS:
            return all(_safe_expr(a) for a in nd.args) and all(
                _safe_expr(k.value) for k in nd.keywords
            )
        return False  # method / user calls may have side effects
    return False


def safe_eval(nd, g, l):
    return _eval(nd, g, l) if _safe_expr(nd) else None


def eval_index(slice_nd, g, l):
    """Evaluate a subscript slice to an integer index, or None if unsafe."""
    if isinstance(slice_nd, ast.Tuple):
        return None
    if isinstance(slice_nd, ast.Slice):
        return None
    v = _eval(slice_nd, g, l) if _safe_expr(slice_nd) else None
    if isinstance(v, bool) or not isinstance(v, int):
        return None
    return v


def collect_reads(node, g, l, names):
    """Find subscript reads on watched container names.

    Returns {name: [int indices]} for one-level subscripts whose base is a
    plain Name (dp[dq[0]], nums[dq[-1]], grid[i][j] reads are reported at the
    outer index). Indices are normalized to non-negative and range-checked.
    """
    if not names:
        return {}
    skip = set()
    for nd in ast.walk(node):
        if isinstance(nd, ast.Assign):
            for t in nd.targets:
                skip.update(ast.walk(t))
        elif isinstance(nd, ast.AugAssign):
            skip.update(ast.walk(nd.target))
    reads = {}
    for nd in ast.walk(node):
        if nd in skip:
            continue
        if not isinstance(nd, ast.Subscript):
            continue
        base = nd.value
        if not isinstance(base, ast.Name) or base.id not in names:
            continue
        idx = eval_index(nd.slice, g, l)
        if idx is None:
            continue
        container = l.get(base.id)
        length = None
        if isinstance(container, (list, tuple)):
            length = len(container)
        if length is not None:
            if idx < 0:
                idx += length
            if 0 <= idx < length:
                reads.setdefault(base.id, []).append(idx)
    return reads


def node_kind(node):
    """Coarse statement kind used by the renderer to pick visuals."""
    kind = type(node).__name__
    if kind in ("Assign", "AnnAssign"):
        return "as"
    if kind == "AugAssign":
        return "au"
    if kind in ("If", "While"):
        return "br"
    if kind == "For":
        return "fl"
    if kind == "Return":
        return "rt"
    if kind == "Expr":
        call = node.value
        if (
            isinstance(call, ast.Call)
            and isinstance(call.func, ast.Attribute)
            and call.func.attr in ("append", "pop", "popleft", "extend")
        ):
            return "op"
        return "ca"
    return "st"


def _subqv(nd, g, l):
    """Value-only substitution for one operand (nums[dq[-1]] -> 3, x -> 1)."""
    if isinstance(nd, ast.Name):
        if nd.id in l:
            return fmt(l[nd.id])
        if nd.id in g:
            return fmt(g[nd.id])
        return f"{nd.id}?"
    if isinstance(nd, ast.Constant):
        return repr(nd.value)
    if isinstance(nd, ast.UnaryOp):
        if isinstance(nd.op, ast.Not):
            return f"not {_subqv(nd.operand, g, l)}"
        return f"-{_subqv(nd.operand, g, l)}"
    if isinstance(nd, ast.Subscript) and not isinstance(nd.slice, ast.Tuple):
        base = nd.value
        if isinstance(base, ast.Name):
            v = l.get(base.id) if base.id in l else g.get(base.id)
            if type(v).__name__ == "deque":
                try:
                    v = list(v)
                except Exception:
                    v = None
            idx = _eval(nd.slice, g, l)
            if isinstance(idx, int) and isinstance(v, (list, tuple)):
                real = idx if idx >= 0 else idx + len(v)
                if 0 <= real < len(v):
                    return fmt(v[real])
    if isinstance(nd, (ast.List, ast.Tuple)):
        return "[" + ", ".join(_subqv(e, g, l) for e in nd.elts) + "]"
    if isinstance(nd, (ast.Compare, ast.BinOp, ast.BoolOp)):
        return _subq(nd, g, l)
    return ast.unparse(nd).replace("\\n", " ")


def _subq(nd, g, l):
    """Render an expression with *live values* substituted for each variable
    (e.g. \`nums[dq[-1]] < x\` becomes \`3 < 1\`) so the condition reads exactly
    how Python evaluates it at that step."""
    if isinstance(nd, ast.Name):
        if nd.id in l:
            return f"{nd.id} = {fmt(l[nd.id])}"
        if nd.id in g:
            return f"{nd.id} = {fmt(g[nd.id])}"
        return f"{nd.id} = ?"
    if isinstance(nd, ast.Constant):
        return repr(nd.value)
    if isinstance(nd, ast.Subscript) and not isinstance(nd.slice, ast.Tuple):
        base = nd.value
        if isinstance(base, ast.Name):
            v = l.get(base.id) if base.id in l else g.get(base.id)
            if type(v).__name__ == "deque":
                try:
                    v = list(v)
                except Exception:
                    v = None
            idx = _eval(nd.slice, g, l)
            if isinstance(idx, int) and isinstance(v, (list, tuple)):
                real = idx if idx >= 0 else idx + len(v)
                if 0 <= real < len(v):
                    return f"{base.id}[{idx}] = {fmt(v[real])}"
    if isinstance(nd, (ast.List, ast.Tuple)):
        return "[" + ", ".join(_subq(e, g, l) for e in nd.elts) + "]"
    if isinstance(nd, ast.Compare):
        ops = {
            ast.Eq: "==", ast.NotEq: "!=", ast.Lt: "<", ast.LtE: "<=",
            ast.Gt: ">", ast.GtE: ">=", ast.In: " in ", ast.NotIn: " not in ",
            ast.Is: " is ", ast.IsNot: " is not ",
        }
        parts = [_subqv(nd.left, g, l)]
        parts.extend(f"{ops.get(type(o), '?')} {_subqv(c, g, l)}" for o, c in zip(nd.ops, nd.comparators))
        return " ".join(parts)
    if isinstance(nd, ast.BinOp):
        ops = {
            ast.Add: "+", ast.Sub: "-", ast.Mult: "*", ast.Div: "/",
            ast.FloorDiv: "//", ast.Mod: "%", ast.BitOr: "|", ast.BitAnd: "&",
        }
        return f"{_subqv(nd.left, g, l)} {ops.get(type(nd.op), '?')} {_subqv(nd.right, g, l)}"
    if isinstance(nd, ast.UnaryOp):
        if isinstance(nd.op, ast.Not):
            return f"not {_subq(nd.operand, g, l)}"
        return f"-{_subq(nd.operand, g, l)}"
    if isinstance(nd, ast.BoolOp):
        op = " and " if isinstance(nd.op, ast.And) else " or "
        return "(" + op.join(_subq(v, g, l) for v in nd.values) + ")"
    if isinstance(nd, ast.Slice):
        return ":".join((_subqv(x, g, l) if x else "") for x in (nd.lower, nd.upper, nd.step))
    if isinstance(nd, ast.IfExp):
        return f"{_subq(nd.body, g, l)} if {_subq(nd.test, g, l)} else {_subq(nd.orelse, g, l)}"
    return ast.unparse(nd).replace("\\n", " ")


def _part_sub(clause, g, l):
    """Substituted reading of one condition clause: bare names/subscripts show
    just their value (\`dq\` -> \`deque([])\`), compound clauses show the full
    equation with values (\`nums[dq[-1]] < x\` -> \`3 < 1\`)."""
    try:
        if isinstance(clause, (ast.Name, ast.Subscript, ast.Constant)):
            s = _subqv(clause, g, l)
        else:
            s = _subq(clause, g, l)
        if s is None:
            return None
        if len(s) > 44:
            s = s[:41] + "..."
        return s
    except Exception:
        return None


def cond_parts(test, g, l):
    """Evaluate a boolean test with short-circuit, tagging each evaluated part.

    For \`a and b\` / \`a or b\` each clause is evaluated only while the result can
    still be decided (matching real short-circuit); the deciding clause is
    tagged and later clauses are marked "not reached". Every part also carries a
    \`s\` field spelling the clause out with its live values substituted, so the
    viewer can show exactly what Python compared. Simple (non-compound) tests
    get a single part too.

    Returns (overall_bool_or_None, parts_or_None).
    """
    if isinstance(test, ast.BoolOp):
        is_and = isinstance(test.op, ast.And)
        parts = []
        overall = None
        for clause in test.values:
            res = safe_eval(clause, g, l)
            e = ast.unparse(clause).replace("\\n", " ")
            if res is None:
                parts.append({"e": e, "p": None, "s": None})
                overall = res
                continue
            truth = bool(res)
            parts.append({"e": e, "p": truth, "s": _part_sub(clause, g, l)})
            overall = truth
            if truth != is_and:  # and: stop at False; or: stop at True
                break
        return overall, parts
    res = safe_eval(test, g, l)
    if res is None:
        return None, None
    return bool(res), [{"e": ast.unparse(test).replace("\\n", " "), "p": bool(res), "s": _part_sub(test, g, l)}]


def _stmt_lines(stmts):
    """0-based line numbers covered by a list of statements (their subtree)."""
    out = set()
    for st in stmts:
        for x in ast.walk(st):
            lo = getattr(x, "lineno", None)
            if lo is None:
                continue
            hi = getattr(x, "end_lineno", lo) or lo
            for ln in range(lo, hi + 1):
                out.add(ln - 1)
    return out


def skipped_lines(node, p, g=None, l=None):
    """Lines (0-based) of the branch that did NOT run at this branch test.

    If \`p\` is False at an if/while, the taken branch's body never executes;
    if it's True at an if, the else/elif branch is the skipped one. When the
    loop condition evaluates False (while) the whole body is skipped, exactly
    like a debugger greying the dead code out.
    """
    kind = type(node).__name__
    if kind == "If":
        body = node.orelse if p else node.body
        if not body:
            return None
        return sorted(_stmt_lines(body))
    if kind == "While":
        if p:
            return None
        return sorted(_stmt_lines(node.body))
    if kind == "For":
        # Only the "loop over an empty iterable" case is knowable at the line
        # event; the final exit never fires a line event for the for head.
        if g is None:
            return None
        try:
            it = _eval(node.iter, g, l or {})
            if isinstance(it, (list, tuple)) and len(it) == 0:
                return sorted(_stmt_lines(node.body))
        except Exception:
            return None
        return None
    return None


def cond_info(node, g, l):
    """For branch statements: {expr string, passed bool, optional parts}."""
    kind = type(node).__name__
    test = node.test if kind in ("If", "While") else None
    if test is None:
        return None
    res, parts = cond_parts(test, g, l)
    if res is None:
        return None
    out = {"e": ast.unparse(test).replace("\\n", " "), "p": bool(res)}
    if parts:
        out["parts"] = parts
    return out


def tgt_str(tgt, g, l):
    """Concrete target text using live values: dp[4], dp[1][2]."""
    parts = []
    cur = tgt
    while isinstance(cur, ast.Subscript):
        idx = _eval(cur.slice, g, l) if not isinstance(cur.slice, ast.Tuple) else tuple(_eval(s, g, l) for s in cur.slice.elts)
        parts.append(fmt(idx))
        cur = cur.value
    if isinstance(cur, ast.Name):
        return f"{cur.id}[" + "][".join(reversed(parts)) + "]"
    return ast.unparse(tgt)


def caption(node, g, l, srcline):
    kind = type(node).__name__

    if kind in ("Assign", "AnnAssign"):
        target = node.targets[0] if kind == "Assign" else node.target
        if isinstance(target, ast.Tuple):
            names = ", ".join(getattr(t, "id", ast.unparse(t)) for t in target.elts)
            val = safe_eval(node.value, g, l)
            if val is not None:
                return f"Unpack {names} ← {fmt(val)}"
            return f"Unpack {names}"
        tgt = tgt_str(target, g, l)
        val = safe_eval(node.value, g, l)
        if val is not None:
            return f"Set {tgt} = {fmt(val)}"
        return f"Set {tgt} = {src_fragment(node.value)}"

    if kind == "AugAssign":
        tgt = tgt_str(node.target, g, l)
        cur = _eval(node.target, g, l)
        rhs = safe_eval(node.value, g, l)
        try:
            op = type(node.op)
            if op is ast.Add:
                newv = cur + rhs
            elif op is ast.Sub:
                newv = cur - rhs
            elif op is ast.Mult:
                newv = cur * rhs
            elif op is ast.FloorDiv:
                newv = cur // rhs
            elif op is ast.Mod:
                newv = cur % rhs
            else:
                newv = None
            if newv is not None:
                return f"{tgt} grows to {fmt(newv)}"
        except Exception:
            pass
        return f"Update {tgt}: {src_fragment(node)}"

    if kind == "For":
        varname = getattr(node.target, "id", "x")
        if isinstance(node.iter, ast.Call) and getattr(node.iter.func, "id", "") == "range":
            args = [safe_eval(a, g, l) for a in node.iter.args]
            if None not in args:
                if len(args) >= 2:
                    start, end = args[0], args[1]
                elif len(args) == 1:
                    start, end = 0, args[0]
                else:
                    start, end = 0, 0
                step = args[2] if len(args) > 2 and args[2] is not None else 1
                cur = l.get(varname)
                shown = cur if cur is not None else start
                step_suffix = f", {fmt(step)}" if step != 1 else ""
                return f"Loop: {varname} = {fmt(shown)} over range({fmt(start)}, {fmt(end)}){step_suffix}"
        return f"Iterate each value into {varname}"

    if kind == "While":
        res = safe_eval(node.test, g, l)
        if res is None:
            return f"Loop condition — {node_test_plain(node.test)}"
        return f"Loop: {node_test_plain(node.test)} is {'True — keep going' if res else 'False — exit'}"

    if kind == "If":
        res = safe_eval(node.test, g, l)
        if res is None:
            return f"Branch on {node_test_plain(node.test)}"
        return f"Branch: {node_test_plain(node.test)} → {'True' if res else 'False'}"

    if kind == "Return":
        val = safe_eval(node.value, g, l) if node.value is not None else None
        if val is not None:
            return f"Return {fmt(val)}"
        return "Return"

    if kind == "Expr" and isinstance(node.value, ast.Call):
        call = node.value
        fn = call.func
        if isinstance(fn, ast.Attribute):
            obj = ast.unparse(fn.value)
            method = fn.attr
            argv = [safe_eval(a, g, l) for a in call.args]
            if method == "append":
                if argv and argv[0] is not None:
                    return f"Push {fmt(argv[0])} onto the end of {obj}"
                return f"Append a value to {obj}"
            if method == "pop":
                return f"Remove the top value of {obj}"
            if method == "popleft":
                return f"Slide window: drop the front of {obj}"
            if method == "sort":
                return f"Sort {obj}"
            shown = ", ".join(fmt(a) for a in argv if a is not None)
            return f"Call {obj}.{method}({shown})"
        if isinstance(fn, ast.Name):
            if fn.id == "print":
                return "Print the answer"
            argv = [safe_eval(a, g, l) for a in call.args]
            shown = ", ".join(fmt(a) for a in argv if a is not None)
            return f"Call {fn.id}({shown})"
    return None


def src_fragment(nd, cap=30):
    s = ast.unparse(nd).replace("\\n", " ")
    return s if len(s) <= cap else s[: cap - 3] + "..."


def node_test_plain(nd):
    s = ast.unparse(nd).replace("\\n", " ")
    return s if len(s) <= 40 else s[:37] + "..."


# ---------------------------------------------------------------------------
# Main entry
# ---------------------------------------------------------------------------

def build_result(source):
    info = analyze(source)
    lines = info["lines"]
    node_at = info["node_at"]
    goal_fn = info["fn"]
    params = info["params"]
    doc = info["doc"]
    call_args = info["call_args"]
    steps = []
    n = 0
    t0 = time.time()
    aborted = None

    def tracer(frame, event, arg):
        nonlocal n, aborted
        if frame.f_code.co_filename != SOLUTION_FILE:
            return tracer
        if event == "line":
            n += 1
            if n > STEP_LIMIT:
                aborted = "Step limit reached — loop is too long to animate; showing the earliest steps."
                raise VizAbort(aborted)
            if time.time() - t0 > TIME_LIMIT_S:
                aborted = "Time limit reached — solution too slow to animate."
                raise VizAbort(aborted)
            ln = frame.f_lineno
            step = {"l": ln - 1, "v": capture_vars(frame)}
            nd = node_at.get(ln)
            if nd is not None:
                step["k"] = node_kind(nd)
                cap = caption(nd, frame.f_globals, frame.f_locals, lines[ln - 1])
                if cap:
                    step["c"] = cap
                if step["k"] == "br":
                    ci = cond_info(nd, frame.f_globals, frame.f_locals)
                    if ci is not None:
                        step["cx"] = ci
                        try:
                            sk = skipped_lines(nd, ci["p"])
                            if sk:
                                step["sk"] = sk
                        except Exception:
                            pass
                if step["k"] == "fl":
                    try:
                        sk = skipped_lines(nd, None, frame.f_globals, frame.f_locals)
                        if sk:
                            step["sk"] = sk
                    except Exception:
                        pass
                container_names = [
                    name
                    for name, snap in step["v"].items()
                    if snap and snap["__t"] in ("arr", "grid")
                ]
                if container_names:
                    reads = collect_reads(nd, frame.f_globals, frame.f_locals, container_names)
                    if reads:
                        step["r"] = reads
            steps.append(step)
        return tracer

    old_stdout = sys.stdout
    buf = io.StringIO()
    sys.settrace(tracer)
    try:
        sys.stdout = buf
        exec(compile(source, SOLUTION_FILE, "exec"), {})
    except VizAbort:
        pass
    except Exception as e:
        return {"error": f"{type(e).__name__}: {e}"}
    finally:
        sys.stdout = old_stdout
        sys.settrace(None)

    result = buf.getvalue().strip()
    goal = doc.strip() if doc else f"Watch {goal_fn}() build its answer step by step."
    args_out = []
    if call_args:
        args_out = [
            {"name": params[i] if i < len(params) else f"arg{i}", "v": snap_val(v)}
            for i, v in enumerate(call_args)
        ]
    notes = [aborted] if aborted else []
    out = {
        "src": source,
        "lines": lines,
        "fn": goal_fn,
        "goal": goal,
        "args": args_out,
        "steps": steps,
        "result": result,
        "notes": notes,
    }
    if info.get("call"):
        out["call"] = info["call"]
    return out`;

const CIRCUIT_PY = `# schemdraw circuit renderer for the ECE \`\`\`circuit fences in markdown.
#
# Runs a user snippet against a fresh schemdraw.Drawing and returns the SVG as
# a string. Designed to work in BOTH CPython (tests) and Pyodide (browser):
#
#   - Figure.show() is neutralised. Drawing.__exit__ calls display() ->
#     Figure.show() -> tempfile.mkstemp + subprocess, none of which exist in a
#     WASM browser. Patching it keeps the familiar \`with schemdraw.Drawing() as
#     d:\` syntax working unchanged inside Pyodide.
#   - No filesystem, no subprocess, no matplotlib: schemdraw's SVG backend is
#     pure stdlib, and schemdraw itself has zero hard dependencies.
#
# The snippet is user-authored schemdraw code using the aliases below.

import schemdraw
import schemdraw.elements as elm

# Neutralise the display() path so \`with Drawing() as d:\` never tries to open a
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
    if source.lstrip().startswith("\`\`\`"):
        raise ValueError(
            "Remove the surrounding \`\`\` from inside the circuit block"
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
`;

let pyodide = null;
let loadPromise = null;
let schemdrawPromise = null;

// schemdraw is a pure-python wheel (no compiled deps), installed lazily into
// the running Pyodide only when a ```circuit fence is first rendered. Shared
// across every circuit on the page.
async function ensureSchemdraw() {
  if (!schemdrawPromise) {
    schemdrawPromise = (async () => {
      await pyodide.loadPackage("micropip");
      const micropip = pyodide.pyimport("micropip");
      await micropip.install("schemdraw==0.23");
      await pyodide.runPythonAsync(CIRCUIT_PY);
    })();
    schemdrawPromise.catch(() => {
      schemdrawPromise = null;
    });
  }
  return schemdrawPromise;
}

async function ensureLoaded() {
  if (pyodide) return;
  if (!loadPromise) {
    loadPromise = (async () => {
      pyodide = await loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/",
      });
      await pyodide.runPythonAsync(VIS_TRACER_PY);
    })();
  }
  await loadPromise;
}

self.onmessage = async (event) => {
  const { id, type, source } = event.data || {};
  if (!id) return;
  try {
    if (type === "load") {
      await ensureLoaded();
      postMessage({ id, type: "loaded" });
    } else if (type === "circuit") {
      await ensureLoaded();
      await ensureSchemdraw();
      pyodide.globals.set("__circuit_source__", source);
      const json = pyodide.runPython(
        "import json; json.dumps({'svg': render_circuit(__circuit_source__)})"
      );
      postMessage({
        id,
        type: "result",
        payload: typeof json === "string" ? JSON.parse(json) : json,
      });
    } else if (type === "run") {
      await ensureLoaded();
      pyodide.globals.set("__viz_source__", source);
      const json = pyodide.runPython(
        "import json; json.dumps(build_result(__viz_source__))"
      );
      postMessage({
        id,
        type: "result",
        payload: typeof json === "string" ? JSON.parse(json) : json,
      });
    }
  } catch (error) {
    postMessage({
      id,
      type: "error",
      message: String(error && error.message ? error.message : error),
    });
  }
};
