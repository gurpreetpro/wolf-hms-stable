/**
 * Firebase Cloud Functions Proxy
 * Routes all /api/* requests to Cloud Run backend
 * This solves CORS issues by making requests same-origin
 */

const functions = require('firebase-functions');
const fetch = require('node-fetch');

// Cloud Run backend URL - CORRECTED to actual wolfhms service
const BACKEND_URL = 'https://wolfhms-fdurncganq-el.a.run.app';

// Create a proxy function for all API requests
exports.api = functions.region('asia-south1').https.onRequest(async (req, res) => {
    // Set CORS headers for the response
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).send('');
        return;
    }
    
    try {
        // Build the target URL
        const targetPath = req.path.startsWith('/api') ? req.path : `/api${req.path}`;
        const targetUrl = `${BACKEND_URL}${targetPath}`;
        
        console.log(`[Proxy] ${req.method} ${targetUrl}`);
        
        // Forward the request to Cloud Run
        const headers = {};
        
        // Copy only safe headers
        if (req.headers.authorization) {
            headers['Authorization'] = req.headers.authorization;
        }
        headers['Content-Type'] = 'application/json';
        
        const fetchOptions = {
            method: req.method,
            headers: headers,
        };
        
        // Add body for POST/PUT/PATCH - Firebase Functions parses body automatically
        if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
            // req.body is already parsed by Firebase - stringify it
            if (typeof req.body === 'object') {
                fetchOptions.body = JSON.stringify(req.body);
            } else if (typeof req.body === 'string') {
                fetchOptions.body = req.body;
            }
            console.log(`[Proxy] Body: ${fetchOptions.body}`);
        }
        
        const response = await fetch(targetUrl, fetchOptions);
        
        // Forward response headers
        response.headers.forEach((value, key) => {
            if (!['content-encoding', 'transfer-encoding', 'content-length'].includes(key.toLowerCase())) {
                res.set(key, value);
            }
        });
        
        // Get response body
        const data = await response.text();
        
        res.status(response.status).send(data);
        
    } catch (error) {
        console.error('[Proxy] Error:', error);
        res.status(500).json({ error: 'Proxy error', message: error.message });
    }
});
