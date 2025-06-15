#!/usr/bin/env python3
"""
Walk the directory tree, copy a *concise* directory map + file samples
into the clipboard, skipping anything ignored by .gitignore and handling
encoding fall‑backs so real text never shows up as "binary".

Usage:
    python export_code.py [ROOT] [--max-file-kb 40] [--max-lines 400]

Key improvements over earlier version
-------------------------------------
* **.gitignore aware** – honour whatever the project already marks as junk.
* **Robust text decoding** – try a cascade of encodings instead of giving up.
* **Non‑breaking** – all defaults are identical unless a .gitignore exists.
"""
from __future__ import annotations

import argparse
import io
import os
import sys
from pathlib import Path
from typing import Iterable, Optional

import pyperclip

try:
    import pathspec  # type: ignore  # pip install pathspec
except ImportError as exc:  # pragma: no cover
    print("error: pathspec is required — pip install pathspec", file=sys.stderr)
    raise

# ---------- DEFAULT LIMITS (overridable by CLI) ----------
MAX_FILE_KB = 40  # skip or truncate files > this many KiB
MAX_LINES = 1000  # capture at most this many lines per file
INCLUDE_EXT = {
    ".py",
    ".md",
    ".txt",
    ".rst",
    ".toml",
    ".yaml",
    ".yml",
    ".js",
    ".jsx",
}
SKIP_DIRS = {".git", "__pycache__", ".venv", "venv", "node_modules", ".history"}
SKIP_IF_NAME_HAS = {".min.", ".lock", ".pickle"}
# ---------------------------------------------------------

# ---------------------------------------------------------------------------
# helpers ────────────────────────────────────────────────────────────────────
# ---------------------------------------------------------------------------


def load_gitignore(root: Path) -> Optional[pathspec.PathSpec]:
    """Return a PathSpec compiled from .gitignore if present."""
    gi = root / ".gitignore"
    if gi.exists():
        return pathspec.PathSpec.from_lines("gitwildmatch", gi.read_text().splitlines())
    return None


def is_ignored(spec: Optional[pathspec.PathSpec], rel_path: Path) -> bool:
    return bool(spec and spec.match_file(rel_path.as_posix()))


ENCODINGS: tuple[str, ...] = ("utf-8", "cp1252", "latin-1")


def open_text(path: Path):
    """Yield file object opened with best‑effort encodings."""
    for enc in ENCODINGS:
        try:
            return path.open(encoding=enc, errors="replace")
        except UnicodeDecodeError:
            continue
    # fall back to binary read as a last resort (very rare)
    raise UnicodeDecodeError("all attempts failed", path.name, 0, 0, "unable to decode")


# ---------------------------------------------------------------------------
# core logic ─────────────────────────────────────────────────────────────────
# ---------------------------------------------------------------------------


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    p.add_argument("root", nargs="?", default=".", help="Directory to export")
    p.add_argument("--max-file-kb", type=int, default=MAX_FILE_KB)
    p.add_argument("--max-lines", type=int, default=MAX_LINES)
    p.add_argument("--skip-dirs", nargs="*", default=(), help="Extra dirs to omit")
    p.add_argument("--all", action="store_true", help="Ignore INCLUDE_EXT filter")
    return p.parse_args()


def should_skip_dir(dirname: str, extra_skips: set[str]) -> bool:
    return dirname in SKIP_DIRS or dirname in extra_skips


def should_skip_file(path: Path, all_files: bool) -> bool:
    if any(tok in path.name for tok in SKIP_IF_NAME_HAS):
        return True
    if not all_files and path.suffix.lower() not in INCLUDE_EXT:
        return True
    return False


def print_tree(root: Path, out: io.StringIO, extra_skips: set[str], spec: Optional[pathspec.PathSpec]) -> None:
    for dirpath, dirnames, filenames in os.walk(root):
        # mutate dirnames in‑place to influence recursion
        dirnames[:] = [
            d
            for d in dirnames
            if not should_skip_dir(d, extra_skips)
            and not is_ignored(spec, Path(dirpath, d).relative_to(root))
        ]

        rel = Path(dirpath).relative_to(root)
        depth = 0 if rel == Path(".") else len(rel.parts)
        indent = "    " * depth
        out.write(f"{indent}{rel if rel != Path('.') else '.'}/\n")
        for fname in sorted(filenames):
            if is_ignored(spec, Path(dirpath, fname).relative_to(root)):
                continue
            out.write(f"{indent}    {fname}\n")


def print_contents(
    root: Path,
    out: io.StringIO,
    max_bytes: int,
    max_lines: int,
    extra_skips: set[str],
    include_all: bool,
    spec: Optional[pathspec.PathSpec],
) -> None:
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [
            d
            for d in dirnames
            if not should_skip_dir(d, extra_skips)
            and not is_ignored(spec, Path(dirpath, d).relative_to(root))
        ]
        for fname in sorted(filenames):
            path = Path(dirpath) / fname
            rel = path.relative_to(root)
            if is_ignored(spec, rel):
                continue
            if should_skip_file(path, include_all):
                continue

            out.write(f"{'='*80}\nFile: {rel.as_posix()}\n{'='*80}\n")
            try:
                if path.stat().st_size > max_bytes:
                    out.write(
                        f"[skipped: {path.stat().st_size//1024} KiB > {max_bytes//1024} KiB limit]\n\n"
                    )
                    continue

                with open_text(path) as f:
                    for i, line in enumerate(f):
                        if i >= max_lines:
                            out.write("[…truncated…]\n")
                            break
                        out.write(line)
            except (UnicodeDecodeError, PermissionError, IsADirectoryError):
                out.write("[binary or unreadable file skipped]\n")
            out.write("\n\n")


# ---------------------------------------------------------------------------
# entrypoint ─────────────────────────────────────────────────────────────────
# ---------------------------------------------------------------------------


def main() -> None:
    args = parse_args()
    root = Path(args.root).resolve()
    extra_skips = set(args.skip_dirs)
    max_bytes = args.max_file_kb * 1024

    git_spec = load_gitignore(root)

    buf = io.StringIO()
    buf.write(
        f"Directory tree of {root} (limits: {args.max_file_kb} KiB, {args.max_lines} lines):\n\n"
    )
    print_tree(root, buf, extra_skips, git_spec)
    buf.write("\n\nContents of files:\n\n")
    print_contents(root, buf, max_bytes, args.max_lines, extra_skips, args.all, git_spec)

    pyperclip.copy(buf.getvalue())
    print("📋 Copied concise export to clipboard!")


if __name__ == "__main__":
    # Safety net: avoid accidentally dumping a huge mono‑repo
    size_mb = sum(f.stat().st_size for f in Path(".").rglob("*") if f.is_file()) / 1_048_576
    if size_mb > 500:
        print("Whoa! This directory is >500 MB; are you sure?", file=sys.stderr)
        sys.exit(1)
    main()
