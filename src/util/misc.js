// Misc utility functions.


// React imports
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';


// Imports
import _ from 'lodash';


let log = console.log;
let jd = JSON.stringify;
let lj = (x) => log(jd(x));


function confirmKeys(objName, obj, keyNames, functionName) {
  // Confirm that an object has certain keys.
  for (let k of keyNames) {
    if (_.isUndefined(obj[k])) {
      let msg = `${functionName}: '${objName}' is expected to have the key '${k}', but does not.`;
      msg += `\n- These keys are present: ${_.keys(obj)}`;
      msg += '\n- With these values:';
      for (let key of _.keys(obj)) {
        let value = obj[key];
        msg += `\n-- ${key}: ${value}`;
      }
      throw new Error(msg);
    }
  }
}


function confirmExactKeys(objName, obj, keyNames, functionName) {
  confirmKeys(objName, obj, keyNames, functionName);
  let foundKeys = _.keys(obj);
  for (let k of foundKeys) {
    if (! keyNames.includes(k)) {
      let msg = `${functionName}: '${objName}' is expected to have exactly these keys: [${keyNames.join(', ')}], but has this unexpected key: '${k}'`;
      throw new Error(msg);
    }
  }
}


function hasExactKeys(objName, obj, keyNames, functionName) {
  let foundKeys = _.keys(obj);
  foundKeys.sort();
  keyNames.sort();
  if (jd(foundKeys) === jd(keyNames)) return true;
  return false;
}



function itemInArray(arrayName, arrayObj, item, functionName) {
  if (! arrayObj instanceof Array) return false;
  for (let x of arrayObj) {
    if (_.isEqual(item, x)) {
      return true;
    }
  }
  return false;
}


function confirmItemInArray(arrayName, arrayObj, item, functionName) {
  // Confirm that an array contains a particular item.
  if (! arrayObj instanceof Array) {
    let msg = `${functionName}: ${arrayName} is expected to be an array, but isn't.`;
    throw new Error(msg);
  }
  for (let x of arrayObj) {
    if (_.isEqual(item, x)) {
      return true;
    }
  }
  let msg = `${functionName}: ${arrayName} does not contain this item: '${item.toString()}'`;
  throw new Error(msg);
}


let capitalise = (s) => {
  if (typeof s !== 'string') {
    let msg = `Expected s to be a string, but it's a '${typeof s}'.`;
    throw new Error(msg);
  }
  return s.charAt(0).toUpperCase() + s.slice(1);
}


let sleep = async (timeSeconds) => {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, timeSeconds * 1000);
  });
}


let splitStringIntoArray = ({s}) => {
  // Splits a string into an array of words. The string can be multiline.
  // The words are separated by spaces. Commas are ignored.
  // Multiple spaces are collapsed into single spaces prior to splitting.
  if (! _.isString(s)) {
    var msg = `Expected s to be a string, but it's a '${typeof s}'.`;
    throw Error(msg);
  }
  let items = s.replace(/\n/g, ' ').trim().replace(/,/g, '').replace(/  +/g, ' ').split(' ');
  return items;
}


let useFirstRender = () => {
  let firstRender = useRef(true);

  useEffect(() => {
    firstRender.current = false;
  }, []);

  return firstRender.current;
}


let isNumericString = (value) => {
  if (! _.isString(value)) return false;
  // This matches a digit sequence + optional (period + digit sequence).
  // It does not match a digit sequence with a period at the end.
  let regexString = `^-?\\d+(\\.\\d+)?$`;
  let regex = new RegExp(regexString);
  let result = regex.test(value);
  return result;
}


let camelCaseToCapitalisedWords = (s) => {
  // 's' = 'string'
  let n = s.length;
  let r = ''; // 'r' = 'result'
  for (let i=0; i<n; i++) {
    let c = s[i]; // 'c' = 'character'
    let lastCharacter = (i === n - 1);
    if (lastCharacter) {
      r += c;
      continue;
    }
    let c2 = s[i+1];
    if (c === c.toLowerCase()) {
      if (c2 === c2.toUpperCase()) {
        // Add a space before we move to the next word.
        r += c + ' ';
      } else {
        // Next char is also lower-case.
        r += c;
      }
    } else {
      // Upper-case character.
      r += c;
    }
  }
  return capitalise(r);
}


let snakeCaseToCapitalisedWords = (s) => {
  s = s.replaceAll('_', ' ');
  let words = s.split(' ');
  words = words.map(capitalise);
  let s2 = words.join(' ');
  return s2;
}


let removeFinalDecimalPointIfItExists = (v) => {
  if (! _.isString(v)) return v;
  if (v.slice(-1) == '.') v = v.slice(0, -1);
  return v;
}


let itemToString = (x) => {
  if (_.isString(x)) return x;
  if (_.isObject(x)) {
    if (_.isEmpty(x)) {
      x = '{}';
    } else {
      x = JSON.stringify(x);
    }
  }
  return x;
}


let getCurrentDate = () => {
  // Returns current date in yyyy-mm-dd format.
  let today = new Date();
  let year = today.getFullYear();
  let month = String(today.getMonth() + 1);
  if (month.length == 1) month = '0' + month;
  let day = today.getDate();day
  if (day.length == 1) day = '0' + day;
  let date = year + '-' + month + '-' + day;
  return date;
}


let getFlatListIconResizeMode = () => {
  return Platform.select({
    ios: 'contain',
    android: 'center',
  });
}




let misc = {
  log,
  jd,
  lj,
  confirmKeys,
  confirmExactKeys,
  hasExactKeys,
  itemInArray,
  confirmItemInArray,
  capitalise,
  sleep,
  splitStringIntoArray,
  useFirstRender,
  isNumericString,
  camelCaseToCapitalisedWords,
  snakeCaseToCapitalisedWords,
  removeFinalDecimalPointIfItExists,
  itemToString,
  getCurrentDate,
  getFlatListIconResizeMode,
}


export default misc;