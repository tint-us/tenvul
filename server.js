require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Configuration ---
const TENABLE_HOST = process.env.TENABLE_HOST;
const TENABLE_PORT = process.env.TENABLE_PORT || '443';
const ACCESS_KEY = process.env.ACCESS_KEY;
const SECRET_KEY = process.env.SECRET_KEY;

// --- Middleware ---
app.use(express.json({ limit: '10kb' })); // Prevent oversized request bodies
app.use(express.static(path.join(__dirname, 'public')));

// [SECURITY FIX] Simple in-memory rate limiter — max 30 requests per minute per IP
// For production, consider using the 'express-rate-limit' npm package instead.
const rateLimitMap = new Map();
const RATE_LIMIT = 30;         // max requests
const RATE_WINDOW_MS = 60000;  // per 1 minute

function rateLimiter(req, res, next) {
    const ip = req.ip;
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now - entry.start > RATE_WINDOW_MS) {
        rateLimitMap.set(ip, { count: 1, start: now });
        return next();
    }

    if (entry.count >= RATE_LIMIT) {
        return res.status(429).json({
            success: false,
            error_msg: 'Too many requests. Please wait a moment before trying again.',
            error_code: 429
        });
    }

    entry.count++;
    next();
}

// [SECURITY FIX] Validate CVE ID format before sending to Tenable SC
// Accepts: CVE-YYYY-NNNNN (single or comma-separated, no spaces)
function isValidCveInput(input) {
    if (!input || typeof input !== 'string') return false;
    if (input.length > 500) return false; // Guard against huge inputs

    const cveList = input.split(',');
    const cvePattern = /^CVE-\d{4}-\d{4,}$/i;
    return cveList.every(cve => cvePattern.test(cve.trim()));
}

// --- Middleware: check server config & rate limit ---
app.use('/api/query', rateLimiter, (req, res, next) => {
    if (!TENABLE_HOST || !ACCESS_KEY || !SECRET_KEY) {
        return res.status(500).json({
            success: false,
            error_msg: 'Server configuration is incomplete. Contact your administrator.',
            error_code: 500
        });
    }
    next();
});

// --- Main API Endpoint ---
app.post('/api/query', async (req, res) => {
    const cveID = req.body.cveID;

    // Normalize: strip spaces around commas, uppercase
    // Handles input like "CVE-2025-1234 , CVE-2025-5678"
    const normalizedCveID = typeof cveID === 'string'
        ? cveID.split(',').map(c => c.trim().toUpperCase()).filter(Boolean).join(',')
        : '';

    // [SECURITY FIX] Validate CVE format before doing anything
    if (!isValidCveInput(normalizedCveID)) {
        return res.status(400).json({
            success: false,
            error_msg: 'Invalid CVE ID format. Use CVE-YYYY-NNNNN (e.g. CVE-2025-12345). For multiple CVEs, separate with commas and no spaces.',
            error_code: 400
        });
    }

    const tenableBody = {
        type: 'vuln',
        sourceType: 'cumulative',
        query: {
            type: 'vuln',
            source: 'cumulative',
            tool: 'cveipdetail',
            filters: [
                {
                    filterName: 'cveID',
                    operator: '=',
                    value: normalizedCveID
                }
            ],
            sortField: 'ip',
            sortDir: 'asc',
            columns: [
                { name: 'ip' },
                { name: 'dnsName' },
                { name: 'netbiosName' }
            ]
        }
    };

    const url = `${TENABLE_HOST}:${TENABLE_PORT}/rest/analysis`;

    // [SECURITY NOTE] rejectUnauthorized: false is kept for self-signed cert environments.
    // If your Tenable SC has a valid/trusted cert, set TENABLE_REJECT_UNAUTHORIZED=true in .env
    // and replace the line below with: rejectUnauthorized: process.env.TENABLE_REJECT_UNAUTHORIZED !== 'false'
    const httpsAgent = new (require('https').Agent)({ rejectUnauthorized: false });

    try {
        const response = await axios.post(url, tenableBody, {
            headers: {
                'Content-Type': 'application/json',
                'x-apikey': `accesskey=${ACCESS_KEY}; secretkey=${SECRET_KEY};`
            },
            httpsAgent,
            // [PERFORMANCE FIX] Set a 30-second timeout — prevents hanging requests
            timeout: 30000
        });

        if (response.data.error_code === 0) {
            const results = response.data.response?.results;
            let hostsList = [];

            if (results?.length > 0 && results[0].hosts?.length > 0 && results[0].hosts[0].iplist) {
                hostsList = results[0].hosts[0].iplist;
            }

            return res.json({
                success: true,
                cveID: normalizedCveID,
                hosts: hostsList
            });
        }

        return res.status(502).json({
            success: false,
            // [SECURITY FIX] Return generic error — don't leak Tenable internal error details
            error_msg: 'Tenable SC returned an error. Check your CVE ID and try again.',
            error_code: response.data.error_code
        });

    } catch (error) {
        // [SECURITY FIX] Log full error on server, return only a generic message to client
        console.error('[Tenable API Error]', {
            message: error.message,
            code: error.code,
            status: error.response?.status
        });

        // Differentiate timeout vs other errors for better UX
        const isTimeout = error.code === 'ECONNABORTED' || error.message.includes('timeout');

        return res.status(502).json({
            success: false,
            error_msg: isTimeout
                ? 'Request timed out. Tenable SC may be unreachable or under heavy load.'
                : 'Failed to connect to Tenable SC. Please check server connectivity.',
            error_code: -1
        });
    }
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`[teenvul] Server running at http://localhost:${PORT}`);
    if (process.env.NODE_ENV !== 'production') {
        console.log(`[teenvul] Tenable SC host: ${TENABLE_HOST}:${TENABLE_PORT}`);
    }
});
