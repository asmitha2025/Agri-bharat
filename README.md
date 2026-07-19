# AgriBot (Agri-bharat)

AgriBot is a unified agricultural intelligence platform designed for the Tamil Nadu Department of Agriculture. The platform consists of a **Web Dashboard** for administrative officers/agronomists and a **Mobile App** for field officers and farmers. It integrates AI-powered crop disease detection, live support logs, district weather monitoring, market price trends, and government schemes.

---

## 🏗 Project Structure

```
├── agriweb-main (Root)          # Web Dashboard (React + Vite + Tailwind CSS)
│   ├── src/
│   │   ├── components/          # Reusable UI components & layouts
│   │   ├── context/             # Auth, Language, & DarkMode state providers
│   │   ├── data/                # Data services, Firestore interfaces & mocks
│   │   ├── pages/               # Dashboard, Farmers, Market, Pest, Schemes, Weather
│   │   └── firebase.js          # Firebase SDK client initialization
│   ├── tailwind.config.js       # Custom design tokens (earthy palette, dark mode)
│   └── package.json
│
└── agriweb-mobile/              # Field Officer Mobile App (React Native + Expo)
    ├── app/                     # Expo Router navigation (tabs & auth)
    ├── components/              # Native UI inputs, cards & custom loaders
    └── package.json
```

---

## ⚡ Core Features

### 1. Web Dashboard (`agriweb-main`)
*   **Agricultural Intelligence Overview:** Real-time statistics tracking total registered farmers, active weather warnings, crop cultivation volumes, and AI call center queues.
*   **Pest & Disease Diagnostic Lab (Dr. AgriAI):** AI vision model integration (Gemini / Llama-4 Scout) to diagnose crop infections from photos. Provides severity risk level, confidence scores, chemical/organic treatment guides, and spread control recommendations.
*   **Localizations & Dialects:** Complete localization support for **English (🇬🇧)**, **Tamil (தமிழ்)**, **Telugu (తెలుగు)**, and **Hindi (हिंदी)**.
*   **Farmer Registry & Profile Management:** Profile dashboards documenting soil type, land size, active crops, previous consultation logs, and history.
*   **Market Price Trends:** Visual price comparisons against 30-day moving averages and historical line charts.
*   **Central Schemes Registry:** Search and filter engine for government subsidies, credit support, and insurance schemes.

### 2. Field Companion App (`agriweb-mobile`)
*   **Expo Router Native Navigation:** Fast tab-based navigation designed for outdoor readability.
*   **Field Camera Integration:** Seamlessly snap and upload photos of damaged crops to run diagnoses on the go.
*   **Offline-First & Local Storage:** Caches crucial farmer contacts and local advisories for areas with low network coverage.
*   **Firebase Integration:** Authenticates users and syncs data to firestore.

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   npm or yarn

### 1. Web Dashboard Setup
1.  Clone the repository and navigate to the project directory:
    ```bash
    git clone https://github.com/asmitha2025/Agri-bharat.git
    cd Agri-bharat
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure environment variables. Copy `.env.example` to `.env` and fill in your details:
    ```bash
    cp .env.example .env
    ```
    Configure your Firebase keys and Dr. AgriAI vision keys (Optional: mock database will be used if keys are not provided):
    ```env
    VITE_FIREBASE_API_KEY=your_key
    VITE_FIREBASE_PROJECT_ID=your_id
    VITE_GEMINI_API_KEY=your_gemini_key
    VITE_GROQ_API_KEY=your_groq_key
    ```
4.  Run the development server:
    ```bash
    npm run dev
    ```
5.  Build the production distribution:
    ```bash
    npm run build
    ```

### 2. Mobile Companion App Setup
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
4.  Press `a` to run on an Android emulator, `i` for iOS simulator, or scan the QR code using the Expo Go app on your physical device.

---

## 🎨 Technology Stack & Custom Styles

*   **Web Frontend:** React 19, Vite, Tailwind CSS, Lucide React, Recharts
*   **Mobile Frontend:** React Native, Expo 55, Expo Router, Expo Linear Gradient
*   **Backend Services:** Firebase Firestore, Firebase Authentication
*   **AI Diagnostics:** Gemini 1.5 Flash API / Groq API (Meta Llama-4 Scout)
*   **Aesthetics:** High-fidelity dark mode support, custom animations (fade-in, slide-in), and custom earth-tone color palettes (`earth`, `primary`, `dark`).

---

## 📝 License

This project is prepared for Tamil Nadu Agricultural Department evaluations. All rights reserved.
