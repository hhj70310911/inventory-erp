# ASCII-only: converts UTF-16 (with/without BOM) text files to UTF-8 on disk.
from pathlib import Path


def read_text_smart(raw: bytes) -> str:
    if raw.startswith(b"\xff\xfe"):
        return raw[2:].decode("utf-16-le")
    if raw.startswith(b"\xfe\xff"):
        return raw[2:].decode("utf-16-be")
    # UTF-16 LE without BOM: ASCII shows as c0 00 o0 n0 ...
    if len(raw) >= 4 and raw[1] == 0 and raw[3] == 0 and raw[0] < 128:
        return raw.decode("utf-16-le")
    return raw.decode("utf-8", errors="replace")


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    targets = [
        root / "prisma" / "schema.prisma",
        root / "scripts" / "fix-prisma-schema.js",
        root / "scripts" / "rewrite-package-json.js",
        root / "package.json",
    ]
    for path in targets:
        if not path.exists():
            print("skip missing:", path)
            continue
        raw = path.read_bytes()
        before = raw[:4].hex()
        text = read_text_smart(raw)
        path.write_text(text, encoding="utf-8", newline="\n")
        print("OK", path.relative_to(root), "first4", before)


if __name__ == "__main__":
    main()
