# SlayQL — Agentic Text-to-SQL Evaluation Platform

An interactive, multi‑environment benchmark platform for evaluating **Text‑to‑SQL** systems.
Supports **Spider 2.0‑Lite**, **BIRD**, and upcoming **Spider 2.0‑Snow** — with pluggable frameworks (`AutoLink`, `ReFoRCE`) and multiple LLM backends.

---

## ✨ Features

* **Natural Language → SQL** – Type a query description and see the generated SQL with reasoning steps.
* **Multi‑Benchmark Support** – Switch between Spider 2.0‑Lite, BIRD, and Snowflake (coming soon) datasets.
* **SOTA Replication Tracker** – Compare your model’s performance against published baselines with live scores.
* **Data Explorer** – Browse database schemas, preview sample rows, and inspect table metadata interactively.
* **Lazy‑Loaded Samples** – Table previews load on‑demand to keep the UI responsive.
* **Chart Visualisation** – Toggle between table, bar, and line views for query results (powered by QuickChart).
* **Secure Login** – Simple authentication via environment‑defined credentials.
* **Responsive Design** – Works on desktop and mobile with a collapsible sidebar and bottom navigation on small screens.

---

## 🏗️ Project Structure

```
slayyyql/
├── app/
│   ├── page.tsx               # Root entry – login → welcome → main app
│   ├── globals.css
│   ├── layout.tsx
│   ├── components/
│   │   ├── Login.tsx           # Auth form (User ID + Passcode)
│   │   ├── WelcomeAnimation.tsx # Animated onboarding sequence
│   │   ├── MainApp.tsx         # Tabs container (Prompt / Data / SOTA)
│   │   ├── Sidebar.tsx         # Navigation sidebar (desktop) + bottom nav (mobile)
│   │   ├── PromptArea.tsx      # Text input + conversation + LLM response cards
│   │   ├── LLMResponseCard.tsx  # Display SQL, reasoning, results table/chart
│   │   ├── ThinkingAnimation.tsx # Animated thinking steps during generation
│   │   ├── DataExploration.tsx  # Benchmark environment selection cards
│   │   ├── BenchmarkExploration.tsx (Spider2LitePage / BirdPage) # Data browser
│   │   ├── SOTAComparison.tsx   # Leaderboard with metric bars
│   │   └── CanvasParticles.tsx  # Canvas‑based floating particle system
│   └── data/                   # Static JSON data for database indexes and samples
│       ├── spider2-lite-index.json
│       ├── bird-exploration.json
│       └── samples/            # (not shown, but referenced)
├── public/
│   ├── logo.png
│   └── logo-text.png
├── .env.local                  # NEXT_PUBLIC_USER_ID & NEXT_PUBLIC_PASSCODE
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

* Node.js 18+ (recommended: 20 LTS)
* npm, yarn, pnpm, or bun

### Installation

```bash
git clone <your-repo-url>
cd slayyyql
npm install
```

### Environment Configuration

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_USER_ID=your_user_id
NEXT_PUBLIC_PASSCODE=your_passcode
```

> These values are used by the login component. They are **not** cryptographic‑grade security – the project is intended for controlled evaluation environments.

### Start Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

---

## 🔧 Configuration

### Available Datasets

The **Data Exploration** tab currently supports:

| Environment     | Engine(s)                   | Status         |
| --------------- | --------------------------- | -------------- |
| Spider 2.0‑Lite | BigQuery, Snowflake, SQLite | ✅ Ready        |
| BIRD Benchmark  | SQLite                      | ✅ Ready        |
| Spider 2.0‑Snow | Snowflake SQL               | 🚧 Coming Soon |

### Supported Frameworks & Models (Mockup Mode)

In demo mode (`useMockup={true}` in `PromptArea`), the UI simulates a full pipeline.
To connect real backends, replace the mock SQL generation with API calls to your own LLM / agent service.

---

## 🧪 Usage

1. **Login** – Enter the configured User ID and Passcode.
2. **Welcome sequence** – Animated loading screen with progress bar.
3. **Main App** – Three tabs:

   * **Text to SQL** – Type a query in natural language, observe reasoning steps and generated SQL with mock results.
   * **Explore** – Choose a benchmark environment, browse databases/tables, and inspect sample data.
   * **SOTA** – View a leaderboard comparing replicated baselines (AutoLink, MCTS‑SQL, RetrySQL, ReFoRCE) and projected SlayQL scores.
4. **Sidebar** – Desktop users can collapse the sidebar; mobile users get a bottom navigation bar. A logout button is available at the bottom.

---

## 🛠️ Customisation

* **Replace mock data** – Edit `PromptArea.tsx` to call your real backend for SQL generation.
* **Add new benchmarks** – Add entries to the `environments` array in `BenchmarkExploration.tsx` and provide the corresponding route and JSON index data.
* **Change colours / theme** – Modify Tailwind classes in the components. The app uses a dark cyberpunk palette (`#060b14`, cyan, fuchsia, violet).

---

## 📁 Data Files

Sample data is loaded from the `public/data/` directory:

* `spider2-lite-index.json` – Index of databases and table metadata for Spider 2.0‑Lite.
* `bird-exploration.json` – Full schema + sample rows for BIRD (embedded in the file).
* Individual sample files (e.g. `samples/<db>/<table>.json`) – Lazy‑loaded when a table is selected in Spider 2.0‑Lite.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome.
Please open an issue or a pull request.

---

## 📄 License

This project is provided for research and evaluation purposes.
All rights reserved.
