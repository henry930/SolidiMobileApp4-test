
const crypto = require('crypto');

const API_KEY = 'VTGFhoDBmDFFqYzxGWJNWRCAObZmLTTVIQ7qoj1SjhGY4Eu8IQJQhP6k';
const API_SECRET = 'B9sG03V9kw3uOubT5yMjPC7yLMEBMBiyoRXumYrF7TTRlrYEUZOBxN0xyBLXKpzYmrN7qwWT5cnskcMmH6jOgFDk';
const BASE_DOMAIN = 't2.solidi.co';
const BASE_URL = `https://${BASE_DOMAIN}/api2/v1`;

function signRequest(signingDomain, path, postData) {
    const dataToSign = signingDomain + path + (postData || '');
    const secretBase64 = Buffer.from(API_SECRET).toString('base64');
    const hmacNode = crypto.createHmac('sha256', secretBase64);
    hmacNode.update(dataToSign);
    return hmacNode.digest('base64');
}

async function report(name, method, endpoint, isPrivate = false, params = {}, signingDomainOverride = null) {
    console.log(`\n---------------------------------------------------`);
    console.log(`Testing: ${name}`);
    console.log(`Route: ${endpoint}`);
    console.log(`Method: ${method}`);

    const path = `/api2/v1/${endpoint}`;
    const url = `${BASE_URL}/${endpoint}`;

    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'SolidiTestScript/1.0'
    };

    let body = null;
    if (isPrivate) {
        let nonce = Date.now() * 1000;
        // Ensure nonce is strictly increasing if calling rapidly? Date.now() is ms. *1000 is usually enough micros.

        const payload = { ...params, nonce };
        body = JSON.stringify(payload);

        const domainToSign = signingDomainOverride || BASE_DOMAIN;
        const signature = signRequest(domainToSign, path, body);

        console.log(`Signing Domain: ${domainToSign}`);
        console.log(`Data to Sign: ${domainToSign}${path}${body}`);
        console.log(`Signature: ${signature}`);

        headers['API-Key'] = API_KEY;
        headers['API-Sign'] = signature;
        headers['Content-Length'] = body.length;
    }

    const options = {
        method,
        headers
    };
    if (body) options.body = body;

    console.log(`Request: ${method} ${url}`);
    try {
        const res = await fetch(url, options);
        const status = res.status;
        const resText = await res.text();

        console.log(`Response Status: ${status}`);
        console.log(`Response Body: ${resText}`);

    } catch (err) {
        console.error(`Error: ${err.message}`);
    }
}

async function run() {
    await report('Currency', 'GET', 'currency');
    await report('Market', 'GET', 'market');
    await report('Ticker', 'GET', 'ticker');

    // Try best_volume_price with specific market path
    await report('Best Volume Price (path)', 'GET', 'best_volume_price/BTC/GBP/SELL/quote/1');

    // Try Balance with api.solidi.co
    await report('Balance (api.solidi.co)', 'POST', 'balance', true);

    // Try Balance with www.solidi.co
    // Wait a bit to ensure nonce is fresh/higher
    await new Promise(r => setTimeout(r, 100));
    await report('Balance (www.solidi.co)', 'POST', 'balance', true, {}, 'www.solidi.co');
}

run();
