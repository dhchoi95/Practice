#!/usr/bin/env python3
"""Validate proposed prose changes. Default dry-run; --apply is an explicit local write."""
import argparse
import copy
import hashlib
import json
from pathlib import Path


def digest(value):
    encoded = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(encoded).hexdigest()


def validate(records, changes):
    if not isinstance(records, list) or len({r["id"] for r in records}) != len(records):
        raise ValueError("Source must be a list with unique IDs")
    index = {r["id"]: r for r in records}
    result = copy.deepcopy(records)
    output_index = {r["id"]: r for r in result}
    seen = set()
    for c in changes:
        record_id = c["id"]
        if record_id in seen:
            raise ValueError(f"Duplicate change: {record_id}")
        seen.add(record_id)
        if record_id not in index:
            raise ValueError(f"Unknown ID: {record_id}")
        if c["source_sha256"] != digest(index[record_id]):
            raise ValueError(f"Source changed; re-read and reconcile: {record_id}")
        patch = c["patch"]
        if set(patch) != {"title", "paragraphs", "proposal"}:
            raise ValueError(f"Only title/paragraphs/proposal allowed: {record_id}")
        if not isinstance(patch["title"], str) or not patch["title"].strip():
            raise ValueError(f"Empty or invalid title: {record_id}")
        if not isinstance(patch["proposal"], str):
            raise ValueError(f"Invalid proposal: {record_id}")
        if not isinstance(patch["paragraphs"], list) or not patch["paragraphs"] or any(not isinstance(p, str) or not p.strip() for p in patch["paragraphs"]):
            raise ValueError(f"Empty or invalid paragraphs: {record_id}")
        output_index[record_id].update(patch)
        before_other = {k: v for k, v in index[record_id].items() if k not in patch}
        after_other = {k: v for k, v in output_index[record_id].items() if k not in patch}
        if before_other != after_other:
            raise ValueError(f"Non-prose fields changed: {record_id}")
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project", type=Path)
    parser.add_argument("rewrites", type=Path)
    parser.add_argument("--apply", action="store_true", help="Write locally only after review; never deploys")
    args = parser.parse_args()
    source = args.project / "src/content/foundation/sectors.json"
    original = source.read_bytes()
    records = json.loads(original)
    changes = [json.loads(line) for line in args.rewrites.read_text(encoding="utf-8").splitlines() if line.strip()]
    result = validate(records, changes)
    report = {"mode": "apply" if args.apply else "dry-run", "source_records": len(records), "proposed_records": len(changes), "non_prose_fields_unchanged": True,
              "limits": "조건·참조 보존 검사이며 문장 품질·명리 판단·실제 조합 화면의 검수를 대신하지 않음"}
    if args.apply:
        backup = source.with_name(source.name + "." + hashlib.sha256(original).hexdigest()[:12] + ".bak")
        if backup.exists() and backup.read_bytes() != original:
            raise SystemExit("Refusing to overwrite a different backup")
        if not backup.exists():
            backup.write_bytes(original)
        temporary = source.with_name(source.name + ".writing-tmp")
        temporary.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        temporary.replace(source)
        report["backup"] = str(backup)
        report["follow_up"] = "프로젝트 버전·리뷰 해시·생성 인덱스·실제 조합 결과는 Codex가 별도 확인해야 함"
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
