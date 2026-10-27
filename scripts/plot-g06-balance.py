"""Export reproducible scientific figures from the recorded 50-seed reports."""
import json
import os
from pathlib import Path

os.environ.setdefault("MPLCONFIGDIR", "/tmp/fun-matplotlib")
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

root = Path(__file__).resolve().parents[1]
folder = root / "arcade/docs/v1.5"
before = json.loads((folder / "batch5c-balance-before-20261028.json").read_text())
after = json.loads((folder / "batch5c-balance-after-20261028.json").read_text())
assert before["seedCount"] == after["seedCount"] == 50
assert before["strategyHash"] == after["strategyHash"], "Controllers must match"
strategies = ["idle", "basic", "held", "safe", "skilled"]
labels = ["No input", "Steering", "Held boost", "Brake + boost", "Skilled"]

def mean(report, strategy, key, chapter=None):
    rows = [r for r in report["groups"] if r["strategy"] == strategy and
            (chapter is None or r["chapter"] == chapter)]
    values = [r[key] for r in rows if r[key] is not None]
    return sum(values) / len(values) if values else 0

plt.rcParams.update({"font.size": 11, "axes.spines.top": False, "axes.spines.right": False})
fig, axes = plt.subplots(2, 2, figsize=(13, 8.5), constrained_layout=True)
colors = ["#687887", "#098a92"]
x = np.arange(5)
for i, (report, name) in enumerate([(before, "Before"), (after, "After")]):
    axes[0, 0].bar(x + (i - .5) * .34,
                   [100 * mean(report, s, "podiumRate") for s in strategies],
                   width=.34, label=name, color=colors[i])
    axes[0, 1].plot(range(1, 6), [mean(report, "skilled", "meanFinish", c) for c in range(1, 6)],
                    "o-", label=name, color=colors[i])
    axes[1, 0].bar(x + (i - .5) * .34,
                   [mean(report, s, "meanCaught") for s in strategies],
                   width=.34, label=name, color=colors[i])
axes[0, 0].set(title="Completion rate (official top three)", ylabel="Percent", ylim=(0, 105))
axes[0, 0].set_xticks(x, labels, rotation=15)
axes[0, 0].legend()
axes[0, 1].set(title="Skilled finish time by circuit", xlabel="Chapter", ylabel="Seconds (3 laps in C1; 2 thereafter)")
axes[0, 1].set_xticks(range(1, 6))
axes[0, 1].legend()
axes[1, 0].set(title="AI passes after the player first takes the lead", ylabel="Mean recorded passes per race")
axes[1, 0].set_xticks(x, labels, rotation=15)
matrix = np.array([[next(r["firstPlaceRate"] for r in after["groups"]
                         if r["strategy"] == "skilled" and r["chapter"] == c and r["difficulty"] == d)
                    for d in ["normal", "hard", "expert"]] for c in range(1, 6)])
heat = axes[1, 1].imshow(matrix, vmin=0, vmax=1, cmap="YlGnBu", aspect="auto")
axes[1, 1].set(title="Skilled first-place rate after optimization", ylabel="Chapter")
axes[1, 1].set_xticks(range(3), ["Normal", "Hard", "Expert"])
axes[1, 1].set_yticks(range(5), range(1, 6))
for row in range(5):
    for col in range(3):
        axes[1, 1].text(col, row, f"{100 * matrix[row, col]:.0f}%", ha="center", va="center",
                        color="white" if matrix[row, col] > .5 else "black")
fig.colorbar(heat, ax=axes[1, 1], fraction=.05)
fig.suptitle("Bio-City Arcade 5C | 50 seeds x 5 circuits x 3 difficulties x 5 strategies per version", fontsize=14)
fig.savefig(folder / "batch5c-balance-20261028.svg")
fig.savefig(folder / "batch5c-balance-20261028.png", dpi=180)
print("Exported balance figure from 7,500 recorded races")
