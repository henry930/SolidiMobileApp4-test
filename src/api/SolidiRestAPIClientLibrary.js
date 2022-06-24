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
    }
    let headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
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
    let maxTimeSeconds = 10;
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
      let response = await fetch(uri, options);
      let responseData = await response.text();
      //log("Response: " + responseData);
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
    let dataToSign = this.domain + path;
    if (postData) dataToSign += postData;
    //this.deb({dataToSign});
    let secretBase64 = new Buffer(this.apiSecret).toString('base64');
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
