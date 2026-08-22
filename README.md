# Amor o Control – A/C Scanner

**Identifying digital control signals with local AI and zero external servers.**

Amor o Control, also called **A/C Scanner**, is a hackathon MVP that helps people identify signs of digital control, psychological violence, coercive jealousy, threats, outing, isolation, and patrimonial violence in relationship chats.

The core idea is simple: **sensitive chats should not be uploaded to cloud AI tools in order to receive help**. A/C Scanner uses **QVAC as the local inference layer**, so the analysis can run on the user’s device through a local OpenAI-compatible server.

> From “I think something is wrong” to “I can name the pattern and take a safer next step” — without exposing private conversations.

---

## Demo scope

This repository contains a reduced functional demo for the QVAC track.

The MVP includes:

- Create separate analyses by chat, person, or relationship.
- Select relationship context:
  - Heterosexual
  - Queer / LGBTIQ+
  - Prefer not to say
- Paste a chat or describe a situation.
- Analyze the text locally with QVAC.
- Classify detected signals into clear risk categories.
- Show a **Risk Thermometer**: green, yellow, orange, or red.
- Activate **Código Violeta** when risk is high.
- Save events in a local **Registro Seguro**.
- Use a fallback rule-based analyzer if QVAC is not available during the demo.

---

## Why local AI matters

Relationship chats may contain highly sensitive information: sexual content, threats, family details, identity, orientation, private images, location data, workplace information, or evidence of abuse.

For that reason, this demo is designed around one principle:

> **The chat should stay on the device.**

A/C Scanner does not require cloud AI APIs for analysis. The app calls a local QVAC server at `localhost`, and if the local model is unavailable, it falls back to local rules so the demo flow remains stable.

---

## Risk categories

The current MVP uses eight categories:

| Category | Description |
|---|---|
| Digital control | Location control, password demands, phone checking, pressure to send photos, social media surveillance |
| Coercive jealousy | Jealousy used to control, restrict, accuse, or demand proof |
| Threats | Direct or indirect threats, including physical, sexual, digital, reputational, or family-related harm |
| Psychological violence by abandonment, humiliation, or emotional punishment | Ghosting, silence treatment, humiliation, emotional withdrawal, contempt |
| Gaslighting | Making the user doubt their memory, perception, emotions, or sanity |
| Outing | Revealing or threatening to reveal someone’s sexual orientation, gender identity, queer relationship, or intimate information without consent |
| Isolation | Cutting off friends, family, therapy, community, or support networks |
| Patrimonial violence | Control or damage involving money, property, documents, work, housing, transport, studies, or digital tools |

In queer/LGBTIQ+ contexts, the app specifically looks for signals such as outing, threats to reveal orientation or identity, sexuality questioning, identity invalidation, and control through fear of exposure.

---

## Tech stack

- **Next.js**
- **React**
- **TypeScript**
- **QVAC CLI / SDK**
- **Local OpenAI-compatible QVAC server**
- **LocalStorage** for demo-only Registro Seguro
- No external UI library
- No cloud AI API required

---

## Project structure

```txt
ac-scanner-qvac-demo/
├── app/
│   ├── api/
│   │   └── analyze/
│   │       └── route.ts        # Local analysis endpoint: QVAC + fallback rules
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # App layout
│   └── page.tsx                # Main interface
├── .env.example                # Optional local environment variables
├── next.config.mjs
├── package.json
├── qvac.config.json            # Local QVAC model configuration
├── tsconfig.json
└── README.md
```

---

## Requirements

Recommended:

- Node.js 22+
- npm 10+
- QVAC CLI
- QVAC SDK
- Enough local RAM for the selected model

This demo uses a smaller local model alias in `qvac.config.json`:

```json
{
  "serve": {
    "models": {
      "ac-scanner-local": {
        "model": "QWEN3_600M_INST_Q4",
        "default": true,
        "config": {
          "ctx_size": 8192
        }
      }
    }
  }
}
```

You may replace the model with another QVAC-supported local model depending on available hardware.

---

## Installation

Clone the repository and install dependencies:

```bash
git clone <your-repository-url>
cd ac-scanner-qvac-demo
npm install
```

---

## Environment variables

Optional: copy `.env.example` to `.env.local`.

```bash
cp .env.example .env.local
```

Default values:

```txt
QVAC_BASE_URL=http://127.0.0.1:11434/v1
QVAC_MODEL=ac-scanner-local
QVAC_API_KEY=
```

The demo can run without editing these values if QVAC is served locally using the included config.

---

## Run QVAC locally

In the first terminal, start the QVAC OpenAI-compatible local server:

```bash
npm run qvac:serve:config
```

This runs:

```bash
qvac serve openai -c qvac.config.json
```

Expected local endpoint:

```txt
http://127.0.0.1:11434/v1
```

---

## Run the app

In a second terminal:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

---

## Demo flow

Use this flow for the hackathon pitch:

