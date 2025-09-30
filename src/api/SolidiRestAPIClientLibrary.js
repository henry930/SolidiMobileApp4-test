// React imports
import React, { useRef } from 'react';

// Imports
import _ from 'lodash';
import { Buffer } from "buffer";
import CryptoJS from 'crypto-js';
import { resolve } from 'path';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('SolidiRestAPIClientLibrary');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

// Shortcuts
let jd = JSON.stringify;




/* Examples of use

let result = await apiClient.publicMethod({httpMethod: "GET", apiRoute: "hello"});

let result = await apiClient.publicMethod({httpMethod: "POST", apiRoute: "hello2", params: {testparam1: 'foo'}});

let result = await apiClient.privateMethod({httpMethod: "POST", apiRoute: "privatehello", params: {testparam1: 'Private hello world'}})

let result = await apiClient.privateMethod({httpMethod: "POST", apiRoute: "transaction", params: {}})

let data = await appState.apiClient.privateMethod({
  httpMethod: 'POST',
  apiRoute: 'transaction',
  params: {}
})

*/




let sleep = async (timeSeconds) => {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, timeSeconds * 1000);
  });
}




export default class SolidiRestAPIClientLibrary {

  constructor(args, ...args2) {
    this._checkArgs2(args2, 'constructor');
    let expected = 'userAgent, apiKey, apiSecret, domain'.split(', ');
    this._checkExactExpectedArgs(args, expected, 'constructor');
    _.assign(this, args);

    // ===== LOGGING TEST START =====
    console.log('\n' + '🚀'.repeat(50));
    console.log('🔥 SOLIDI API CLIENT INITIALIZED WITH ENHANCED LOGGING! 🔥');
    console.log(`📡 Domain: ${this.domain}`);
    console.log(`🔑 API Key: ${this.apiKey || 'None'}`);
    console.log('🎯 LOGGING IS WORKING - YOU SHOULD SEE THIS MESSAGE!');
    console.log('🚀'.repeat(50));
    // ===== LOGGING TEST END =====

    // When testing for release into production, it is not possible to use www.solidi.co (as this is pointing to the current live server)
    // and it is not easy to override the DNS when testing on a mobile app.
    // Instead we use the hostname 'tt.solidi.co', however as the new production server is setup as www.solidi.co and expects all messages
    // to be signed as going to www.solidi.co we override the domain name supplied here with www.solidi.co for the purposes of signing api
    // calls.
    this.signingDomain = this.domain;
    if(this.domain=='tt.solidi.co') {
      this.signingDomain = 'www.solidi.co';
    }
    this.prevNonce = Date.now() * 1000; // Note: Date.now() returns a value in milliseconds.
    this.activeRequest = false;
  }

  _checkArgs2(args2, methodName) {
    if (args2.length > 0) {
      let msg = `The SolidiRestAPIClientLibrary: '${methodName}' method only accepts a single argument.`
      throw new Error(msg);
    }
  }

  _checkExpectedArgs(args, expected, methodName) {
    // Confirm that we received a particular set of argument properties.
    for (let a of expected) {
      if (_.isUndefined(args[a])) {
        let msg = `The SolidiRestAPIClientLibrary:'${methodName}' method expects an argument property called ${a}`;
        throw new Error(msg);
      }
    }
  }

  _checkExactExpectedArgs(args, expected, methodName) {
    // Confirm that we received an exact set of argument properties, and no others.
    this._checkExpectedArgs(args, expected, methodName);
    let received = _.keys(args);
    for (let a of received) {
      if (! expected.includes(a)) {
        let msg = `The SolidiRestAPIClientLibrary:'${methodName}' method expects exactly these argument properties: [${expected.join(', ')}], and received this unexpected property: ${a}`;
        throw new Error(msg);
      }
    }
  }

