# LeakWatch 🚨

## AI-Powered Early Warning System for Exam Paper Leak Detection

LeakWatch is a prototype AI-assisted monitoring system designed to detect
potential exam-paper leak signals by combining:

- 🔵 NLP — suspicious language detection
- 🟣 Message Velocity — abnormal sharing/activity detection
- 🩷 Image Match — reference-image similarity
- 🟡 Fusion Scoring — combines multiple signals into one risk score

## How It Works

Detect → Verify → Score → Alert

The prototype calculates:

Fused Risk = 0.4 × NLP + 0.3 × Velocity + 0.3 × Image Match

A Fusion Risk score of 68 or above triggers a scored alert for human
verification.

## Prototype

The dashboard demonstrates:
- Fusion Scoring Engine
- Z-score anomaly detection
- Exam-center chatter clusters
- Image Match Lab
- Risk levels and alert threshold
- Leak-spike simulation

## Important

This is a hackathon prototype using simulated/demo signals.
It does not establish that an actual examination paper has leaked.
A real deployment would require authorized data access, calibrated models,
privacy safeguards, secure infrastructure, and human verification.
