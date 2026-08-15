# Video File Batch Renamer Tool

[ [日本語](./README.md) | English ]

[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4ba516.svg)](./CODE_OF_CONDUCT.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./package.json)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/shoumajp/video-renamer-tool/badge)](https://securityscorecards.dev/viewer/?uri=github.com/shoumajp/video-renamer-tool)

A high-performance web application that automatically extracts product IDs from video filenames, fetches metadata (title, performers, release date, maker, genre, cover images) using Playwright web scraping and Google Gemini AI fallback, and performs safe batch renaming with real-time dry-run simulations.

---

## 📌 Key Features

- **Automated ID Extraction**: Parses video filenames using regex patterns to extract product IDs (e.g., `ABC-123`, `FC2-PPV-102934`).
- **Playwright Scraping**: High-precision automated metadata scraping using headless Chromium.
- **Gemini AI Fallback**: Resilient metadata completion using Google Gemini API when scraping is restricted or site structures change.
- **Parallel Processing & Caching**: Fast and efficient renaming workflows supported by in-memory caching and optimized asynchronous queues.
- **Dry-Run Simulation**: Compare original vs. new filenames in real time with conflict detection before making any actual filesystem changes.
- **Resilience Architecture**: Built-in retries, circuit breakers, rate limiting, and fault tolerance verification.

---

## 📸 Screenshots & Preview

| Quick Tour (15s Overview) |
| :---: |
| ![Demo](./docs/images/demo.gif) |

### Views Overview
- **Main Dashboard**: Drag-and-drop file ingestion, batch scraping execution, and status indicators.
- **Simulation Preview**: Before-and-after filename comparison, collision alerts, and dry-run execution.
- **Settings Panel**: Custom regex rules, naming format templates, and Gemini API key management.

---

## ⚙️ System Requirements

- **Node.js**: v18.17.0 or higher (v20 LTS recommended)
- **Package Manager**: `npm` (v9+) or `pnpm`
- **Supported OS**: Windows 10/11, macOS (12+), Linux (Ubuntu 20.04+)
- **Browsers**: Google Chrome, Microsoft Edge, Safari, Firefox

---

## 🚀 Quick Start

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/shoumajp/video-renamer-tool.git
cd video-renamer-tool
npm install
```

### 2. Environment Setup (Optional for AI Fallback)
Copy the example environment file and add your Gemini API key if AI fallback is desired:
```bash
cp .env.example .env
```
Edit `.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
```

### 3. Start Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:3000`.

---

## 🛡️ Safe Execution (Dry-Run Mode)

Safety is a core priority of this tool:
1. **Dry-Run Default**: File renaming runs in simulation mode by default.
2. **Conflict Checking**: Filename collisions, invalid characters, and duplicate targets are flagged automatically.
3. **Execution Confirm**: Physical renaming only occurs after explicit user confirmation in the UI.

---

## ❓ FAQ & Troubleshooting

- **User Guide**: See [src/USER_GUIDE.md](./src/USER_GUIDE.md)
- **Release Checklist**: See [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md)
- **Frequently Asked Questions**: See [docs/FAQ.md](./docs/FAQ.md)
- **Troubleshooting Guide**: See [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)
- **Q&A & Community Support**: [GitHub Discussions](../../discussions)

---

## 🤝 Contributing

Contributions are warmly welcomed! Please read our [CONTRIBUTING.md](./CONTRIBUTING.md) and adhere to our [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) before submitting pull requests.

---

## 🔒 Security

If you discover a security vulnerability, please refer to our [SECURITY.md](./SECURITY.md) for responsible disclosure procedures.

---

## 📄 License

Distributed under the [MIT License](./package.json).
