# Detection Strategy

The target model is classifier-based snore detection, but the product should reach it in stages. Until a classifier is implemented and evaluated, amplitude-derived detections are Possible Snore Events.

## Principles

- Prefer honest uncertainty over confident but weak detection claims.
- Keep classification local when practical; avoid cloud audio inference unless local quality is inadequate.
- Show confidence language such as possible/likely, not confirmed.
- Treat Recording data as supporting context for the Sleep Breathing Concern Score, not the primary medical signal.

## Stage 1: Current Heuristic Detection

Current detection is amplitude-based: a sound stretch above a dBFS threshold opens an event, and hysteresis closes it. This can detect loud stretches but cannot distinguish snores from coughs, speech, blankets, traffic, or device noise.

Product language for this stage:

- Use **Possible Snore Event**.
- Avoid **confirmed snore**.
- Avoid making the quality score or concern band depend heavily on event counts.

## Stage 2: Rule-Based Feature Extraction

Add features that can support better classification and later model evaluation:

- Event duration.
- Peak and average dBFS.
- Time between candidate events.
- Event clustering across the Recording.
- Candidate spectral features if they can be computed efficiently in-browser.

This stage may still be heuristic, but it should produce structured evidence rather than a single threshold decision.

## Stage 3: Confidence UI

Introduce confidence bands in the event model and UI:

- Possible.
- Likely.
- Low confidence / needs review.

Even with a classifier, the UI should avoid “confirmed” unless there is ground-truth validation.

## Stage 4: Local ML Evaluation

Evaluate a small local browser-side model if rule-based features are insufficient. The model should be compared against labeled data or a manual review set before replacing heuristic event labels.

## User Feedback

Users may eventually mark whether a candidate event sounds like a snore. Feedback can support evaluation and model improvement, but it should not be described as clinical labeling.

## Relationship to Sleep Breathing Concern Score

The Sleep Breathing Concern Score should be Low/Moderate/High and anchored primarily in screening-style questionnaire answers. Recording data can support the score, but it should not dominate until detection quality is demonstrated.
