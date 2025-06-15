#!/usr/bin/env python3
"""Walk the current directory tree, print a directory map and file contents.

Usage:
    python export_code.py [OUTPUT_FILE]
    python export_code.py > all_code.txt
"""

import os
import sys

SKIP_DIRS = {'.git', '__pycache__', '.venv', 'venv'}


def print_tree(root, out):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        rel = os.path.relpath(dirpath, root)
        depth = 0 if rel == '.' else rel.count(os.sep) + 1
        indent = '    ' * depth
        name = os.path.basename(dirpath) if rel != '.' else '.'
        out.write(f"{indent}{name}/\n")
        for fname in sorted(filenames):
            out.write(f"{indent}    {fname}\n")


def print_contents(root, out):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fname in sorted(filenames):
            file_path = os.path.join(dirpath, fname)
            rel_path = os.path.relpath(file_path, root)
            out.write(f"{'='*80}\nFile: {rel_path}\n{'='*80}\n")
            try:
                with open(file_path, encoding='utf-8') as f:
                    out.write(f.read())
            except (UnicodeDecodeError, PermissionError):
                out.write("[binary file skipped]\n")
            out.write("\n\n")


def main():
    root = os.getcwd()
    out = sys.stdout
    if len(sys.argv) > 1:
        out = open(sys.argv[1], 'w', encoding='utf-8')
    out.write(f"Directory tree of {root}:\n\n")
    print_tree(root, out)
    out.write("\n\nContents of files:\n\n")
    print_contents(root, out)
    if out is not sys.stdout:
        out.close()


if __name__ == '__main__':
    main()