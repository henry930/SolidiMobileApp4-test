// React imports
import React, { useContext, useEffect, useState } from 'react';

// Internal imports
import AppStateContext from 'src/application/data';
import AccountUpdateComponent from 'src/components/AccountUpdate/AccountUpdate';
import misc from 'src/util/misc';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('AccountUpdate');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

/**
 * AccountUpdate - MainPanel wrapper for the AccountUpdate component
 * This wrapper integrates the AccountUpdate component with the MainPanel navigation system
 */
let AccountUpdate = ({ onComplete }) => {
  let appState = useContext(AppStateContext);
  let [renderCount, triggerRender] = useState(0);
  let firstRender = misc.useFirstRender();
  let stateChangeID = appState.stateChangeID;

  let pageName = appState.pageName;
  let permittedPageNames = 'default'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'AccountUpdate');

  // Initial setup
  useEffect(() => {
    setup();
  }, []); // Pass empty array so that this only runs once on mount

  let setup = async () => {
    try {
      await appState.generalSetup({caller: 'AccountUpdate'});
      await appState.loadInitialStuffAboutUser();
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      triggerRender(renderCount + 1);
    } catch(err) {
      let msg = `AccountUpdate.setup: Error = ${err}`;
      console.log(msg);
    }
  }

  // Log component loading
  log('🔥 AccountUpdate MainPanel wrapper loaded!');
  console.log('🔥🔥🔥 [WRAPPER] AccountUpdate MainPanel wrapper is rendering 🔥🔥🔥');
  console.log('🎯 [WRAPPER] Wrapper component called - about to load actual AccountUpdate');
  
  // Debug appState before passing to component
  console.log('🎯 [AccountUpdate Wrapper] appState exists:', !!appState);
  console.log('🎯 [AccountUpdate Wrapper] privateMethod exists:', !!(appState && appState.privateMethod));
  if (appState) {
    console.log('🎯 [AccountUpdate Wrapper] appState methods:', Object.keys(appState).filter(key => typeof appState[key] === 'function').slice(0, 10));
  }

  return (
    <AccountUpdateComponent 
      appState={appState} 
      onComplete={onComplete || (() => {
        console.log('📋 [AccountUpdate Wrapper] No onComplete callback provided, using default');
      })}
    />
  );
};

export default AccountUpdate;
