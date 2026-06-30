#!/usr/bin/env python3
"""
Push TDN-Waste-World dataset to Hugging Face Hub.

Complements scripts/release_dataset.py (which targets OSF).
Hugging Face gives us: free hosting, dataset viewer, easy Python load,
inference API integration, large community reach.

Usage:
    python scripts/push_to_huggingface.py --dataset-id duckcreater/tcn-waste-world

Requirements:
    pip install huggingface_hub datasets python-dotenv
    Set HF_TOKEN env var (https://huggingface.co/settings/tokens)
"""

import argparse
import os
import sys
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

try:
    from huggingface_hub import HfApi, create_repo
    HAS_HF_HUB = True
except ImportError:
    HAS_HF_HUB = False


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--dataset-id", default="duckcreater/tcn-waste-world",
                   help="HF repo id, e.g. 'username/dataset-name'")
    p.add_argument("--source-dir", default="./dataset_release/v2.0",
                   help="Output dir from release_dataset.py")
    p.add_argument("--dry-run", action="store_true",
                   help="Upload only README; skip image files")
    p.add_argument("--private", action="store_true",
                   help="Make repo private (default public)")
    p.add_argument("--token", default=os.getenv("HF_TOKEN"))
    return p.parse_args()


def main():
    args = parse_args()
    source = Path(args.source_dir)

    if not HAS_HF_HUB:
        print("ERROR: huggingface_hub required. pip install huggingface_hub")
        sys.exit(1)
    if not args.token:
        print("ERROR: HF_TOKEN env var required")
        sys.exit(1)

    print(f"=== Push to Hugging Face: {args.dataset_id} ===")
    print(f"Source: {source}")
    print(f"Mode: {'DRY RUN' if args.dry_run else 'LIVE'}, "
          f"visibility: {'private' if args.private else 'public'}")

    api = HfApi(token=args.token)

    # 1) Create repo if missing
    print("\nStep 1: Creating / verifying HF repo...")
    try:
        create_repo(
            repo_id=args.dataset_id,
            repo_type="dataset",
            private=args.private,
            exist_ok=True,
            token=args.token,
        )
        print(f"  Ready: https://huggingface.co/datasets/{args.dataset_id}")
    except Exception as e:
        print(f"  Repo create failed (may already exist): {e}")

    # 2) Upload README + metadata
    print("\nStep 2: Uploading README (model card)...")
    readme_path = source / "README.md"
    if readme_path.exists():
        api.upload_file(
            path_or_fileobj=str(readme_path),
            path_in_repo="README.md",
            repo_id=args.dataset_id,
            repo_type="dataset",
            token=args.token,
        )
        print(f"  Uploaded: {readme_path}")
    else:
        print(f"  WARN: {readme_path} not found, skipping")

    # 3) Upload manifest.csv + stats.json + LICENSE
    print("\nStep 3: Uploading metadata files...")
    for fname in ["manifest.csv", "stats.json", "LICENSE"]:
        fpath = source / fname
        if fpath.exists():
            api.upload_file(
                path_or_fileobj=str(fpath),
                path_in_repo=fname,
                repo_id=args.dataset_id,
                repo_type="dataset",
                token=args.token,
            )
            print(f"  Uploaded: {fname}")

    # 4) Upload image folder (if not dry-run)
    if args.dry_run:
        print("\n[DRY RUN] Skipping image upload")
    else:
        images_dir = source / "images"
        if images_dir.exists() and images_dir.is_dir():
            print(f"\nStep 4: Uploading images folder (this may take a while)...")
            try:
                api.upload_folder(
                    folder_path=str(images_dir),
                    path_in_repo="images",
                    repo_id=args.dataset_id,
                    repo_type="dataset",
                    token=args.token,
                    commit_message=f"Upload TDN-Waste-World images",
                )
                print(f"  Uploaded: images/")
            except Exception as e:
                print(f"  Image upload failed: {e}")
                print(f"  Try with `--max-workers 1` flag in future versions.")
        else:
            print(f"\n  Skipping images: {images_dir} not found")

    print(f"\n=== Done ===")
    print(f"View your dataset: https://huggingface.co/datasets/{args.dataset_id}")
    print(f"\nUsage in Python:")
    print(f"  from datasets import load_dataset")
    print(f"  ds = load_dataset('{args.dataset_id}')")


if __name__ == "__main__":
    main()
