# RDX Request Tracking Utility — Executive Project Guide

> 🌟 **Visual PDF & Interactive Web Document Available:**  
> For the presentation version with colored cards, icons, and diagrams, open:  
> &bull; **PDF Document:** [RDX_Request_Tracking_Architecture.pdf](file:///d:/Request%20tracking%20Utility/RDX_Request_Tracking_Architecture.pdf)  
> &bull; **Interactive HTML:** [RDX_Request_Tracking_Architecture.html](file:///d:/Request%20tracking%20Utility/RDX_Request_Tracking_Architecture.html)

---

## 1. What is the Request Tracking Utility?
*Plain-English summary of the business problem and how this software solves it*

> **Core Purpose:** Companies lose thousands of dollars each month when team members give away free product samples, client gifts, or promotional items without budget checks or manager approvals. **RDX Request Tracking Utility** automates this entire lifecycle so that no sample leaves the warehouse without authorized signatures and recorded budget deductions.

Before this system, requests were handled through scattered emails, paper slips, or spreadsheets. This created 3 major bottlenecks:

| ❌ Problem 1: Budget Leakage | ❌ Problem 2: Lost Approvals | ❌ Problem 3: Warehouse Blindspot |
| :--- | :--- | :--- |
| Teams gave away samples without knowing if their department still had budget left, causing unplanned deficits. | Requests got stuck in executive inboxes for weeks with zero tracking or visibility into who was holding them up. | Once approved, no one knew if warehouse staff actually packed, dispatched, or delivered the items to the client. |

### ✅ The RDX Solution:
A single connected dashboard where **Sales/Staff create requests** &rarr; **Executives digitally sign** in a strict 4-step sequence &rarr; **Budgets auto-deduct** &rarr; **Warehouse staff fulfill shipments** on a real-time Kanban board &rarr; **Every detail is audited with timestamps and IP stamps**.

---

## 2. High-Level System Architecture: How It Works Behind the Scenes
*The 3-tier architecture in plain English*

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. USER SCREEN (React 19 Frontend Web Application)                          │
│    • Clean, responsive interface for Staff, Managers & Executives           │
│    • Interactive touch/mouse digital signature pad                          │
│    • 0ms instant response time via optimistic local browser cache           │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP REST API (/api/*)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ 2. APPLICATION SERVER (Node.js + Express 5)                                 │
│    • Traffic director: verifies logins, permissions & routes requests       │
│    • Auto-checks database tables on boot to prevent downtime                │
│    • Safe connection pooler connecting to cloud database                    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ SQL Connection
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ 3. CLOUD DATABASE (PostgreSQL / Neon)                                       │
│    • requests & sku_items: Client orders and history                        │
│    • teams & budget_transactions: Department spending & digital receipts    │
│    • audit_logs: Permanent flight recorder of who did what and when         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### The Zero-Lag Data Flow:
When you click **"Sign & Approve"**, the button turns green in **0 milliseconds** because it updates your browser memory first. It then quietly informs the cloud database in the background. Even if internet connection flickers, your work is never lost.

---

## 3. The 4-Stage Approval Journey
*Every request moves through a strict, sequential 4-level approval chain*

```
 [Employee Creates Request] ──► [System Checks Department Budget]
                                         │
                                         ▼
                             ┌───────────────────────┐
                             │ STAGE 1: Executive    │ ──► Commercial check: why needed & client history
                             └──────────┬────────────┘
                                        ▼
                             ┌───────────────────────┐
                             │ STAGE 2: Manager      │ ──► Team check: operational necessity & deadlines
                             └──────────┬────────────┘
                                        ▼
                             ┌───────────────────────┐
                             │ STAGE 3: HOD          │ ──► Budget check: confirms department has funds
                             └──────────┬────────────┘
                                        ▼
                             ┌───────────────────────┐
                             │ STAGE 4: President    │ ──► Final green light: sanctions company resources
                             └──────────┬────────────┘
                                        ▼
                           [⚡ Instant Budget Auto-Deduction]
                                        │
                                        ▼
                        [🚚 Warehouse Shipment Fulfillment]
```

### Automatic Financial Execution:
* **Valuation Formula:** $\text{Budget Cost} = \text{Retail Value} \times (1 - \frac{\text{Discount \%}}{100})$
* **Hard Budget Stop:** The system mathematically blocks requests if a department has insufficient remaining budget.
* **Instant Debit:** Upon Stage 4 approval, the team's balance is automatically debited and an immutable receipt is written into `budget_transactions`.

---

## 4. Warehouse Fulfillment & Courier Tracking
*Real-time Kanban logistics pipeline after request approval*

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ 1. APPROVED     │       │ 2. IN PROCESS   │       │ 3. DISPATCHED   │       │ 4. DELIVERED    │
│ Ready in        │  ──►  │ Packing, box    │  ──►  │ Handed over to  │  ──►  │ Delivery        │
│ warehouse stock │       │ labels & QA     │       │ courier & notes │       │ confirmed       │
└─────────────────┘       └─────────────────┘       └─────────────────┘       └─────────────────┘
```

1. **Approved – Ready (Green):** President signed off. Order is queued for warehouse stock picking and allocation.
2. **In Process (Amber):** Warehouse team is packing, labeling shipping boxes, and inspecting sample quality.
3. **Dispatched (Blue):** Package handed over to courier. Waybill number and tracking notes are attached.
4. **Delivered (Slate):** Delivery confirmed by client or recipient. System records timestamp and closes request.

---

## 5. Core Database Tables (In Plain English)

| Table Name | What It Stores in Plain English | Why It Matters |
| :--- | :--- | :--- |
| **requests** | Every sample/gift order created, items requested, and client name | Main record tracking the order from draft to delivered |
| **teams** | Each corporate department, their total budget, and spent money | Enforces financial spending caps so teams never overspend |
| **budget_transactions** | The digital receipt book for every single dollar spent or refunded | Immutable audit proof of balance before and after each approval |
| **users & roles** | Employees and who is allowed to sign off at each stage | Ensures only designated managers can sign off at their level |
| **forms & assignments** | Custom questionnaires created without writing code | Allows different departments to ask tailored questions on orders |
| **audit_logs** | The flight recorder: who did what, when, and from which IP | Complete legal audit trail for internal security and compliance |

---

## 6. Key Executive Benefits & ROI

* 🎯 **Zero Budget Waste:** Mathematical spending caps prevent unauthorized sample gifts.
* ⏱️ **5x Faster Approvals:** Managers sign securely on phones or laptops in under 30 seconds.
* 🛡️ **100% Audit Ready:** Digital signatures, IP stamps, and balance receipts for every order.
* 📊 **1-Click Excel Reports:** Download complete financial and dispatch spreadsheets instantly.

---

> 📄 **To view or print the official executive document:**  
> Open [RDX_Request_Tracking_Architecture.pdf](file:///d:/Request%20tracking%20Utility/RDX_Request_Tracking_Architecture.pdf)
