# FinTrack docs

Project notes, architecture decisions, and API documentation go here.

## Planned areas

- Screens and navigation map (frontend)
- Data models and persistence (backend)
- Advisor prompts and safety guidelines (advisor)
1. POST /transactions
   → create an expense: amount=500, currency=ETB,
     type=expense, cost_type=fixed,
     category=rent, date=2026-05-25

2. POST /transactions
   → create income: amount=1200, currency=USD,
     type=income, cost_type=fixed,
     category=salary, date=2026-05-25

3. GET /transactions
   → should return both transactions

4. GET /transactions/summary
   → should show income, expense, balance,
     fixed_costs breakdown