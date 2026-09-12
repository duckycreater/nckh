"""Package generated BMO artwork into production-sized WebP assets.

This script deliberately excludes physical reward artwork: reward catalogue images
remain merchant-managed content, while the files below are part of BMO's visual
identity and game UI.
"""

import argparse
from pathlib import Path

from PIL import Image


OUTPUT = Path(__file__).resolve().parents[1] / "public" / "assets" / "bmo"

ASSETS = {
    "exec-ebd92d98-6d77-47b7-a7ee-96609610369a.png": ("card-elements/plastic.webp", (640, 853), 84),
    "exec-78d5343a-7b48-40fd-bec8-780c023ca77c.png": ("card-elements/paper.webp", (640, 853), 84),
    "exec-1d531c99-9117-49b2-8abf-4ec0a4518be1.png": ("card-elements/glass.webp", (640, 853), 84),
    "exec-27903e9e-3569-45d6-981b-4204b740b676.png": ("card-elements/metal.webp", (640, 853), 84),
    "exec-d37ea23e-4a7f-4cd3-b829-b20504c8645a.png": ("card-elements/organic.webp", (640, 853), 84),
    "exec-7776938d-5cfa-46c8-b192-ae5e3e4d1f0f.png": ("card-elements/hazard.webp", (640, 853), 84),
    "exec-26be01f7-bf05-4307-8de3-ea248ea0a3d2.png": ("card-elements/energy.webp", (640, 853), 84),
    "exec-b87002b3-ce22-40aa-8868-02dff99fb86c.png": ("card-elements/water.webp", (640, 853), 84),
    "exec-38868d7f-da61-4800-8498-b895271f3886.png": ("card-elements/tech.webp", (640, 853), 84),
    "exec-9bb01514-a10a-4550-a48f-35fae971eec0.png": ("scenes/auth-hero.webp", (1600, 900), 84),
    "exec-f324634a-09b3-494c-a056-1d58686d84e3.png": ("scenes/campaign-arena.webp", (1600, 900), 84),
    "exec-5f075d55-3c96-4b07-93b7-d802c4b96675.png": ("scenes/gacha-vault.webp", (1600, 900), 84),
    "exec-3d6f2e34-4462-4abc-8bc7-3d0e03fc07ba.png": ("avatars/seedling.webp", (512, 512), 90),
    "exec-c768219a-708b-47b3-875f-acd27b1756c1.png": ("avatars/water-guardian.webp", (512, 512), 90),
    "exec-ae2c179b-26e2-4aec-9897-4714ecc23bfb.png": ("avatars/forest-guardian.webp", (512, 512), 90),
    "exec-edb70a43-36cd-4bf8-a0be-0c03cecececd.png": ("cards/card-back.webp", (640, 853), 88),
}


def cover(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    target_ratio = size[0] / size[1]
    source_ratio = image.width / image.height
    if source_ratio > target_ratio:
        width = round(image.height * target_ratio)
        left = (image.width - width) // 2
        image = image.crop((left, 0, left + width, image.height))
    elif source_ratio < target_ratio:
        height = round(image.width / target_ratio)
        top = (image.height - height) // 2
        image = image.crop((0, top, image.width, top + height))
    return image.resize(size, Image.Resampling.LANCZOS)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Directory containing the original PNG exports")
    args = parser.parse_args()

    for source_name, (relative_target, size, quality) in ASSETS.items():
        target = OUTPUT / relative_target
        target.parent.mkdir(parents=True, exist_ok=True)
        with Image.open(args.source / source_name) as image:
            packaged = cover(image, size)
            packaged.save(target, "WEBP", quality=quality, method=6)
            print(f"{relative_target}: {target.stat().st_size / 1024:.0f} KiB")


if __name__ == "__main__":
    main()
