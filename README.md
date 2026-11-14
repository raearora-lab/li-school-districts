# Long Island school districts: enrollment and budgets

Static site comparing all 125 Nassau and Suffolk school districts: 2026-27 proposed budgets, tax levies, tax-cap status, per-pupil spending, and fall 2025 enrollment. Leaflet map with a pin per district office and district boundaries, color-by metric, linked sortable table, and charts.

- `public/` is the deployable site (Cloudflare Pages project `li-school-districts`).
- `scripts/build_data.py` rebuilds `public/data/districts.json` and `public/data/boundaries.geojson`.
- `.github/workflows/deploy.yml` deploys `public/` on every push to `main`, using the `CLOUDFLARE_API_KEY` and `CLOUDFLARE_EMAIL` repo secrets (same setup as nassau-enrollment-map).

Sources: NYSED Property Tax Report Card 2026-27 (and revote file), NYSED BEDS Day enrollment 2025-26 and 2024-25, NCES EDGE LEA locations 2024-25, U.S. Census TIGER/Line 2024 school districts. Basemap: Esri World Dark Gray Canvas.
