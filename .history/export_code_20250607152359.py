#!/usr/bin/env python3
"""
Walk the directory tree, copy a *concise* directory map + file samples
to the clipboard, keeping LLM context lean.

Usage:  python export_code.py [ROOT] [--max-file-kb 40] [--max-lines 400]
"""

from __future__ import annotations
import argparse
import io
import os
import sys
from pathlib import Path

import pyperclip


# ---------- DEFAULT LIMITS (overridable by CLI) ----------
MAX_FILE_KB   = 40      # skip or truncate files > this many kiB
MAX_LINES     = 400     # capture at most this many lines per file
INCLUDE_EXT   = {'.py', '.md', '.txt', '.rst', '.toml', '.yaml', '.yml'}
# Anything *not* in INCLUDE_EXT is skipped unless you pass --all in CLI
SKIP_DIRS     = {'.git', '__pycache__', '.venv', 'venv', 'node_modules'}
SKIP_IF_NAME_HAS = {'.min.', '.lock', '.pickle'}   # crude but effective
# ----------------------------------------------------------


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    p.add_argument("root", nargs="?", default=".", help="Directory to export")
    p.add_argument("--max-file-kb", type=int, default=MAX_FILE_KB)
    p.add_argument("--max-lines",   type=int, default=MAX_LINES)
    p.add_argument("--skip-dirs",   nargs="*", default=(), help="Extra dirs to omit")
    p.add_argument("--all", action="store_true",
                   help="Ignore INCLUDE_EXT filter and take every text file")
    return p.parse_args()


def should_skip_dir(dirname: str, extra_skips: set[str]) -> bool:
    return dirname in SKIP_DIRS or dirname in extra_skips


def should_skip_file(path: Path, all_files: bool) -> bool:
    if any(tok in path.name for tok in SKIP_IF_NAME_HAS):
        return True
    if not all_files and path.suffix.lower() not in INCLUDE_EXT:
        return True
    return False


def print_tree(root: Path, out: io.StringIO, extra_skips: set[str]) -> None:
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if not should_skip_dir(d, extra_skips)]
        rel = Path(dirpath).relative_to(root)
        depth = 0 if rel == Path(".") else len(rel.parts)
        indent = "    " * depth
        out.write(f"{indent}{rel if rel != Path('.') else '.'}/\n")
        for fname in sorted(filenames):
            out.write(f"{indent}    {fname}\n")


def print_contents(root: Path, out: io.StringIO,
                   max_bytes: int, max_lines: int,
                   extra_skips: set[str], include_all: bool) -> None:
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if not should_skip_dir(d, extra_skips)]
        for fname in sorted(filenames):
            path = Path(dirpath) / fname
            if should_skip_file(path, include_all):
                continue
            rel = path.relative_to(root)
            out.write(f"{'='*80}\nFile: {rel}\n{'='*80}\n")
            try:
                if path.stat().st_size > max_bytes:
                    out.write(f"[skipped: {path.stat().st_size//1024} KiB > "
                              f"{max_bytes//1024} KiB limit]\n\n")
                    continue

                with path.open(encoding="utf-8") as f:
                    for i, line in enumerate(f):
                        if i >= max_lines:
                            out.write("[…truncated…]\n")
                            break
                        out.write(line)
            except (UnicodeDecodeError, PermissionError):
                out.write("[binary or unreadable file skipped]\n")
            out.write("\n\n")


def main() -> None:
    args = parse_args()
    root = Path(args.root).resolve()
    extra_skips = set(args.skip_dirs)
    max_bytes = args.max_file_kb * 1024

    buf = io.StringIO()
    buf.write(f"Directory tree of {root} (limits: {args.max_file_kb} KiB, "
              f"{args.max_lines} lines):\n\n")
    print_tree(root, buf, extra_skips)
    buf.write("\n\nContents of files:\n\n")
    print_contents(root, buf, max_bytes, args.max_lines, extra_skips, args.all)

    pyperclip.copy(buf.getvalue())
    print("📋 Copied concise export to clipboard!")


if __name__ == "__main__":
    # Safety net: avoid accidentally dumping a huge mono-repo
    size_mb = sum(f.stat().st_size for f in Path(".").rglob("*") if f.is_file()) / 1_048_576
    if size_mb > 500:
        print("Whoa! This directory is >500 MB; are you sure?", file=sys.stderr)
        sys.exit(1)
    main()
