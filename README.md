# Tenable SC: CVE Host Lookup Tool

A simple web-based tool to look up which hosts in your network are affected by a specific CVE, using the **Tenable Security Center** API.

![Node.js](https://img.shields.io/badge/Node.js-18%2B-green) ![Express](https://img.shields.io/badge/Express-4.x-lightgrey) ![License](https://img.shields.io/badge/license-MIT-blue)

---

## 🔍 What It Does

Enter one or more CVE IDs (e.g. `CVE-2025-54918`) and the tool will query your Tenable Security Center to return a list of all **affected hosts** — including their IP address, DNS name, NetBIOS name, and Repository ID.

Results can be **copied to clipboard** or **exported to CSV**.

---

## 📋 Features

- 🔎 Single or multiple CVE lookup (comma-separated)
- 📊 Results displayed in a clean, sortable table
- 📋 Copy table data to clipboard
- ⬇️ Export results to CSV
- 🔒 Secure API key authentication via HTTP headers
- 🖥️ Responsive UI (mobile-friendly)

---

## 🧰 Tech Stack

| Layer    | Technology         |
|----------|--------------------|
| Backend  | Node.js + Express  |
| Frontend | Vanilla JS + HTML/CSS |
| HTTP Client | Axios          |
| Config   | dotenv             |

---

## ⚙️ Requirements

- Node.js v18 or higher
- Access to a **Tenable Security Center** instance
- Tenable SC **API Access Key** and **Secret Key**

---

## 🚀 Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/teenvul.git
cd teenvul
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the root directory:

```env
# Your Tenable Security Center hostname or IP (include https://)
TENABLE_HOST=https://your-tenable-sc-host

# Tenable SC API port (default: 443)
TENABLE_PORT=443

# Your Tenable SC API credentials
ACCESS_KEY=your_access_key_here
SECRET_KEY=your_secret_key_here

# Port for this web app (default: 3000)
PORT=3000
```

> ⚠️ **Never commit your `.env` file to Git.** It contains sensitive credentials.

### 4. Run the application

```bash
npm start
```

The app will be available at: `http://localhost:3000`

---

## 📖 Usage

1. Open the app in your browser at `http://localhost:3000`
2. Enter a CVE ID in the input field
   - **Single CVE:** `CVE-2025-54918`
   - **Multiple CVEs:** `CVE-2025-12429,CVE-2025-12432,CVE-2025-12433`
3. Click **"Query Host Terdampak"** or press **Enter**
4. View results in the table
5. Use **📋 Copy Data** or **⬇️ Export CSV** to save the results

---

## 📁 Project Structure

```
teenvul/
├── server.js          # Express backend — handles API proxy to Tenable SC
├── package.json       # Project metadata and dependencies
├── .env               # Environment variables (NOT committed to Git)
├── .gitignore         # Files excluded from Git
└── public/
    └── index.html     # Frontend UI (single-page app)
```

---

## 🔌 API Endpoint

### `POST /api/query`

Queries Tenable SC for hosts affected by the given CVE(s).

**Request body:**
```json
{
  "cveID": "CVE-2025-54918"
}
```

**Success response:**
```json
{
  "success": true,
  "cveID": "CVE-2025-54918",
  "hosts": [
    {
      "ip": "192.168.1.10",
      "dnsName": "server01.local",
      "netbiosName": "SERVER01",
      "repositoryID": "1"
    }
  ]
}
```

**Error response:**
```json
{
  "success": false,
  "error_msg": "Connection or API Error: ...",
  "error_code": -1
}
```

---

## 🔐 Security Notes

- This tool uses `NODE_TLS_REJECT_UNAUTHORIZED=0` at startup to allow self-signed certificates — common in internal/lab Tenable SC deployments. **Do not use this in production environments exposed to the public internet.**
- API credentials are stored in `.env` and sent via `x-apikey` header — never exposed to the frontend.

---

## 🐛 Troubleshooting

| Problem | Solution |
|---|---|
| `Server configuration missing` error | Check that your `.env` file exists and has all required variables |
| `Connection or API Error` | Verify `TENABLE_HOST` is reachable from this server, including correct port |
| Empty results | The CVE may not have affected hosts in your environment, or the CVE ID format is wrong |
| Self-signed cert errors | The app already disables TLS verification by default — check your Tenable SC host URL |

---

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request on GitHub.

**Repository:** [github.com/tint-us/tenvul](https://github.com/tint-us/tenvul)

---

## 📬 Contact

**tint-us** · [tintus.ardi@gmail.com](mailto:tintus.ardi@gmail.com) · [github.com/tint-us](https://github.com/tint-us)

---

## 📄 License

MIT License — feel free to use, modify, and distribute.