  async publicMethod(args, ...args2) {
    this._checkArgs2(args2, 'publicMethod');
    let expected = 'httpMethod, apiRoute, abortController'.split(', ');
    this._checkExpectedArgs(args, expected, 'publicMethod');
    if (_.isUndefined(args.params)) { args.params = {}; }
    if (_.isUndefined(args.apiVersion)) { args.apiVersion = 'v1'; }
    args.privateAPICall = false;
    return this.queueAPICall(args);
  }

  async privateMethod(args, ...args2) {
    this._checkArgs2(args2, 'privateMethod');
    let expected = 'httpMethod, apiRoute, abortController'.split(', ');
    this._checkExpectedArgs(args, expected, 'privateMethod');
    if (_.isUndefined(args.params)) { args.params = {}; }
    if (_.isUndefined(args.apiVersion)) { args.apiVersion = 'v1'; }
    args.privateAPICall = true;
    return this.queueAPICall(args);
  }

  async queueAPICall(args, ...args2) {
    /*
    Problem:
    - The server enforces incrementing nonces.
    - We need to guarantee that requests arrive at the server in a specific order.
    - If they don't, some of them will come back with "Incorrect nonce" errors.
    Solution:
    - We wait until each request returns prior to sending another one.
    - We do this by locking here while making a request.
    Notes:
    - This isn't a great queue system and doesn't guarantee order. Requests may be processed after later requests.
    - Order can guaranteed in a React Native page / component by using 'await'.
    */
    if (this.activeRequest) {
      // Sleep a bit and retry.
      let value = Math.random(); // Between 0 and 1.
      value = value / 100; // Between 0 and 0.01 seconds.
      //log(`API request: apiRoute=${args.apiRoute}: params=${jd(args.params)}: Sleeping ${value} seconds.`);
      await sleep(value);
      return this.queueAPICall(args);
    }
    this.activeRequest = true;
    let result = await this.makeAPICall(args);
    this.activeRequest = false;
    return result;
  }

