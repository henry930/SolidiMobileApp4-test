// Misc utility functions. All stateless.


// Imports
import _ from 'lodash';


function confirmKeys(objName, obj, keyNames, functionName) {
  // Confirm that an object has certain keys.
  for (let k of keyNames) {
    if (_.isUndefined(obj[k])) {
      let msg = `${functionName}: '${objName}' is expected to have the key '${k}', but does not.`;
      msg += `\n- These keys are present: ${_.keys(obj)}`;
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


let getStandardAsset = (asset) => {
  // Convert Solidi server asset symbol (e.g. "GBPX") to standard asset symbol (e.g. "GBP").
  // Currently, we only need to remove the off-exchange 'X' from some ticker symbols.
  if (asset == 'GBPX') asset = 'GBP';
  if (asset == 'EURX') asset = 'EUR';
  return asset;
}


let getStandardMarket = (market) => {
  // Convert Solidi server market string (e.g. "BTC/GBPX") to standard market string (e.g. "BTC/GBP").
  let [baseAsset, quoteAsset] = market.split('/');
  baseAsset = getStandardAsset(baseAsset);
  quoteAsset = getStandardAsset(quoteAsset);
  let market2 = baseAsset + '/' + quoteAsset;
  return market2;
}


let misc = {
  confirmKeys,
  confirmExactKeys,
  confirmItemInArray,
  capitalise,
  getStandardAsset,
  getStandardMarket,
}


export default misc;