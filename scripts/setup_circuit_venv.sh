#!/usr/bin/env bash
# Creates the isolated schemdraw venv used by md_book's ECE circuit renderer
# (app/api/circuit -> scripts/render_circuit.py). Run once after cloning:
#
#   bash scripts/setup_circuit_venv.sh
#
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
