# Rewards Tracker

A simple dashboard for our team to track daily transactions and rewards signups. 

The goal here is pretty simple: stop guessing how we're doing and get some actual data. It tracks penetration rates, lets us compare how different team members are performing, and keeps a history of our shifts so we can spot trends over time.

### How it works
- **Tracking:** We log daily totals for transactions and signups.
- **Insights:** The dashboard handles the math, giving us a "store average" and a week-over-week trend so we can see how we're actually tracking.
- **Comparison:** There's a compare mode if you want to look at two people side-by-side.

### Tech Stack
Built with:
- Firebase (Firestore & Auth)
- Chart.js for the visual trends
- Vanilla JavaScript (because it's fast and reliable)

---
*Still a work in progress! Next up is likely an automated weekly email report for the team.*