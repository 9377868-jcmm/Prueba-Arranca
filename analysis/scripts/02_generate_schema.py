"""Generate a landing schema (all-TEXT columns) and \\copy commands from the
table/column/file map produced by 01_parse_toc.py.

All-TEXT columns are deliberate: `strings` truncates the original DDL (drops
short tokens like closing `);`), so exact source types/lengths aren't
recoverable. Casting happens downstream, in the analysis SQL, where the
specific columns and their target types are actually known.

Usage: 02_generate_schema.py <tables_map.json> <create_tables.sql> <copy_all.sql> <dump_dir>
"""
import json
import sys


def col_ident(col: str) -> str:
    col = col.strip()
    return col if col.startswith('"') else f'"{col}"'


def main() -> None:
    map_path, ddl_out, copy_out, dump_dir = sys.argv[1:5]
    with open(map_path) as f:
        tables = json.load(f)

    ddl_lines = ["CREATE SCHEMA IF NOT EXISTS raw;"]
    copy_lines = []
    for t in tables:
        name, cols, fnum = t["table"], t["columns"], t["file"]
        col_defs = ",\n    ".join(f"{col_ident(c)} TEXT" for c in cols)
        ddl_lines.append(f'DROP TABLE IF EXISTS raw."{name}" CASCADE;')
        ddl_lines.append(f'CREATE TABLE raw."{name}" (\n    {col_defs}\n);')

        col_list = ", ".join(col_ident(c) for c in cols)
        copy_lines.append(
            f"\\copy raw.\"{name}\" ({col_list}) FROM '{dump_dir}/{fnum}.dat' WITH (FORMAT text)"
        )

    with open(ddl_out, "w") as f:
        f.write("\n".join(ddl_lines) + "\n")
    with open(copy_out, "w") as f:
        f.write("\n".join(copy_lines) + "\n")

    print(f"{len(tables)} tables -> {ddl_out}, {copy_out}")


if __name__ == "__main__":
    main()
