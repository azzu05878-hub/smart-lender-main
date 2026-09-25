import { useState, useRef, useEffect } from "react";
import { Send, Brain, GraduationCap, ArrowRight, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "model";
  text: string;
}

const tutorPrompts = [
  "Explain Gini Impurity simply.",
  "Difference between Random Forest and XGBoost?",
  "Show me Python code to do this in Scikit-Learn.",
  "Why is scaling vital for KNN algorithms?"
];

export default function MLTutorChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      text: "Hello! I am your **Smart Lender ML Tutor**. Ask me anything about machine learning classifiers, Gini split calculations, data preprocessing, Python Scikit-Learn syntax, or how we build interactive loan risk prediction applications!"
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isSending) return;

    const userMessage: Message = { role: "user", text: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setIsSending(true);

    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          chatHistory: messages.map(m => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.text }]
          }))
        })
      });

      const data = await response.json();
      if (data.reply) {
        setMessages(prev => [...prev, { role: "model", text: data.reply }]);
      } else {
        setMessages(prev => [...prev, { role: "model", text: "I ran into a small error fetching an answer. Please verify your GEMINI_API_KEY is configured in Settings > Secrets." }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: "model", text: "Network error occurred connecting to the Gemini tutoring module." }]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl h-[520px] flex flex-col" id="ml-tutor-chat-root">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-white text-xs">ML Tutor Chat Assistant</h4>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Gemini 3.5 Flash Active
            </span>
          </div>
        </div>

        <div className="text-[10px] text-slate-500 font-mono hidden md:block">
          Interactive Study Sandbox
        </div>
      </div>

      {/* Message History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 select-text">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-xl p-3.5 text-xs leading-relaxed space-y-2 ${
                m.role === "user"
                  ? "bg-indigo-600 text-white rounded-br-none"
                  : "bg-slate-900 text-slate-300 border border-slate-800 rounded-bl-none"
              }`}
            >
              <div className="prose prose-invert select-text space-y-2 font-sans">
                {m.text.split("\n").map((line, lIdx) => {
                  if (line.startsWith("```")) {
                    return null; // Handle basic code formatting inside text block
                  }
                  if (line.startsWith("### ")) {
                    return <h5 key={lIdx} className="font-bold text-white mt-2 pt-1 border-b border-slate-800 pb-1">{line.replace("### ", "")}</h5>;
                  }
                  if (line.startsWith("- ") || line.startsWith("* ")) {
                    return <li key={lIdx} className="ml-3 list-disc">{line.substring(2)}</li>;
                  }
                  // Identify potential code lines and color code them roughly
                  const isPythonCode = line.includes("import ") || line.includes("def ") || line.includes("fit(") || line.includes("predict(");
                  if (isPythonCode) {
                    return <code key={lIdx} className="block bg-slate-950 p-1.5 rounded font-mono text-[11px] text-teal-300 border border-slate-800/80 my-1 overflow-x-auto select-all">{line}</code>;
                  }
                  return <p key={lIdx}>{line}</p>;
                })}
              </div>
            </div>
          </div>
        ))}
        {isSending && (
          <div className="flex justify-start">
            <div className="bg-slate-900 border border-slate-800 text-slate-400 rounded-xl p-3.5 text-xs flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              <span>Tutor is formulating explanation...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested Prompt Chips */}
      <div className="px-4 py-2 border-t border-slate-800/50 bg-slate-900/10 flex flex-wrap gap-2 shrink-0">
        {tutorPrompts.map(p => (
          <button
            key={p}
            onClick={() => handleSend(p)}
            disabled={isSending}
            className="text-[10px] text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 px-2.5 py-1 rounded-full transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSend(inputText);
        }}
        className="p-3 border-t border-slate-800 bg-slate-950 flex gap-2 shrink-0"
      >
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Ask about pandas, standard scale, decision tree hyperparameters..."
          className="flex-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 px-3 py-2.5 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-500"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-4 py-2 flex items-center justify-center disabled:opacity-40 disabled:hover:bg-indigo-600 active:scale-95 transition-all focus:outline-none"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>

    </div>
  );
}
