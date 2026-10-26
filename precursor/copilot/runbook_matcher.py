"""Deterministic Runbook Matcher using structured keywords and tags."""

import os
import re
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from precursor.incidents.schema import Incident

RUNBOOKS_DIR = os.path.join(os.path.dirname(__file__), "runbooks")


class RunbookMatch(BaseModel):
    """Result of matching an incident to a bundled runbook."""
    filename: str
    title: str
    tags: List[str] = Field(default_factory=list)
    target_metrics: List[str] = Field(default_factory=list)
    relevance_score: float = Field(..., description="Match score based on tag & metric overlaps")
    content: str = Field(..., description="Full or excerpted Markdown text of runbook")


class RunbookMatcher:
    """
    Scans local Markdown runbooks and deterministically matches the most relevant runbooks
    for a given incident using tag, metric, and keyword intersection.
    """

    def __init__(self, runbooks_dir: str = RUNBOOKS_DIR):
        self.runbooks_dir = runbooks_dir
        self.runbooks: List[Dict[str, Any]] = []
        self._load_runbooks()

    def _load_runbooks(self):
        self.runbooks.clear()
        if not os.path.exists(self.runbooks_dir):
            return

        for fname in sorted(os.listdir(self.runbooks_dir)):
            if not fname.endswith(".md"):
                continue
            fpath = os.path.join(self.runbooks_dir, fname)
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    content = f.read()

                # Parse title
                title_match = re.search(r"^#\s*Runbook:\s*(.+)$", content, re.MULTILINE)
                title = title_match.group(1).strip() if title_match else fname

                # Parse tags
                tags_match = re.search(r"\*\*Tags:\*\*\s*(.+)$", content, re.MULTILINE)
                tags = [t.strip().lower() for t in tags_match.group(1).split(",")] if tags_match else []

                # Parse target metrics
                metrics_match = re.search(r"\*\*Target Metrics:\*\*\s*(.+)$", content, re.MULTILINE)
                metrics = [m.strip().lower() for m in metrics_match.group(1).split(",")] if metrics_match else []

                self.runbooks.append({
                    "filename": fname,
                    "title": title,
                    "tags": tags,
                    "target_metrics": metrics,
                    "content": content,
                })
            except Exception:
                pass

    def match(self, incident: Incident, top_k: int = 2) -> List[RunbookMatch]:
        """Match the top_k most relevant runbooks for the given incident."""
        if not self.runbooks:
            self._load_runbooks()

        scored_matches: List[RunbookMatch] = []
        incident_metrics = set(m.lower() for m in incident.primary_metrics)
        title_words = set(re.findall(r"\w+", incident.title.lower()))

        for rb in self.runbooks:
            score = 0.0
            rb_metrics = set(rb["target_metrics"])
            rb_tags = set(rb["tags"])

            # Metric exact match (highest weight)
            metric_overlap = len(incident_metrics.intersection(rb_metrics))
            score += metric_overlap * 3.0

            # Tag match with title words or metrics
            tag_overlap = len(title_words.intersection(rb_tags))
            score += tag_overlap * 1.5

            # If active fault and runbook is connectivity/interface
            if incident.is_active_fault and ("connectivity" in rb["tags"] or "interface" in rb["tags"]):
                score += 2.0

            # If sensor degradation / suppressed
            if incident.status == "SUPPRESSED" and "sensor" in rb["tags"]:
                score += 4.0

            if score > 0.0:
                scored_matches.append(
                    RunbookMatch(
                        filename=rb["filename"],
                        title=rb["title"],
                        tags=rb["tags"],
                        target_metrics=rb["target_metrics"],
                        relevance_score=score,
                        content=rb["content"],
                    )
                )

        scored_matches.sort(key=lambda m: m.relevance_score, reverse=True)
        return scored_matches[:top_k]
