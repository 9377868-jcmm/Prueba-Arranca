"""Recover table/column/data-file mapping from a pg_dump directory-format
toc.dat, via its embedded C strings, when the archive's catalog version is
newer than the local pg_restore supports.

Usage: 01_parse_toc.py <strings_output.txt> <tables_map.json>
"""
import json
import re
import sys

TOC_ENTRY_RE = re.compile(
    r"COPY public\.(?P<table>[A-Za-z0-9_]+) \((?P<cols>.*?)\) FROM stdin;\n"
    r"public\n"
    r"(?P<owner>[^\n]*)\n"
    r"false\n"
    r"(?P<file>\d+)\.dat",
    re.DOTALL,
)


def parse(strings_text: str) -> list[dict]:
    tables = []
    for m in TOC_ENTRY_RE.finditer(strings_text):
        columns = [c.strip() for c in m.group("cols").split(",")]
        tables.append({"table": m.group("table"), "columns": columns, "file": m.group("file")})
    return tables


def main() -> None:
    strings_path, out_path = sys.argv[1], sys.argv[2]
    with open(strings_path) as f:
        content = f.read()

    tables = parse(content)
    if not tables:
        raise SystemExit("No TABLE DATA entries found — check the strings dump / regex")

    with open(out_path, "w") as f:
        json.dump(tables, f, indent=2)

    print(f"Parsed {len(tables)} tables -> {out_path}")


if __name__ == "__main__":
    main()
