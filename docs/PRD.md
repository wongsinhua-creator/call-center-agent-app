# PRD — Call Center Complaint Tracker

## Problem
Call center agents have no fast, clean way to log and track customer complaints. Spreadsheets get messy; enterprise tools are too slow. Recruiters have nothing to click to prove a builder can ship a real product.

## Target User
Call center agent (demo mode: any recruiter visiting the live URL).

## Core Objects
- **Complaint** — the primary record created for each customer issue
- **Category** — Billing, Technical, Service Quality (extensible)
- **Audit Log** — every status change and AI action recorded

## MVP Must-Haves (v1)
- [ ] Submit a new complaint (caller name, phone, channel, description)
- [ ] AI auto-assigns category and urgency score on submission
- [ ] Complaint list view with status badges and priority sort
- [ ] Complaint detail page with status update (Open → In Progress → Resolved)
- [ ] Dashboard: open count, by-category breakdown, top-priority queue
- [ ] Demo seed data visible without login
- [ ] All actions persist to database; UI reflects changes on refresh

## Non-Goals (v1)
- Agent login / per-agent data isolation
- SLA timers, breach alerts
- Email / webhook notifications
- Supervisor roles or team management
- Trend charts beyond the basic dashboard

## Success Criteria
A recruiter opens the live URL, sees 5 real-looking complaints with AI scores, submits a new complaint via the form, watches the AI tag it and the dashboard count increment, changes the status to In Progress, and closes the tab — all in under 30 seconds, with no login prompt.
