# ManipuLens 👁️
### Rhetorical Forensics Engine

> *Everything is trying to manipulate you. Now you can see it.*

ManipuLens is an AI-powered rhetorical forensics tool that decodes psychological manipulation in any piece of text. Paste a news article, political speech, advertisement, or WhatsApp forward — ManipuLens identifies the exact manipulation techniques being used, highlights them, and gives a manipulation score out of 100.

**Not fact-checking. Deeper — it exposes the psychology behind why content was designed to influence you.**

---

## 🔍 What It Does

- Detects psychological manipulation techniques in any text or URL
- Highlights each technique with color-coded annotations
- Gives a **Manipulation Score out of 100**
- Shows severity level — HIGH / MEDIUM / LOW
- Provides exact quotes from the text for each technique
- **Inoculation Mode** — rewrites manipulative text neutrally
- **Shareable Reports** — share analysis with anyone via link
- **Recent Analyses** — history of your last analyses
- **Private Dashboard** — your personal manipulation diary

---

## 🧠 Manipulation Techniques Detected

| Technique | Description |
|-----------|-------------|
| Fear Mongering | Uses fear and anxiety to pressure decisions |
| False Urgency | Creates artificial deadlines and scarcity |
| Appeal to Authority | References vague or unnamed experts |
| Bandwagon Effect | Pressures by claiming everyone else agrees |
| Gaslighting | Makes you doubt your own judgment |
| Cherry Picking | Selects only data that supports one view |
| Strawman | Misrepresents opposing arguments |
| False Dichotomy | Presents only two options when more exist |

---

## 🚀 Live Demo

🔗 **[manipulens.vercel.app](https://manipulens.vercel.app)**

---

## 🛠️ Tech Stack

- **Frontend** — React + TanStack Start + Tailwind CSS
- **AI Engine** — Google Gemini API (gemini-2.0-flash)
- **Build Tool** — Vite
- **Deployment** — Vercel
- **Built with** — Lovable.dev

---

## ⚡ Getting Started

### Prerequisites
- Node.js 18+
- Google Gemini API key (free at [aistudio.google.com](https://aistudio.google.com))

### Installation

```bash
# Clone the repository
git clone https://github.com/notcode5/manipulens.git

# Navigate to project
cd manipulens

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Add your Gemini API key to .env
GEMINI_API_KEY=your_key_here

# Start development server
npm run dev
```

---

## 🔐 Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Your Google Gemini API key |

Get your free API key at [aistudio.google.com](https://aistudio.google.com)

---

## 📱 Features

### Core Analysis
Paste any text or enter a URL → instant AI analysis with highlighted techniques and score.

### Inoculation Mode
After analysis, click **Inoculate** → AI rewrites the text removing all manipulation while keeping core facts. Compare original vs clean version side by side.

### Private Dashboard
Access at `/dashboard` → your personal manipulation diary showing total analyses, average score, most detected techniques, and full history.

### Easter Egg 🦊
Press **Ctrl + Shift + F** anywhere in the app.

---

## 🎯 Use Cases

- Analyzing political speeches and news articles
- Detecting manipulation in advertisements
- Fact-checking viral WhatsApp forwards
- Media literacy education
- Personal critical thinking tool

---

## 📊 How Scoring Works

| Score | Level |
|-------|-------|
| 0–20 | Minimal — straightforward content |
| 21–40 | Mildly Persuasive |
| 41–60 | Moderately Manipulative |
| 61–80 | Highly Manipulative |
| 81–100 | Dangerous — extreme pressure tactics |

---

## 🏗️ Project Structure

```
manipulens/
├── src/
│   ├── lib/
│   │   └── analyze.server.ts    # Gemini API integration
│   ├── routes/
│   │   ├── index.tsx            # Main analysis page
│   │   └── dashboard.tsx        # Private dashboard
│   └── components/
│       ├── AnalysisResult.tsx   # Results display
│       └── TechniqueCard.tsx    # Individual technique cards
├── public/
├── .env.example
└── README.md
```

---

## 🔮 Roadmap

- [ ] Browser extension for real-time analysis
- [ ] API endpoint for developers
- [ ] Batch analysis for multiple URLs
- [ ] Language support beyond English
- [ ] Historical trend analysis

---

## 👤 Author

Built by **🦊**

*Part of the CognitiveLens project — AI tools for understanding how information influences human thinking.*

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

*ManipuLens — because understanding manipulation is the first step to resisting it.*
