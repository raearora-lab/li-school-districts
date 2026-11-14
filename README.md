# Long Island school districts: enrollment and budgets

Static site comparing all 125 Nassau and Suffolk school districts: 2026-27 proposed budgets, tax levies, tax-cap status, per-pupil spending, and fall 2025 enrollment. Leaflet map with a pin per district office and district boundaries, color-by metric, linked sortable table, and charts.

- `public/` is the deployable site (Cloudflare Pages project `li-school-districts`).
- `scripts/build_data.py` rebuilds `public/data/districts.json` and `public/data/boundaries.geojson`; then run `scripts/build_metrics.py` to merge graduation rates, test scores and teacher salaries and write `public/data/li_school_districts.csv`.
- Compare mode: shift/ctrl-click pins, the Compare button in a popup or card, or table checkboxes (2-6 districts). Shareable as `#compare=<NCES id>,<NCES id>,...`.
- `.github/workflows/deploy.yml` deploys `public/` on every push to `main`, using the `CLOUDFLARE_API_KEY` and `CLOUDFLARE_EMAIL` repo secrets (same setup as nassau-enrollment-map).

Sources: NYSED 2025 High School Graduation Rate database (2021 cohort, 4-year, Aug 2025); NYSED Report Card database SRC2025 (grades 3-8 ELA/math and Regents, 2024-25); NYSED Personnel Master File 2024-25 (classroom teacher salaries); NYSED Property Tax Report Card 2026-27 (and revote file), NYSED BEDS Day enrollment 2025-26 and 2024-25, NCES EDGE LEA locations 2024-25, U.S. Census TIGER/Line 2024 school districts. Basemap: Esri World Dark Gray Canvas.
