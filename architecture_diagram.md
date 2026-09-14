# RDX Request Management System — Working Architecture

## 🗺️ High-Level Architecture

```mermaid
graph TB
    subgraph CLIENT["🖥️ Client — Browser (React + Vite)"]
        direction TB
        UI["Pages / Components\n(11 Feature Modules)"]
        CTX["Context Layer\nAuth · Theme · Notifications · System"]
        DS["dataService.ts\n(Primary Data Layer)"]
        API_SVC["apiService.ts\n(HTTP Adapter)"]
        LS["LocalStorage\n(storage.ts)"]
        MOCK["mockData.ts\n(Fallback / Dev Data)"]

        UI --> CTX
        CTX --> DS
        DS --> API_SVC
        DS --> LS
        DS -.->|"fallback if API\nunavailable"| MOCK
    end

    subgraph SERVER["🖥️ Server — Node.js / Express 5"]
        direction TB
        EXPRESS["app.js\n(All REST Routes)"]
        DB_MOD["db.js\n(pg Pool)"]
        EXPRESS --> DB_MOD
    end

    subgraph DB["🐘 PostgreSQL"]
        TABLES["Tables\nusers · teams · requests\nbudgets · forms · form_assignments\naudit_logs · notifications · settings"]
    end

    subgraph DEPLOY["☁️ Vercel Deployment"]
        STATIC["Static Files\n(dist/)"]
        SLS["Serverless Function\n(api/index.js)"]
    end

    API_SVC -->|"REST /api/*\nfetch()"| EXPRESS
    DB_MOD -->|"SQL Queries\npg Pool"| DB

    CLIENT -->|"Build → npm run build"| STATIC
    SERVER -->|"Bundled as"| SLS
    SLS -->|"/api/* rewrites"| EXPRESS
```

---

## 🔄 Request Lifecycle (Data Flow)

```mermaid
sequenceDiagram
    participant User
    participant Page as Page Component
    participant Context as React Context
    participant DS as dataService.ts
    participant LS as LocalStorage
    participant API as apiService.ts
    participant Express as Express (app.js)
    participant PG as PostgreSQL

    User->>Page: Perform Action (e.g. Submit Request)
    Page->>Context: Call context method
    Context->>DS: dataService.createRequest(data)
    DS->>LS: Save to LocalStorage (immediate/optimistic)
    DS->>API: api.createRequest(data) [async, fire & forget]
    API->>Express: POST /api/requests
    Express->>PG: INSERT INTO requests ...
    PG-->>Express: Row returned
    Express-->>API: 201 Created
    Note over DS,LS: UI already updated via LocalStorage
    DS->>DS: Emit 'storage-synced' event
    DS-->>Context: State refreshed
    Context-->>Page: Re-render with new data
```

---

## 🏛️ Frontend Layer Breakdown

```mermaid
graph LR
    subgraph PROVIDERS["Provider Tree (main.tsx → App.tsx)"]
        TP["ThemeProvider"]
        AP["AuthProvider"]
        SP["SystemProvider"]
        NP["NotificationProvider"]
        TP --> AP --> SP --> NP
    end

    subgraph LAYOUT["Shell Layout"]
        HDR["Header\n(Search, Notifications, User)"]
        SDB["Sidebar\n(Navigation Links)"]
        CONTENT["Page Content\n(Conditional Render)"]
    end

    subgraph PAGES["Feature Pages"]
        DASH["Dashboard"]
        REQ["Requests + Detail"]
        APR["Approvals Queue"]
        TEAM["Teams"]
        BUD["Budgets"]
        FORM["Forms + Assignments"]
        RPT["Reports"]
        AUD["Audit Logs"]
        USR["Users"]
        SET["Settings"]
    end

    NP --> LAYOUT
    LAYOUT --> PAGES
```

---

## 🌐 API Endpoints Map

```mermaid
graph TD
    subgraph ROUTES["Express REST API (app.js)"]
        BOOT["/api/bootstrap\nGET — Load all app data"]
        USERS["/api/users\nGET · POST · PUT · DELETE"]
        TEAMS["/api/teams\nGET · POST · PUT · DELETE"]
        REQS["/api/requests\nGET · POST · PUT · DELETE"]
        BUDG["/api/budget-transactions\nPOST"]
        FORMS["/api/forms\nGET · POST"]
        FA["/api/form-assignments\nGET · POST"]
        AUDIT["/api/audit-logs\nGET · POST"]
        NOTIF["/api/notifications\nGET · POST · PUT"]
        SETT["/api/settings\nGET · PUT"]
    end
```

---

## 📦 State Management Strategy

```mermaid
flowchart TD
    BOOT["App Boot\n(api/bootstrap)"]
    BOOT -->|"Success"| PG_DATA["Load all data from PostgreSQL\ninto LocalStorage"]
    BOOT -->|"Failure / Offline"| MOCK_DATA["Fall back to mockData.ts\n(Dev/Demo mode)"]

    PG_DATA --> LS_STATE["LocalStorage\n(Single source of truth\nfor UI reads)"]
    MOCK_DATA --> LS_STATE

    LS_STATE --> CTX_REFRESH["React Contexts\nread from LocalStorage"]
    CTX_REFRESH --> UI_RENDER["UI Renders"]

    UI_RENDER -->|"User Mutation"| DS_WRITE["dataService writes\nto LocalStorage first"]
    DS_WRITE --> SYNC_EVENT["'storage-synced' event\n→ App re-renders"]
    DS_WRITE -->|"Async, best-effort"| API_SYNC["apiService syncs\nto PostgreSQL"]
```

---

## 🚀 Deployment Architecture

```mermaid
graph LR
    subgraph LOCAL["Local Dev"]
        FE_DEV["Vite Dev Server\n:5173"]
        BE_DEV["Express Server\n:3000 (or PORT env)"]
        PG_LOCAL["Local PostgreSQL\nrdx_request_db"]
        FE_DEV -->|"proxy /api/*"| BE_DEV
        BE_DEV --> PG_LOCAL
    end

    subgraph VERCEL["Vercel Production"]
        STATIC_V["Static Bundle\n(dist/)"]
        SLS_V["Serverless Fn\n(api/index.js)"]
        PG_CLOUD["Cloud PostgreSQL\n(Neon / DATABASE_URL)"]
        STATIC_V -->|"/api/* rewrite"| SLS_V
        SLS_V --> PG_CLOUD
    end

    LOCAL -->|"git push → CI/CD"| VERCEL
```
