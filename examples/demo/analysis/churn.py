# /// script
# requires-python = ">=3.11"
# dependencies = ["plotly>=6"]
# ///
"""Monthly retention by signup cohort: churn.csv, an interactive Plotly chart and a summary."""

import csv
import os
import random
from pathlib import Path

import plotly.graph_objects as go

OUT = Path(os.environ["POST_LAB_OUT"])
COHORTS = [f"2026-{month:02d}" for month in range(1, 7)]

rng = random.Random(42)
rows = []
for index, cohort in enumerate(COHORTS):
    retained = 100.0
    for month in range(len(COHORTS) - index + 1):
        rows.append({"cohort": cohort, "month": month, "retained_pct": round(retained, 1)})
        retained *= 1 - rng.uniform(0.08, 0.2)

with (OUT / "churn.csv").open("w", newline="") as file:
    writer = csv.DictWriter(file, fieldnames=["cohort", "month", "retained_pct"])
    writer.writeheader()
    writer.writerows(rows)

figure = go.Figure()
for cohort in COHORTS:
    points = [row for row in rows if row["cohort"] == cohort]
    figure.add_trace(
        go.Scatter(
            x=[row["month"] for row in points],
            y=[row["retained_pct"] for row in points],
            mode="lines+markers",
            name=cohort,
        )
    )
figure.update_layout(
    xaxis_title="Months since signup",
    yaxis_title="Retained (%)",
    margin={"l": 40, "r": 10, "t": 10, "b": 40},
)
figure.write_html(OUT / "churn.html", include_plotlyjs="cdn")

month_3 = [row["retained_pct"] for row in rows if row["month"] == 3]
print(f"{len(COHORTS)} cohorts; mean retention after 3 months: {sum(month_3) / len(month_3):.1f}%")
