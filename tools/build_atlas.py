"""Build public/atlas.png + src/atlas.json from the Pixel Art Atlas dataset (CC0).

Dataset: https://huggingface.co/datasets/Angais/pixel-art-atlas-1.4m
Download pixel-art-16x16-1.4m.zip, extract it, then run:

    python tools/build_atlas.py <extracted_dir>

tools/atlas_rows.json maps sprite name -> list of dataset row ids (variants).
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
COLS = 32


def main():
    full = Path(sys.argv[1])
    files = {p.name: p for p in full.rglob("*") if p.is_file()}
    tokens = np.load(files["tokens.npy"], mmap_mode="r", allow_pickle=False)
    palette = np.load(files["palette.npy"], allow_pickle=False)
    rows = json.loads((ROOT / "tools" / "atlas_rows.json").read_text("utf-8"))
    total = sum(len(v) for v in rows.values())
    h = (total + COLS - 1) // COLS
    atlas = Image.new("RGBA", (COLS * 16, h * 16), (0, 0, 0, 0))
    index, k = {}, 0
    for name, ids in rows.items():
        index[name] = []
        for i in ids:
            px = np.asarray(tokens[i]).reshape(16, 16)
            rgba = np.dstack((palette[px], (px != 0).astype("uint8") * 255)).astype("uint8")
            atlas.paste(Image.fromarray(rgba, "RGBA"), ((k % COLS) * 16, (k // COLS) * 16))
            index[name].append(k)
            k += 1
    (ROOT / "public").mkdir(exist_ok=True)
    atlas.save(ROOT / "public" / "atlas.png", optimize=True)
    (ROOT / "src").mkdir(exist_ok=True)
    (ROOT / "src" / "atlas.json").write_text(json.dumps({"cols": COLS, "sprites": index}), "utf-8")
    print("sprites", k, "names", len(index), "atlas", atlas.size)


if __name__ == "__main__":
    main()
