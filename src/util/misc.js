// Misc utility functions. All stateless.


// Imports
import _ from 'lodash';


function confirmKeys(objName, obj, keyNames, functionName) {
  // Confirm that an object has certain keys.
  for (let k of keyNames) {
    if (_.isUndefined(obj[k])) {
      let msg = `${functionName}: '${objName}' is expected to have the key '${k}', but does not.`;
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


let misc = {
  confirmKeys,
  confirmExactKeys,
  confirmItemInArray,
}


export default misc;