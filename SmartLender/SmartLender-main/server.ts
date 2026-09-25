import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not defined.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// API route to get explanation using Gemini
app.post("/api/gemini/explain", async (req, res) => {
  try {
    const { applicantData, decision, confidence, modelName, metrics } = req.body;

    if (!applicantData) {
      return res.status(400).json({ error: "Applicant data is required." });
    }

    const hasApiKey = !!process.env.GEMINI_API_KEY;

    if (!hasApiKey) {
      // Graceful fallback description when key is missing, maintaining UX stability
      const localExplanation = `
### 📊 Local Machine Learning Analysis (API Key Demo Mode)

**Decision**: ${decision === "Y" ? "Approved" : "Rejected"}
**Model**: ${modelName} (Confidence: ${(confidence * 100).toFixed(0)}%)

*Note: Please configure your **GEMINI_API_KEY** in the **Settings > Secrets** panel in AI Studio to unlock dynamic generative AI commentary.*

#### Key Influencing Factors for this applicant:
1. **Credit History**: ${applicantData.Credit_History === 1 ? "Excellent (1.0). This is the single strongest factor in the model decision." : "No credit history or poor credit (0.0). Standard loan models strictly reject applicants without satisfactory credit histories."}
2. **Income-to-Debt Ratio**: The applicant has an Income of $${applicantData.ApplicantIncome}/mo and a Coapplicant Income of $${applicantData.CoapplicantIncome}/mo, requesting a Loan Amount of $${applicantData.LoanAmount}k.
3. **Property Area**: ${applicantData.Property_Area} zones display average default profiles of ~12%.

#### Educational Recommendation:
To maximize eligibility, applicants with credit score limitations should establish a stable 12-month transaction record or apply with a co-signer with high income.
      `;
      return res.json({ explanation: localExplanation.trim() });
    }

    const ai = getGeminiClient();

    const prompt = `
You are an expert financial machine learning model explainer and credit risk consultant for the "Smart Lender" Loan Eligibility Predictor system.
An applicant submitted a loan application, and our classification model (${modelName}) predicted: ${decision === "Y" ? "ELIGIBLE / APPROVED" : "NOT ELIGIBLE / REJECTED"}.
Provide a clear, pedagogical, and professional review of the decision based on the applicant's parameters and the machine learning model's behavior.

### Applicant Profile Data:
- Gender: ${applicantData.Gender || "Not Provided"}
- Married: ${applicantData.Married || "Not Provided"}
- Dependents: ${applicantData.Dependents || "0"}
- Education: ${applicantData.Education}
- Self Employed: ${applicantData.Self_Employed || "Not Provided"}
- Applicant Income: $${applicantData.ApplicantIncome} / month
- Co-applicant Income: $${applicantData.CoapplicantIncome} / month
- Requested Loan Amount: $${applicantData.LoanAmount} ($ in thousands)
- Loan Term: ${applicantData.Loan_Amount_Term} days
- Credit History: ${applicantData.Credit_History === 1 ? "Clear (1.0)" : "Poor/Unavailable (0.0)"}
- Property Area: ${applicantData.Property_Area}

### Current Model Performance metrics:
- Model Accuracy: ${(metrics?.accuracy * 100 || 80).toFixed(1)}%
- F1-Score: ${(metrics?.f1 || 0.82).toFixed(2)}

### Your Output Format:
Explain the decision in clean, scannable Markdown. Make sure it contains:
1. **Model Verdict Breakdown**: Discuss why the classifier (e.g. Random Forest, KNN) reached this decision. (Highlight credit history, which is normally the most critical feature in this dataset, and the applicant's overall income vs. requested loan amount).
2. **Feature Analysis**: A brief explanation of how ApplicantIncome and LoanAmount affect the risk.
3. **Actionable Improvement Recommendations**: If rejected, how can the applicant change these numbers (e.g. lowering loan amount, adding a co-applicant) to transition to "Approved"? If approved, are there any precautions?
4. **Learning Corner Note**: Explain to the student how data preprocessing (like handling missing credit history) directly impacts this prediction.

Keep your tone professional, encouraging, and highly educational for students learning Data Science.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ explanation: response.text });
  } catch (error: any) {
    console.error("Gemini explanation endpoint error:", error);
    res.status(500).json({ error: error.message || "An error occurred with the Gemini API service." });
  }
});

// API route for general AI Assistant Q&A about Machine Learning
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { message, chatHistory } = req.body;
    const hasApiKey = !!process.env.GEMINI_API_KEY;

    if (!hasApiKey) {
      return res.json({
        reply: "Hi! I'm the Smart Lender AI Tutor. I would love to answer your machine learning questions, but the Gemini API key is not configured in **Settings > Secrets**. Please add it to unlock this interactive AI feature!"
      });
    }

    const ai = getGeminiClient();

    const systemInstruction = `
You are the interactive "Smart Lender ML Tutor", an expert AI data scientist helping students learn machine learning concepts, classification algorithms, data preprocessing, and model evaluation in the context of loan eligibility prediction.
Explain concepts clearly, provide micro python code snippets if asked, and relate answers to the Loan Prediction workflow (Gender, Married, ApplicantIncome, LoanAmount, Credit_History, Decision Trees, Random Forests, KNN, and XGBoost).
Keep responses clear, helpful, and proportional. Use bullet points for readability.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [...(chatHistory || []), message],
      config: {
        systemInstruction,
      }
    });

    res.json({ reply: response.text });
  } catch (error: any) {
    console.error("Gemini chat error:", error);
    res.status(500).json({ error: error.message || "Gemini chat error." });
  }
});


// Start server after setting up Vite or Static File Serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} with full-stack capability.`);
  });
}

startServer();
