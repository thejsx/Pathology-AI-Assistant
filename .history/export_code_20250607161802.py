#!/usr/bin/env python3
"""
Export a concise directory map and file samples to the clipboard **without
any command‑line arguments**.

Changes vs. previous version
============================
* **Zero‑config** – just run `python export_code.py`.
* **.gitignore‑aware** (via *pathspec*).
* **Robust encoding fallback** – UTF‑8 → CP‑1252 → Latin‑1.
* Keeps the size/line limits as constants you can tweak at the top.
"""
from __future__ import annotations

import io
import os
import sys
from pathlib import Path
from typing import Optional

import pyperclip

try:
    import pathspec  # type: ignore  # pip install pathspec
except ImportError as exc:  # pragma: no cover
    print("error: pathspec is required — pip install pathspec", file=sys.stderr)
    raise

# ---------- TUNE THESE CONSTANTS -------------------------------------------
MAX_FILE_KB   = 40     # skip or truncate files larger than this (KiB)
MAX_LINES     = 1000   # stop after this many lines per file
INCLUDE_EXT   = {'.py', '.md', '.txt', '.rst', '.toml', '.yaml', '.yml', '.js', '.jsx'}
SKIP_DIRS     = {'.git', '__pycache__', '.venv', 'venv', 'node_modules', '.history'}
SKIP_IF_NAME_HAS = {'.min.', '-lock', '.pickle'}
# ---------------------------------------------------------------------------

ROOT = Path('.').resolve()  # project root is the cwd when you run the script
ENCODINGS = ("utf-8", "cp1252", "latin-1")

# ---------------------------------------------------------------------------
# helpers -------------------------------------------------------------------
# ---------------------------------------------------------------------------

def load_gitignore(root: Path) -> Optional[pathspec.PathSpec]:
    """Compile a PathSpec from .gitignore, ignoring blank lines & comments."""
    gi = root / '.gitignore'
    if not gi.exists():
        return None

    cleaned: list[str] = []
    for raw in gi.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith('#'):
            continue  # skip comments / empty lines which would match *everything*
        cleaned.append(line)

    return pathspec.PathSpec.from_lines('gitwildmatch', cleaned) if cleaned else None

def is_ignored(spec: Optional[pathspec.PathSpec], rel_path: Path) -> bool:
    return bool(spec and spec.match_file(rel_path.as_posix()))

def open_text(path: Path):
    """Open file with the first encoding that works, always replacing errors."""
    for enc in ENCODINGS:
        try:
            return path.open(encoding=enc, errors='replace')
        except UnicodeDecodeError:
            continue
    raise UnicodeDecodeError('all attempts failed', path.name, 0, 0, 'unable to decode')

def should_skip_dir(name: str) -> bool:
    return name in SKIP_DIRS

def should_skip_file(p: Path) -> bool:
    if any(tok in p.name for tok in SKIP_IF_NAME_HAS):
        return True
    if p.suffix.lower() not in INCLUDE_EXT:
        return True
    return False
# ---------------------------------------------------------------------------
# core ----------------------------------------------------------------------
# ---------------------------------------------------------------------------

def print_tree(root: Path, buf: io.StringIO, spec: Optional[pathspec.PathSpec]):
    for dirpath, dirnames, filenames in os.walk(root):
        # Prune sub‑dirs we don't want to descend into
        dirnames[:] = [d for d in dirnames if not should_skip_dir(d) and not is_ignored(spec, Path(dirpath, d).relative_to(root))]
        print(f"Scanning: {dirpath} (dirs: {dirnames}, files: {filenames})")

        rel_dir = Path(dirpath).relative_to(root)
        depth = 0 if rel_dir == Path('.') else len(rel_dir.parts)
        indent = '    ' * depth
        buf.write(f"{indent}{rel_dir if rel_dir != Path('.') else '.'}/\n")
        for fname in sorted(filenames):
            if is_ignored(spec, Path(dirpath, fname).relative_to(root)):
                continue
            buf.write(f"{indent}    {fname}\n")

def print_contents(root: Path, buf: io.StringIO, spec: Optional[pathspec.PathSpec]):
    max_bytes = MAX_FILE_KB * 1024
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if not should_skip_dir(d) and not is_ignored(spec, Path(dirpath, d).relative_to(root))]
        for fname in sorted(filenames):
            path = Path(dirpath) / fname
            rel   = path.relative_to(root)
            if is_ignored(spec, rel) or should_skip_file(path):
                continue

            buf.write(f"{'='*80}\nFile: {rel.as_posix()}\n{'='*80}\n")
            try:
                if path.stat().st_size > max_bytes:
                    buf.write(f"[skipped: {path.stat().st_size//1024} KiB > {MAX_FILE_KB} KiB limit]\n\n")
                    continue
                with open_text(path) as f:
                    for i, line in enumerate(f):
                        if i >= MAX_LINES:
                            buf.write("[…truncated…]\n")
                            break
                        buf.write(line)
            except (UnicodeDecodeError, PermissionError, IsADirectoryError):
                buf.write('[binary or unreadable file skipped]\n')
            buf.write('\n\n')
# ---------------------------------------------------------------------------
# entrypoint ----------------------------------------------------------------
# ---------------------------------------------------------------------------

def main():
    spec = load_gitignore(ROOT)

    buf = io.StringIO()
    buf.write(f"Directory tree of {ROOT} (limits: {MAX_FILE_KB} KiB, {MAX_LINES} lines):\n\n")
    print_tree(ROOT, buf, spec)
    buf.write('\n\nContents of files:\n\n')
    print_contents(ROOT, buf, spec)

    pyperclip.copy(buf.getvalue())
    print('📋 Copied concise export to clipboard!')


if __name__ == '__main__':
    # quick guard against dumping half a terabyte by mistake
    total_mb = sum(f.stat().st_size for f in ROOT.rglob('*') if f.is_file()) / 1_048_576
    if total_mb > 500:
        print('Whoa! This directory is >500 MB; are you sure?', file=sys.stderr)
        sys.exit(1)
    main()
