# Snore

Snore is a personal sleep tracking product for recording overnight audio signals, identifying snoring-related events, and reviewing sleep-noise history.

## Language

**Recording**:
A captured sleep-monitoring period for one user, usually overnight, including its start/end time, noise levels, detected events, and any saved clips.
_Avoid_: Sleep session, night, session

**Snore Event**:
A classifier-detected occurrence of snoring within a Recording. Until classifier-based detection exists, amplitude-based detections should be treated as provisional events rather than confirmed snores.
_Avoid_: Loudness event, detected snore

**Possible Snore Event**:
A provisional snoring-related event detected before classifier-based Snore Events are available, usually from amplitude, duration, and other heuristic signals.
_Avoid_: Snore Event, confirmed snore

**Sleep Breathing Concern Score**:
A Low/Moderate/High concern band derived primarily from established sleep-breathing screening questions, with Recording data used as supporting context. It is not a diagnosis.
_Avoid_: Sleep apnea risk score, diagnosis, medical result, numeric score

**Admin**:
A privileged app operator who can view cross-user account and Recording metadata for operations and support. Admins should not access audio clips by default.
_Avoid_: User dashboard, settings

**Clinician Report**:
A user-generated summary intended to support a conversation with a healthcare professional. It may include questionnaire answers, Recording summaries, trends, and explicitly selected clips or exports.
_Avoid_: Medical record, diagnosis

**Admin Audit Log**:
An append-only record of admin reads of user-level data and all admin mutations. It supports internal review first and should be designed so user-visible access history can be added later.
_Avoid_: Debug log, analytics event
