// Misc utility functions.


// React imports
import React, { useContext, useEffect, useRef, useState } from 'react';


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
    let msg = `Expected s to be a string, but it's a ${typeof s}`;
    throw new Error(msg);
  }
  return s.charAt(0).toUpperCase() + s.slice(1);
}


let sleep = async (timeSeconds) => {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, timeSeconds * 1000);
  });
}


let splitStringIntoArray = (s) => {
  return s.replace(/\n/g, ' ').replace(/,/g, '').split(' ').filter(x => x);
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
  // This matches a digit sequence + optional period + optional digit sequence.
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




let misc = {
  log,
  jd,
  lj,
  confirmKeys,
  confirmExactKeys,
  confirmItemInArray,
  capitalise,
  sleep,
  splitStringIntoArray,
  useFirstRender,
  isNumericString,
  camelCaseToCapitalisedWords,
}


export default misc;