#!/usr/bin/env bash
# Creates an isolated schemdraw venv for LOCAL TESTING of lib/viz/circuit.py.
# The app itself renders circuits in the browser via Pyodide, so this venv is
# not needed at runtime or in production. Run once after cloning:
#
#   bash scripts/setup_circuit_venv.sh
#
# Then, to test a snippet against the real renderer:
#   "${HOME}/.cache/md_book/.circuit-venv/bin/python" -c \
#     "import sys; sys.path.insert(0,'lib/viz'); import circuit; print(circuit.render_circuit(open('/tmp/snippet.py').read()))"
set -euo pipefail

VENV_DIR="${HOME}/.cache/md_book/.circuit-venv"
PY=${PYTHON:-python3}

if [ "${1:-}" = "--into-project" ]; then
  # Legacy layout: keep the venv inside the repo (breaks Turbopack's build
  # traversal due to its bin/python symlink pointing outside the tree).
  VENV_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.circuit-venv"
fi

if [ ! -x "${VENV_DIR}/bin/python" ]; then
  echo "==> creating venv at ${VENV_DIR}"
  mkdir -p "${VENV_DIR}"
  "${PY}" -m venv "${VENV_DIR}"
fi

echo "==> installing schemdraw"
"${VENV_DIR}/bin/pip" install --quiet --upgrade schemdraw

echo
echo "done. Verifying:"
"${VENV_DIR}/bin/python" -c "import schemdraw; print('schemdraw', schemdraw.__version__)"
