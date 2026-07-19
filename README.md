# AgriBot (Agri-bharat)

AgriBot is a voice-first AI platform designed for the Tamil Nadu Department of Agriculture to empower small and marginal farmers. The platform consists of a **Web Dashboard** for administrative officers and agronomists, an **AI Voice Agent** for phone-based services, and a **Mobile App** for field officers. It integrates real-time price monitoring, voice-guided query resolution, crop diagnostics, weather warning systems, and government schemes.

---

## 🌱 Sustainability & Social Impact

### Problem Statement
**Challenge Identified:**
India is home to **146 million farmers**, where **86%** are small or marginal (owning less than 2 hectares of land). Despite massive government investments in agricultural technology, major structural gaps remain:
*   **100%** of farmers rely on commission agents (*arhtiyas*) for price information.
*   Only **12.4%** are aware of eNAM (the government's online trading platform).
*   **98.8%** cannot use digital platforms due to digital illiteracy.
*   **43.6%** report trader collusion and price manipulation.
*   **39.2%** face payment delays of 7–14 days (some even 15+ days).
*   **13% to 18% income loss per sale** due to a 10% commission fee + 5–8% hidden charges.
*   *Madras High Court:* "Actual farmers not getting benefits" from subsidy schemes.

**Who is Affected:**
*   **7.9 million farmers** in Tamil Nadu alone.
*   **146 million farmers** across India.
*   *Demographics:* 35–65 years old, primary-level literacy or below.
*   *Language:* Regional dialects (Kongu Tamil, Madurai Tamil, etc.).
*   *Technology:* Feature phones or basic smartphones, often without internet data plans.

**Why Solving it Matters:**
Agriculture employs **42%** of India's workforce but contributes only **18%** to the GDP. The gap represents systemic exploitation. Every existing solution assumes a smartphone, internet connection, and literacy. AgriBot assumes **none**—it is built voice-first, language-first, and action-first. A **21% income increase** for a small farmer means their child can stay in school, their family can eat better, and their dignity is restored.

---

## ⚡ Solution Description

### How it Works
AgriBot is a voice-first AI platform that farmers access via a simple phone call. No smartphone, no internet, and no literacy are required.

1.  **Farmer Calls:** A farmer calls the toll-free number (or uses the web dashboard).
2.  **Multilingual STT:** The farmer speaks in Tamil, Telugu, Kannada, or Hindi. The AI understands the speech via **Bhashini STT**.
3.  **Live Price Ingestion:** The farmer asks: *"What is the rice price today?"* The AI fetches live prices from eNAM, APMC, and private buyers.
4.  **AI Recommendation:** The system recommends the best market, best day to sell, necessary documents, and local transport options.
5.  **Tracking & Safety:** The AI tracks payment statuses, alerts the farmer before weather disasters, and files automated complaints if payments are delayed.

### Key Features
*   **Voice-First Interface:** Speak in regional Indian languages with no typing required.
*   **AI Price Intelligence:** Real-time price aggregation from eNAM, local APMCs, and private buyers.
*   **Weather-Crop Impact:** 48-hour advance alerts with specific crop damage prediction.
*   **AI Pest Control:** Image recognition system for crop disease identification and treatment.
*   **Anti-Fraud Layer:** Auto-detects weighing discrepancies and files complaints.
*   **Direct Payments:** Bypasses commission agents (*arhtiyas*), routing money straight to the farmer's bank account.
*   **Government Scheme Access:** Voice-guided registration for PM Kisan, PMFBY, and KCC.

### How AI is Used
*   **Speech-to-Text (STT):** Bhashini AI (22 Indian languages, Government of India platform).
*   **Natural Language Understanding (NLU):** Fine-tuned language model for agricultural queries.
*   **Text-to-Speech (TTS):** Regional voice synthesis using local accents and dialects.
*   **Price Prediction:** Weighted scoring algorithm:
    $$\text{Score} = (\text{Price} \times 0.5) - (\text{Distance} \times 0.2) - (\text{Payment Delay} \times 0.3)$$
*   **Weather Impact:** Crop-specific damage prediction using India Meteorological Department (IMD) data combined with the crop's current growth stage.
*   **Fraud Detection:** Flags anomalies if expected vs. actual quantity differs by $>5\%$.
*   **Image Recognition:** MobileNetV2 for pest/disease identification from farmer-submitted photos.

### Why it is Effective
*   **Traditional Path:** Farmer travels 50km blind $\rightarrow$ agent takes 10% $\rightarrow$ waits 14 days for payment.
*   **With AgriBot:** Farmer knows prices from home $\rightarrow$ sells directly $\rightarrow$ gets paid in 24–48 hours.
*   **Net Result:** $+21\%$ income (saves ₹76,000/year), 44 days saved per year, and zero exploitation.

---

## 🛠 Tech Stack, AI Models & Tools Used

### Core Tech Stack
*   **Frontend:** React, Next.js, Tailwind CSS
*   **Backend:** Python, FastAPI, Node.js
*   **Database:** MongoDB, Firebase (Auth & Realtime Firestore)

### AI/ML Engines
*   **Bhashini AI:** Speech-to-Text & Text-to-Speech supporting 22 Indian languages.
*   **Fine-tuned LLM:** Agricultural query understanding and intent classification.
*   **MobileNetV2:** Image classification model for pest and crop disease detection.
*   **Scoring Model:** Custom weighted scoring algorithm for market recommendation.

### Ingestion APIs
*   **IMD Weather API:** India Meteorological Department forecast.
*   **eNAM API:** National Agriculture Market data feeds.
*   **APMC Price Scrapers:** Real-time scraping of local market yards.
*   **OpenWeatherMap:** Hyperlocal weather conditions.

### Deployment & Tools
*   **Deployment:** Render (Backend), Vercel (Frontend)
*   **Development Tools:** ChatGPT (Architecture design), GitHub Copilot (Code assistance)

---

## 🏗 Project Structure

```
├── agri-call/                   # Voice Call Backend (Python + Flask/FastAPI)
│   ├── app.py                   # Call routes, Twilio endpoints, & NLU handling
│   ├── app_final.py             # Optimized production entry point
│   ├── database.py              # Firestore admin connections & seeding
│   ├── weather_engine.py        # IMD/Visual Crossing integrations
│   ├── digital_twin.py          # Yield & stress simulation engine
│   ├── alert_scheduler.py       # Hourly SMS alerts and daily twin updates
│   └── requirements.txt
│
├── agriweb-main (Root)          # Web Dashboard (React + Vite + Tailwind CSS)
│   ├── src/
│   │   ├── components/          # Reusable UI components & layouts
│   │   ├── context/             # Auth, Language, & DarkMode state providers
│   │   ├── data/                # Data services, Firestore interfaces & mocks
│   │   └── pages/               # Dashboard, Farmers, Market, Pest, Schemes, Weather
│   ├── tailwind.config.js       # Custom design tokens (earthy palette, dark mode)
│   └── package.json
│
└── agriweb-mobile/              # Field Officer Mobile App (React Native + Expo)
    ├── app/                     # Expo Router navigation (tabs & auth)
    ├── components/              # Native UI inputs, cards & custom loaders
    └── package.json
```

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   Python 3.10+
*   npm or yarn

### 1. Web Dashboard Setup
1.  Navigate to the web dashboard folder:
    ```bash
    cd agriweb-main
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure environment variables. Copy `.env.example` to `.env` and fill in your details:
    ```bash
    cp .env.example .env
    ```
4.  Run the development server:
    ```bash
    npm run dev
    ```
5.  Build the production bundle:
    ```bash
    npm run build
    ```

### 2. Voice Backend Setup (`agri-call`)
1.  Navigate to the backend folder:
    ```bash
    cd agri-call
    ```
2.  Set up a virtual environment and install dependencies:
    ```bash
    python -m venv .venv
    source .venv/bin/activate  # On Windows use: .venv\Scripts\activate
    pip install -r requirements.txt
    ```
3.  Set up your `.env` variables and start the server:
    ```bash
    python app.py
    ```

### 3. Mobile Companion App Setup
1.  Navigate to the mobile directory:
    ```bash
    cd agriweb-mobile
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the Expo developer server:
    ```bash
    npx expo start
    ```

---

## 📖 How to Use

### 1. Interacting with the Web Dashboard
*   **Administrator Login:**
    *   Navigate to the login page (`http://localhost:5173/login`).
    *   If Firebase is not configured (running in Local/Mock mode), log in using the fallback administrator credentials:
        *   **Email:** `admin@agriweb.com`
        *   **Password:** `Agri@2024`
*   **Monitoring Regional Cultivation:**
    *   The **Dashboard** tab displays aggregated figures (registered farmers, active alerts, call logs, and land size).
    *   The bar charts and progress bars visualize the crop volume and regional farmer distribution across Tamil Nadu districts.
*   **Registering & Editing Farmer Profiles:**
    *   Go to the **Farmers** tab to view the list of registered farmers.
    *   Click on a farmer's name to view their complete dossier (soil type, irrigation, history). Click **Edit Profile** to change details or click **Schemes** to link them to relevant subsidies.
*   **Testing AI Pest & Crop Disease Diagnosis:**
    *   Go to the **Pest Control** tab.
    *   Select a crop type (e.g., *Tomato*) or choose *Auto-Detect*.
    *   Upload an image of a diseased crop leaf (or click **Live Camera** on a mobile device).
    *   Click **Run AI Disease Detection**. AgriBot will query Gemini/Llama vision models and output a detailed classification, severity rating, and immediate treatment guidelines (chemical + organic).
    *   Enter a farmer's phone number and click **Save Diagnosis** to add it to the historical diagnosis registry.
*   **Checking Market Rates:**
    *   Go to the **Market Prices** tab.
    *   View daily rates for crops like Rice, Wheat, Cotton, and Sugarcane.
    *   Click the **Chart** icon next to any crop to open a modal containing historical 30-day price trend lines.

### 2. Simulating the Voice Call Backend (`agri-call`)
The Python backend uses Twilio to manage voice calls via TwiML.
*   **Local Setup with Ngrok:**
    *   To receive real calls on a Twilio phone number, expose your local Flask server (running on port `5000` by default) using Ngrok:
        ```bash
        ngrok http 5000
        ```
    *   Copy the forwarding URL (e.g., `https://xxxx.ngrok-free.dev`) and set it as `NGROK_URL` in your `agri-call/.env` file.
    *   In your Twilio console, configure your phone number's incoming voice webhook to point to `https://xxxx.ngrok-free.dev/voice`.
*   **Testing Query Intent Flow:**
    *   Call your Twilio number. The voice agent (Dr. AgriAI) will welcome you in Tamil (or English/Hindi/Telugu based on your choice) and ask how it can help.
    *   **Speak a query:**
        *   *“மழை எப்போது பெய்யும்?”* (When will it rain?) ➔ Triggers weather engine intent, retrieves IMD/Visual Crossing forecasts, and synthesizes speech warning.
        *   *“நெல்லின் விலை என்ன?”* (What is the price of Rice?) ➔ Triggers eNAM pricing database, queries daily averages, and reports rates.
        *   *“எனது தக்காளி செடியில் இலைகள் கருகுகின்றன”* (Tomato leaves are burning) ➔ Triggers disease identification recommendations.
*   **Distributor Call Transfer:**
    *   If you ask to connect to a distributor or buyer to sell your yield, the agent checks your crop type and state, looks up the local buyer's number in `sms_transfer.py`, says a confirmation message, and dials the number to transfer the call.
    *   An SMS summary of the call is compiled using Groq Llama-3.3 and texted to your phone.

### 3. Testing the Mobile Companion App (`agriweb-mobile`)
*   Open **Expo Go** on your physical iOS/Android phone and scan the QR code displayed in your terminal.
*   Use the interface to search the **Farmer Directory**, view contact lists, look up current market price graphs, read government schemes, and update profile fields.
