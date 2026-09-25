# Smart Lender — Interactive Loan Eligibility Prediction Lab

Smart Lender is an interactive full-stack machine-learning education project for exploring **loan eligibility prediction** from end to end.

The application lets users inspect a loan dataset, perform exploratory data analysis, configure preprocessing, train multiple classifiers, evaluate model performance, make individual predictions, and ask an AI tutor questions about machine learning.

> **Project type:** Educational ML / Data Science Web Application  
> **Frontend:** React + TypeScript + Vite  
> **Backend:** Node.js + Express + TypeScript  
> **AI:** Google Gemini API (optional)

## ✨ Features

- **Dataset Explorer** — inspect loan records and target labels.
- **Visual EDA Lab** — categorical counts, income distributions, decision cross-tabs, and income/loan scatter analysis.
- **Preprocessing Sandbox** — experiment with:
  - Mean, median, mode, or zero numeric imputation
  - Categorical imputation or row removal
  - Label encoding or one-hot encoding
  - Z-score feature scaling
  - Train/test split ratio
- **Classifier Arena** — train and compare:
  - Decision Tree
  - Random Forest
  - K-Nearest Neighbors (KNN)
  - Gradient-boosting/XGBoost-style simulator
- **Smart Predictor** — enter applicant information and generate a loan eligibility prediction.
- **AI Explanation** — optionally use Gemini to explain a model decision.
- **Interactive ML Tutor** — ask machine-learning questions through the Gemini API.
- **Local fallback** — the prediction explanation interface can still provide a local explanation when no Gemini key is configured.

## 🧠 ML Workflow

```text
Loan Dataset
     ↓
Data Inspection
     ↓
Exploratory Data Analysis
     ↓
Missing-Value Handling
     ↓
Categorical Encoding
     ↓
Feature Scaling
     ↓
Train / Test Split
     ↓
Model Training
     ├── Decision Tree
     ├── Random Forest
     ├── KNN
     └── Gradient Boosting
     ↓
Evaluation
     ├── Accuracy
     ├── Precision
     ├── Recall
     ├── F1 Score
     └── Confusion Matrix
     ↓
Smart Loan Prediction
     ↓
Optional Gemini Explanation
```

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| React 19 | User interface |
| TypeScript | Application and ML engine development |
| Vite | Frontend tooling and development server |
| Tailwind CSS 4 | Styling |
| Express | Backend API server |
| Node.js | Runtime |
| Lucide React | Icons |
| Google Gemini API | Optional AI tutor and explanations |
| dotenv | Environment-variable management |
| esbuild | Production server bundling |

## 📁 Project Structure

```text
Smart-Lender-main/
└── SmartLender/
    └── SmartLender-main/
        ├── src/
        │   ├── components/
        │   │   ├── ClassifierArena.tsx
        │   │   ├── DatasetExplorer.tsx
        │   │   ├── EDALaboratory.tsx
        │   │   ├── MLTutorChat.tsx
        │   │   ├── PreprocessingSandbox.tsx
        │   │   └── SmartPredictor.tsx
        │   ├── data/
        │   │   └── loanDataset.ts
        │   ├── utils/
        │   │   └── mlEngine.ts
        │   ├── App.tsx
        │   ├── main.tsx
        │   ├── index.css
        │   └── types.ts
        ├── index.html
        ├── server.ts
        ├── package.json
        ├── tsconfig.json
        └── vite.config.ts
```

## 🚀 Run Locally

### 1. Prerequisites

Install:

- Node.js 18+ recommended
- npm

### 2. Open the application directory

```bash
cd SmartLender/SmartLender-main
```

### 3. Install dependencies

```bash
npm install
```

### 4. Optional: configure Gemini

Create a `.env` file in the project directory:

```env
GEMINI_API_KEY=your_gemini_api_key
```

The Gemini key is only needed for the AI explanation and AI tutor features.

### 5. Start the development server

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

## 📦 Production Build

```bash
npm run build
npm start
```

## 🔍 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Express + Vite development server |
| `npm run build` | Build the frontend and bundle the backend |
| `npm start` | Start the production server |
| `npm run preview` | Preview the Vite production build |
| `npm run lint` | Run TypeScript checking |

## 📊 Input Features

The loan dataset contains fields such as:

- Gender
- Married
- Dependents
- Education
- Self Employment
- Applicant Income
- Coapplicant Income
- Loan Amount
- Loan Amount Term
- Credit History
- Property Area
- Loan Status

The target is the loan-status label (`Y` / `N`).

## ⚠️ Educational Disclaimer

This project is designed for **learning and demonstration purposes**. Its predictions should not be treated as real-world financial, credit, lending, or investment decisions.

The included dataset and in-browser ML implementations are intended to demonstrate machine-learning concepts rather than provide a production-grade credit-risk system.

## 🔐 Security

- Never commit `.env` files or API keys.
- Add `.env` / `.env.local` to `.gitignore`.
- Use environment variables for Gemini credentials.
- Do not expose private API keys in frontend source code.

## 🤝 Contributing

Contributions are welcome. See `CONTRIBUTING.md` for the suggested workflow.

## 📄 License

No license has been specified in the original project. If you publish this repository publicly, add a license that matches your intended usage.

