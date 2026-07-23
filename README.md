# DuoSpend ⚡ - Household Expense & Splitter for Couples

DuoSpend is a modern, full-stack web application designed for couples to track shared household expenses, calculate fair balance settlements ("Who paid / Who owes"), manage monthly category budgets, and track recurring bills.

It features **native Gemini AI automation** for voice memo expense parsing, OCR receipt scanning via Gemini Vision, and personalized AI household financial advice.

---

## 🌟 Key Features

1. **Who-Paid / Who-Owes Balance Engine**:
   - Calculates exact net balances automatically based on expense entries.
   - Supports 50/50 equal splits, custom percentage splits, custom dollar splits, or 100% individual shares.
   - 1-click **"Settle Up"** action to record settlement payments and clear debts.

2. **Gemini Voice & Text Memo Parsing**:
   - Speak or type natural text (e.g., *"I spent $45 on groceries at Trader Joes paid by Alex split 50/50"*).
   - Gemini parses the input into structured transaction data ready for immediate confirmation.

3. **Gemini Vision Receipt OCR Scanner**:
   - Upload receipt images or take photos on your mobile phone.
   - Gemini Vision reads the merchant, date, total amount, category, tax, and itemized line items.

4. **AI Household Financial Advisor**:
   - Analyzes your household ledger, detects spending spikes and anomalies, and generates tailored savings advice.

5. **Monthly Budgets & Recurring Bill Tracker**:
   - Real-time progress bars and over-budget alerts.
   - Calendar due-date reminders with payment completion toggles and autopay badges.

6. **Filterable & Searchable History**:
   - Search by merchant or notes, filter by payer or category, and browse paginated expense history.

---

## 📂 Repository Structure

```text
DuoSpend/
├── backend/                  # Full-stack Node.js & Express Server
│   ├── db.ts                 # Database layer with persistent storage and settlement math
│   ├── geminiService.ts      # Gemini AI SDK integration (Voice, Vision OCR, Insights)
│   └── routes.ts             # Express REST API endpoints (/api/*)
├── src/                      # React / Vite Frontend
│   ├── components/           # Modular UI Components
│   │   ├── AIAdvisor.tsx            # AI Financial Insights Tab
│   │   ├── AnalyticsCharts.tsx      # Recharts Category & Partner Visuals
│   │   ├── BillTracker.tsx          # Recurring Bills Manager
│   │   ├── BudgetPlanner.tsx        # Monthly Budget vs Actuals
│   │   ├── Header.tsx               # App Header & Month Selector
│   │   ├── ReceiptScannerModal.tsx  # Gemini Vision Receipt Scanner
│   │   ├── SettingsModal.tsx        # API Key & Preferences Modal
│   │   ├── SettleUpModal.tsx        # Balance Settlement Modal
│   │   ├── SummaryCards.tsx         # Top Household KPI Cards
│   │   ├── TransactionForm.tsx      # Expense & Split Creator Form
│   │   ├── TransactionList.tsx      # Searchable Paginated Ledger
│   │   └── VoiceModal.tsx           # Voice & Text Memo Modal
│   ├── services/
│   │   └── api.ts            # Client API Fetch Wrapper
│   ├── App.tsx               # Main Application Component
│   ├── index.css             # Tailwind CSS imports
│   ├── main.tsx              # React entrypoint
│   └── types.ts              # Global TypeScript types & interfaces
├── data/
│   └── store.json            # Persistent JSON ledger database
├── .env.example              # Environment variables template
├── metadata.json             # Applet metadata configuration
├── package.json              # Dependencies & npm scripts
├── server.ts                 # Express & Vite development server entry point
├── tsconfig.json             # TypeScript config
└── vite.config.ts            # Vite bundler configuration
```

---

## 🔑 Gemini API Key Configuration

The Gemini API powers voice parsing, receipt image reading, and AI financial analysis.

### Option 1: Environment Variable (Recommended for Deployment)
Set the `GEMINI_API_KEY` environment variable in your `.env` or deployment platform:
```bash
GEMINI_API_KEY="your-gemini-api-key-here"
```

### Option 2: Settings UI Override
You can also set or update your Gemini API Key directly inside the app:
1. Click the **Gear icon (Settings)** in the top right header.
2. Enter your API Key in the **Gemini API Key** field.
3. Click **Test Connection** to verify your key.
4. Click **Save Preferences**. (Stored locally in user browser state & backend settings).

---

## 🚀 Local Development Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/duospend.git
   cd duospend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   ```
   Add your `GEMINI_API_KEY` to the `.env` file.

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Open your browser at [http://localhost:3000](http://localhost:3000).

---

## 🏗️ Production Build & Deployment

To bundle and launch in production:

1. **Build the client and bundle the backend server**:
   ```bash
   npm run build
   ```

2. **Start the production server**:
   ```bash
   npm start
   ```

The application runs on port `3000` (or the port defined by `process.env.PORT`).

---

## 📄 License
Apache-2.0 License
