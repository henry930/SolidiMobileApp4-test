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


let misc = {
  confirmKeys,
  confirmExactKeys,
}


export default misc;