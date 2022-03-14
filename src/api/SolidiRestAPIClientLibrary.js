// Imports
import _ from 'lodash';
import { Buffer } from "buffer";
import CryptoJS from 'crypto-js';




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




export default class SolidiRestAPIClientLibrary {

  constructor(args, ...args2) {
    this._checkArgs2(args2, 'constructor');
    let expected = 'userAgent, apiKey, apiSecret, domain'.split(', ');
    this._checkExactExpectedArgs(args, expected, 'constructor');
    _.assign(this, args);
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
    return this.makeAPICall(args);
  }

  async privateMethod(args, ...args2) {
    this._checkArgs2(args2, 'privateMethod');
    let expected = 'httpMethod, apiRoute, abortController'.split(', ');
    this._checkExpectedArgs(args, expected, 'privateMethod');
    if (_.isUndefined(args.params)) { args.params = {}; }
    if (_.isUndefined(args.apiVersion)) { args.apiVersion = 'v1'; }
    args.privateAPICall = true;
    return this.makeAPICall(args);
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
      params2.nonce = Date.now() * 1000;
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
      let msg = `Calling ${uri}`;
      log(msg)
      let response = await fetch(uri, options);
      let data = await response.text();
      //log("Response: " + data);
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
      data = data.replace(/[\r\n]+/gm, ''); // remove line breaks
      //log({data})
      let timeoutSection = '<html><head><title>504 Gateway Time-out</title></head>';
      let n = timeoutSection.length;
      let firstSection = data.slice(0, n);
      if (firstSection == timeoutSection) {
        return {error: 'timeout'};
      }
      try {
        data = JSON.parse(data);
      } catch(err) {
        log(data);
        throw Error("Cannot parse data into JSON.");
      }
      return data;
    } catch(err) {
      if (err.name == 'AbortError') {
        let msg = `Aborted: ${uri}`;
        log(msg);
        if (timeout) return {error: 'timeout'};
        return {error: 'aborted'};
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
