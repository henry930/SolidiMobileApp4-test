// React imports
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from 'react-native-paper';

// Other imports
import _ from 'lodash';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('StandardButton');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);




let StandardButton = ({ title, onPress, disabled = false, mode = "contained", style, ...props }) => {
  return (
    <Button
      mode={mode}
      onPress={onPress}
      disabled={disabled}
      style={[
        {
          borderRadius: 12,
          alignSelf: 'flex-start',
        },
        style
      ]}
      contentStyle={{ paddingVertical: 4 }}
      labelStyle={{ fontWeight: '600' }}
      {...props}
    >
      {title}
    </Button>
  );
};

export default StandardButton;
