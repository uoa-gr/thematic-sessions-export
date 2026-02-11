#!/usr/bin/env python3
"""
Compare an original CSV that contains a JSON blob column (e.g. organizer_primary)
against a transformed CSV where that blob was split into multiple columns.

Default targets (in this folder):
  - thematic_sessions_submissions.csv (original)
  - new.csv (split)

This script focuses on:
  1) No rows lost/added (ID set equality)
  2) Non-split columns unchanged (exact string match after CSV decoding)
  3) Split columns equal to JSON keys from the original blob
"""

from __future__ import annotations

import argparse
import csv
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple


ID_COL = "id"
ORIG_BLOB_COL = "organizer_primary"
SPLIT_PREFIX = "organizer_primary_"
EXPECTED_BLOB_KEYS = ["email", "country", "lastName", "firstName", "affiliation"]


@dataclass(frozen=True)
class Diff:
    id: str
    field: str
    original: str
    new: str


def _read_csv(path: Path) -> Tuple[List[str], List[Dict[str, str]]]:
    # utf-8-sig handles optional BOM.
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames is None:
            raise ValueError(f"{path}: missing header row")
        rows: List[Dict[str, str]] = []
        for row in reader:
            # csv.DictReader can produce None for missing columns; normalize to "".
            rows.append({k: (v if v is not None else "") for k, v in row.items()})
        return list(reader.fieldnames), rows


def _index_by_id(rows: Iterable[Dict[str, str]], *, source: str) -> Dict[str, Dict[str, str]]:
    out: Dict[str, Dict[str, str]] = {}
    dups: List[str] = []
    for r in rows:
        rid = r.get(ID_COL, "")
        if not rid:
            raise ValueError(f"{source}: row missing '{ID_COL}'")
        if rid in out:
            dups.append(rid)
        out[rid] = r
    if dups:
        raise ValueError(f"{source}: duplicate ids found (showing up to 10): {dups[:10]}")
    return out


def _parse_blob(s: str) -> Optional[Dict[str, Any]]:
    if s is None:
        return None
    s = s.strip()
    if not s:
        return None
    try:
        return json.loads(s)
    except json.JSONDecodeError:
        # Some exports can have single quotes; attempt a cheap fallback.
        try:
            return json.loads(s.replace("'", '"'))
        except Exception:
            raise


def _norm(v: Any) -> str:
    # Normalize None to empty string; keep everything else as a string.
    if v is None:
        return ""
    if isinstance(v, str):
        return v
    return str(v)


def compare(
    orig_path: Path,
    new_path: Path,
    *,
    max_diffs: int,
) -> Tuple[Dict[str, Any], List[Diff]]:
    orig_header, orig_rows = _read_csv(orig_path)
    new_header, new_rows = _read_csv(new_path)

    orig_by_id = _index_by_id(orig_rows, source=str(orig_path))
    new_by_id = _index_by_id(new_rows, source=str(new_path))

    orig_ids = set(orig_by_id.keys())
    new_ids = set(new_by_id.keys())
    missing_in_new = sorted(orig_ids - new_ids)
    extra_in_new = sorted(new_ids - orig_ids)
    common_ids = sorted(orig_ids & new_ids)

    # Identify columns to compare directly (non-split columns).
    # We treat blob col as special; in new.csv it is replaced by split columns.
    new_split_cols = [c for c in new_header if c.startswith(SPLIT_PREFIX)]

    # Compare any shared columns, excluding the original blob column.
    shared_cols = [c for c in orig_header if c in new_header and c != ORIG_BLOB_COL]

    diffs: List[Diff] = []

    # Track blob key coverage.
    seen_blob_keys: set[str] = set()
    unexpected_blob_key_rows: int = 0

    for rid in common_ids:
        o = orig_by_id[rid]
        n = new_by_id[rid]

        for c in shared_cols:
            ov = _norm(o.get(c, ""))
            nv = _norm(n.get(c, ""))
            if ov != nv:
                diffs.append(Diff(rid, c, ov, nv))
                if len(diffs) >= max_diffs:
                    break
        if len(diffs) >= max_diffs:
            break

        # Compare blob -> split columns.
        blob = _parse_blob(o.get(ORIG_BLOB_COL, ""))
        if blob is None:
            # If original blob missing, ensure split cols are empty.
            for key in EXPECTED_BLOB_KEYS:
                col = f"{SPLIT_PREFIX}{key}"
                if col in n:
                    nv = _norm(n.get(col, ""))
                    if nv != "":
                        diffs.append(Diff(rid, col, "", nv))
                        if len(diffs) >= max_diffs:
                            break
            if len(diffs) >= max_diffs:
                break
            continue

        if not isinstance(blob, dict):
            diffs.append(Diff(rid, ORIG_BLOB_COL, str(blob), "<non-dict blob>"))
            if len(diffs) >= max_diffs:
                break
            continue

        seen_blob_keys |= set(map(str, blob.keys()))

        unexpected_keys = set(blob.keys()) - set(EXPECTED_BLOB_KEYS)
        if unexpected_keys:
            unexpected_blob_key_rows += 1

        for key in EXPECTED_BLOB_KEYS:
            col = f"{SPLIT_PREFIX}{key}"
            if col not in n:
                diffs.append(Diff(rid, col, _norm(blob.get(key, "")), "<missing column>"))
                if len(diffs) >= max_diffs:
                    break
                continue
            ov = _norm(blob.get(key, ""))
            nv = _norm(n.get(col, ""))
            if ov != nv:
                diffs.append(Diff(rid, col, ov, nv))
                if len(diffs) >= max_diffs:
                    break
        if len(diffs) >= max_diffs:
            break

    summary: Dict[str, Any] = {
        "orig_path": str(orig_path),
        "new_path": str(new_path),
        "orig_rows": len(orig_rows),
        "new_rows": len(new_rows),
        "orig_cols": len(orig_header),
        "new_cols": len(new_header),
        "missing_in_new_count": len(missing_in_new),
        "extra_in_new_count": len(extra_in_new),
        "missing_in_new_sample": missing_in_new[:10],
        "extra_in_new_sample": extra_in_new[:10],
        "shared_cols_compared": shared_cols,
        "new_split_cols": new_split_cols,
        "seen_blob_keys": sorted(seen_blob_keys),
        "unexpected_blob_key_rows": unexpected_blob_key_rows,
    }
    return summary, diffs


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--orig", type=Path, default=Path("thematic_sessions_submissions.csv"))
    p.add_argument("--new", type=Path, default=Path("new.csv"))
    p.add_argument("--max-diffs", type=int, default=50)
    args = p.parse_args()

    summary, diffs = compare(args.orig, args.new, max_diffs=args.max_diffs)

    print("Summary")
    for k in [
        "orig_path",
        "new_path",
        "orig_rows",
        "new_rows",
        "orig_cols",
        "new_cols",
        "missing_in_new_count",
        "extra_in_new_count",
        "missing_in_new_sample",
        "extra_in_new_sample",
        "unexpected_blob_key_rows",
        "seen_blob_keys",
    ]:
        print(f"- {k}: {summary[k]}")

    if diffs:
        print(f"\nDiffs (showing {len(diffs)}):")
        for d in diffs:
            print(f"- id={d.id} field={d.field}")
            print(f"  orig: {d.original!r}")
            print(f"  new : {d.new!r}")
        return 2

    if summary["missing_in_new_count"] or summary["extra_in_new_count"]:
        print("\nNo field-level diffs found, but ID sets differ.")
        return 3

    print("\nOK: No differences detected for compared fields, and no rows lost/added.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
