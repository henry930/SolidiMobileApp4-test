// React imports
import React from 'react';
import { Button } from 'react-native-paper';

// Other imports
import _ from 'lodash';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('FixedWidthButton');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);




let FixedWidthButton = ({ title, onPress, disabled = false, mode = "contained", style, ...props }) => {
  return (
    <Button
      mode={mode}
      onPress={onPress}
      disabled={disabled}
      style={[
        {
          borderRadius: 12,
          width: '100%',
        },
        style
      ]}
      contentStyle={{ paddingVertical: 8 }}
      labelStyle={{ fontWeight: '600', fontSize: 16 }}
      {...props}
    >
      {title}
    </Button>
  );
};

export default FixedWidthButton;
