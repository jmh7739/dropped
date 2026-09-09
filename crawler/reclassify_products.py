"""활성 상품 카테고리 감사/재분류.

기본은 dry-run. `--apply`를 붙여야 DB를 수정한다.
대상은 현재 active hot_deals에 연결된 products만으로 제한해 운영 리스크를 줄인다.
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path
from typing import Any

import requests

from classifier import brand_from, classify_slug, display_title


ROOT = Path(__file__).resolve().parents[1]


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def env(name: str, fallback: str | None = None) -> str:
    value = os.environ.get(name) or fallback
    if not value:
        raise RuntimeError(f"Missing environment: {name}")
    return value


def request_json(method: str, path: str, *, key: str, url: str, **kwargs) -> Any:
    headers = kwargs.pop("headers", {})
    headers.update({
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    })
    res = requests.request(method, f"{url}/rest/v1/{path}", headers=headers, timeout=30, **kwargs)
    res.raise_for_status()
    if res.text:
        return res.json()
    return None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--limit", type=int, default=1000)
    args = parser.parse_args()

    load_env_file(ROOT / ".env.local")
    load_env_file(ROOT / "crawler" / ".env")
    url = env("SUPABASE_URL", os.environ.get("NEXT_PUBLIC_SUPABASE_URL")).rstrip("/")
    key = env("SUPABASE_SERVICE_ROLE_KEY", os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY"))

    cats = request_json("GET", "categories?select=id,slug,name", key=key, url=url)
    slug_by_id = {c["id"]: c["slug"] for c in cats}
    id_by_slug = {c["slug"]: c["id"] for c in cats}
    name_by_slug = {c["slug"]: c["name"] for c in cats}

    active = request_json(
        "GET",
        f"hot_deals?select=product_id&status=eq.active&limit={args.limit}",
        key=key,
        url=url,
    )
    product_ids = sorted({row["product_id"] for row in active if row.get("product_id")})
    if not product_ids:
        print("active products: 0")
        return

    products: list[dict] = []
    chunk_size = 80
    for i in range(0, len(product_ids), chunk_size):
        chunk = ",".join(str(x) for x in product_ids[i:i + chunk_size])
        rows = request_json(
            "GET",
            f"products?select=id,title,category_id,mall_name,platform&id=in.({chunk})",
            key=key,
            url=url,
        )
        products.extend(rows or [])

    changes = []
    brand_samples = []
    for p in products:
        current_slug = slug_by_id.get(p.get("category_id"), "living")
        next_slug = classify_slug(p.get("title") or "", current_slug)
        brand = brand_from(p.get("title"))
        if brand:
            brand_samples.append((p["id"], brand, display_title(p.get("title") or "")))
        if next_slug != current_slug and next_slug in id_by_slug:
            changes.append((p, current_slug, next_slug))

    print(f"active products: {len(products)}")
    print(f"category changes: {len(changes)}")
    for p, old, new in changes[:80]:
        print(f"- #{p['id']} {name_by_slug.get(old, old)} -> {name_by_slug.get(new, new)} | {display_title(p.get('title') or '')}")

    print(f"brand samples: {len(brand_samples)}")
    for pid, brand, title in brand_samples[:40]:
        print(f"* #{pid} {brand} | {title}")

    if not args.apply:
        print("dry-run only. pass --apply to update products.category_id")
        return

    for p, _old, new in changes:
        request_json(
            "PATCH",
            f"products?id=eq.{p['id']}",
            key=key,
            url=url,
            json={"category_id": id_by_slug[new]},
        )
    print(f"updated: {len(changes)}")


if __name__ == "__main__":
    main()