  async makeAPICall(args, ...args2) {
    this._checkArgs2(args2, 'makeAPICall');
    let expected = 'privateAPICall, httpMethod, apiRoute, params, apiVersion, abortController'.split(', ');
    this._checkExactExpectedArgs(args, expected, 'makeAPICall');
    let {privateAPICall, httpMethod, apiRoute, params, apiVersion, abortController} = args;
    
    // ===== API CALL DETECTION START =====
    console.log('\n' + '🔴'.repeat(60));
    console.log('🚨 API CALL DETECTED! ENHANCED LOGGING ACTIVE! 🚨');
    console.log(`🎯 API Route: ${apiRoute}`);
    console.log(`📡 Method: ${httpMethod}`);
    console.log(`🔒 Private: ${privateAPICall ? 'YES' : 'NO'}`);
    console.log('🔴'.repeat(60));
    // ===== API CALL DETECTION END =====
    
    let path = `/api2/${apiVersion}/${apiRoute}`;
    let uri = 'https://' + this.domain + path;
    if (params == null) params = {};
    if (_.keys(params).length > 0) {
      if ('GET HEAD'.split().includes(httpMethod)) {
        let msg = `For HTTP method '${httpMethod}', parameters cannot be supplied. Supplied params: ${params}`;
        throw new Error(msg);
      }
    }
    let postData = null;
    if ('POST'.split().includes(httpMethod)) {
      let params2 = _.assign({}, params);
      let nonce = Date.now() * 1000;
      if (nonce <= this.prevNonce) nonce = this.prevNonce + 1;
      this.prevNonce = nonce;
      params2.nonce = nonce;
      //log(`API request: apiRoute=${apiRoute}: nonce=${nonce}: params=${jd(params)}`);
      postData = JSON.stringify(params2);
    } else {
      if (privateAPICall) {
        var msg = `To make a private API call, need to use POST HTTP method. This means that we can include POST body data, for example the nonce.`;
        throw Error(msg);
      }
    }
    let headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    // Add in basic authentication headers
    // As of:2024/04/22 these are not used (API skips the Basic Auth block)
    let basicAuthEnabled = 0;
    // Quick hack check on domain names - we shouldn't do this long term.
    if (basicAuthEnabled && this.domain!='www.solidi.co' && this.domain!='api.solidi.co') {
        let authstr = '<basicauth_username>:<password>';
        let authbuf = Buffer.from(authstr);
        let digest = authbuf.toString('base64');
        headers['Authorization'] = 'Basic '+digest;
    }
    if (privateAPICall) {
      if (! this.apiSecret) {
        let msg = 'apiSecret required.';
        throw Error(msg);
      }
      let signature = this.signAPICall({path, postData});
      _.assign(headers, {
        'API-Key': this.apiKey,
        'API-Sign': signature,
      });
    }
    headers['User-Agent'] = this.userAgent;
    if (postData) {
      headers['Content-Length'] = postData.length;
    }
    //log({postData})
    // Abort the request if it takes longer than maxTimeSeconds.
    let maxTimeSeconds = 20;
    let timeout = false;
    let timerID = setTimeout(() => {
        abortController.abort();
        timeout = true;
      }, maxTimeSeconds * 1000
    );
    // Make the API request.
    try {
      let options = {
        method: httpMethod,
        headers,
        redirect: 'follow',
        signal: abortController.signal,
      }
      if (postData) options.body = postData;
      let msg = `Calling ${httpMethod} ${uri}`;
      if (postData) {
        let postDataStr = JSON.stringify(postData);
        let postDataStr2 = postDataStr.length < 400 ? postDataStr : postDataStr.substring(1, 400) + ' ... ';
        msg += ` with parameters = ${postDataStr2}`;
      }
      log(msg);

      // ===== SIMPLIFIED API LOGGING =====
      if (apiRoute.includes('login')) {
        console.log('\n' + '🔐'.repeat(40));
        console.log('🚨 LOGIN API CALL DETECTED! 🚨');
        console.log(`📍 ENDPOINT: ${httpMethod} ${uri}`);
        console.log('�'.repeat(40));
      }
      // ===== SIMPLIFIED API LOGGING END =====

      let response = await fetch(uri, options);

      // ===== SIMPLIFIED RESPONSE LOGGING =====
      if (apiRoute.includes('login')) {
        console.log('\n' + '📡 LOGIN RESPONSE RECEIVED');
        console.log(`📊 STATUS: ${response.status} ${response.statusText}`);
      }
      // ===== SIMPLIFIED RESPONSE LOGGING END =====
      if (! response.ok) {
        // Return 503 errors to caller.
        // We might want to return all non-[200-299] codes.
        if (response.status == 503) {
          return {error: response.status}
        }
      }
      let responseData = await response.text();
      
      // ===== SIMPLIFIED RESPONSE BODY LOGGING =====
      if (apiRoute.includes('login')) {
        console.log('\n💾 LOGIN RESPONSE BODY:');
        console.log(responseData);
        console.log('-'.repeat(40));
      }
      // ===== SIMPLIFIED RESPONSE BODY LOGGING END =====
      
      let responseDataStr = responseData;
      if (responseDataStr.length > 300) {
        responseDataStr = responseDataStr.substring(0, 300) + ' ... ';
      }
      log("Response: " + responseDataStr);
      // Catch and handle timeouts:
/*
<html>
<head><title>504 Gateway Time-out</title></head>
<body>
<center><h1>504 Gateway Time-out</h1></center>
<hr><center>nginx/1.16.1</center>
</body>
</html>
*/
      responseData = responseData.replace(/[\r\n]+/gm, ''); // remove line breaks
      //log({responseData})
      // Error 502: Bad Gateway
      let timeoutSection = '<html><head><title>502 Bad Gateway</title></head>';
      let n = timeoutSection.length;
      let firstSection = responseData.slice(0, n);
      if (firstSection == timeoutSection) {
        return {error: 'request_failed'};
      }
      // Error 504: Gateway Time-out
      let timeoutSection2 = '<html><head><title>504 Gateway Time-out</title></head>';
      let n2 = timeoutSection2.length;
      let firstSection2 = responseData.slice(0, n2);
      if (firstSection2 == timeoutSection2) {
        return {error: 'timeout'};
      }
      /* Format:
      - The response will always be an object, with an 'error' property.
      - The error property will be: null, 'success', or an error.
      - If the error is null, the response can contain a 'data' property.
      */
      try {
        result = JSON.parse(responseData);
        
        // ===== SAVE API CREDENTIALS TO FILE =====
        if (result && result.data && result.data.apiKey && result.data.apiSecret) {
          const fs = require('react-native-fs');
          const credentialsData = {
            timestamp: new Date().toISOString(),
            apiKey: result.data.apiKey,
            apiSecret: result.data.apiSecret,
            userID: result.data.userID,
            email: result.data.email,
            fullResponse: result
          };
          
          const filePath = `${fs.DocumentDirectoryPath}/solidi_api_credentials.json`;
          fs.writeFile(filePath, JSON.stringify(credentialsData, null, 2))
            .then(() => {
              console.log('\n' + '🎉'.repeat(60));
              console.log('� API CREDENTIALS SAVED TO FILE! 💾');
              console.log(`📁 File: ${filePath}`);
              console.log(`🔑 API Key: ${result.data.apiKey}`);
              console.log(`🔐 API Secret: ${result.data.apiSecret}`);
              console.log('🎉'.repeat(60));
            })
            .catch(err => console.log('❌ Failed to save credentials:', err));
        }
        // ===== SAVE API CREDENTIALS TO FILE END =====
        
        // ===== SIMPLIFIED JSON RESPONSE LOGGING =====
        if (result && result.data && result.data.apiKey) {
          console.log('\n' + '🎊'.repeat(60));
          console.log('✅ LOGIN SUCCESS - API CREDENTIALS FOUND!');
          console.log(`🔑 API Key: ${result.data.apiKey}`);
          console.log(`🔐 API Secret: ${result.data.apiSecret}`);
          console.log('🎊'.repeat(60));
        }
        // ===== SIMPLIFIED JSON RESPONSE LOGGING END =====
        
      } catch(err) {
        log(`Can't parse received data: ${responseData}`);
        return {error: 'cannot_parse_data', responseData};
      }
      if (_.isNull(result.error)) {
        return result.data;
      }
      if (result.error == 'success') {
        return {result: 'success'};
      }
      //console.log(result.error);
      return {error: result.error};
    } catch(err) {
      if (err.name == 'AbortError') {
        let msg = `Aborted: ${uri}`;
        log(msg);
        if (timeout) return {error: 'timeout'};
        return {error: 'aborted'};
      } else if (err.name == 'TypeError') {
        if (err.message == 'Network request failed') {
          return {error: 'request_failed'};
        }
        throw err;
      } else {
        console.error(err);
        throw err;
      }
    } finally {
      clearTimeout(timerID);
    }
  }

  signAPICall(args, ...args2) {
    this._checkArgs2(args2, 'signAPICall');
    let expected = 'path, postData'.split(', ');
    this._checkExactExpectedArgs(args, expected, 'signAPICall');
    let {path, postData} = args;
    let dataToSign = this.signingDomain + path;
    if (postData) dataToSign += postData;
    //this.deb({dataToSign});
    let secretBase64 = Buffer.from(this.apiSecret).toString('base64');
    let signature = CryptoJS.HmacSHA256(dataToSign, secretBase64);
    let signatureBase64 = signature.toString(CryptoJS.enc.Base64);
    //this.deb(signatureBase64)
    // Example signatureBase64:
    // 0PcMtrmM8KKcdbmzwDHdiihJuQtOtbpSDEC76k7Vxwo=
    // Example of creating a HMAC signature using the npm package 'crypto' (which doesn't work on React Native):
    // let signature = crypto.createHmac('sha256', base64Secret).update(dataToSign).digest().toString('base64');
    return signatureBase64;
  }

}