1. Open the app.
2. Create a new analysis, for example: `Instagram chat`.
3. Select the relationship context: `Queer / LGBTIQ+`.
4. Paste the queer outing demo case.
5. Click **Analyze with local QVAC**.
6. Show the Risk Thermometer.
7. Show detected categories, especially `Outing` and `Threats`.
8. Show that **Código Violeta** is activated.
9. Explain that the chat was processed locally through QVAC and was not uploaded to an external AI API.

---

## Demo test cases

### 1. Queer / outing case

```txt
If you do not come back to me, I will tell your family that you are bisexual. Nobody at your work knows about you, right? It is better if you do not make me angry.
```

Expected result:

- Risk: red
- Categories: outing, threats
- Código Violeta: activated

---

### 2. Heterosexual / digital control case

```txt
Send me a screenshot of who you are talking to. If you have nothing to hide, give me your password. I do not like you going out with those friends; they put ideas in your head.
```

Expected result:

- Risk: orange or red, depending on model output
- Categories: digital control, isolation, coercive jealousy
- Código Violeta: recommended or activated

---

### 3. Patrimonial violence case

```txt
I paid for that phone, so it is mine. If you leave, you will have no house, and I will not give you back your documents.
```

Expected result:

- Risk: orange or red
- Categories: patrimonial violence, threats
- Código Violeta: recommended or activated

---

### 4. Gaslighting case

```txt
That never happened. You are too sensitive and always exaggerate everything. You need help because all of this is only in your head.
```

Expected result:

- Risk: orange
- Categories: gaslighting, psychological violence

---

## API behavior

The main analysis route is:

```txt
POST /api/analyze
```

Request example:

```json
{
  "analysisId": "analysis-001",
  "analysisName": "Instagram chat",
  "relationshipContext": "queer",
  "relationshipType": "ex-partner",
  "platform": "Instagram",
  "text": "If you do not come back to me, I will tell your family that you are bisexual."
}
```

Expected response shape:

```json
{
  "riskLevel": "red",
  "confidence": 0.88,
  "activateCodigoVioleta": true,
  "categories": [
    {
      "id": "outing",
      "label": "Outing",
      "score": 1,
      "severity": "red",
      "matchedExamples": [],
      "explanation": "Threatening to reveal sexual orientation, identity, or intimate queer information without consent."
    }
  ],
  "plainLanguageSummary": "The chat contains a threat to expose private information about the user's sexuality.",
  "recommendedNextStep": "Activate Código Violeta and seek support from a trusted person.",
  "safetyNote": "This tool is educational and does not replace psychological, legal, or emergency support.",
  "relationshipContext": "queer",
  "source": "qvac"
}
```

If QVAC is unavailable, the same route returns:

```json
{
  "source": "fallback_rules"
}
```

This is intentional, so the demo does not fail during the pitch.

---

## Código Violeta

When the risk level is orange or red, the app can activate **Código Violeta**, a safety-oriented mode that offers:

- A grounding message.
- A safe message template.
- A trusted contact field.
- A basic safety plan.
- A reminder not to confront the aggressor if risk is high.
- A reminder to save evidence only if doing so does not increase danger.

Código Violeta is not an emergency service. It is a first support flow for safer decision-making.

---

## Ethical boundaries

A/C Scanner is a **psychoeducational safety tool**.

It does **not**:

- Diagnose users or partners.
- Determine legal guilt.
- Replace psychological care.
- Replace legal advice.
- Replace emergency services.
- Guarantee safety.
- Guarantee that the output is legally valid evidence.

It does:

- Identify possible risk signals.
- Help name patterns of control.
- Encourage safer next steps.
- Protect privacy by using local inference.
- Support users in recognizing when they may need help.

If there is immediate danger, users should contact local emergency services or a trusted local support network.

---

## Hackathon pitch line

> A/C Scanner uses QVAC as a local AI safety layer to analyze sensitive relationship chats on-device, detect digital control and violence patterns, and activate Código Violeta without sending intimate conversations to the cloud.

---

## Roadmap

Future improvements could include:

- Local OCR for screenshots.
- Local voice transcription.
- Encrypted local storage.
- PIN or biometric access.
- Safer quick-exit behavior.
- Exportable personal timeline.
- Local RAG with country-specific support routes.
- Expanded queer violence taxonomy.
- Multilingual support.
- Clinical and community validation with professionals and users.

---

## Team roles

- Product Manager: scope, delivery, pitch, prioritization.
- Psychologist: risk categories, Código Violeta, ethical boundaries.
- Sociologist / Designer: UX, inclusive language, non-revictimizing design.
- AI Programmer: QVAC integration, local inference, JSON output, fallback rules.

---

## License

Hackathon prototype. Add your final license here before public release.

Suggested options:

- MIT for open-source code.
- Custom license if the safety protocol and content require controlled reuse.

---

## Disclaimer

This project is a prototype developed for educational and hackathon purposes. It should be validated with users, safety experts, legal professionals, psychologists, and community organizations before real-world deployment.
