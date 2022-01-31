
// Unused so far.

// React imports
import React from 'react';
import { Text } from 'react-native';

import StyledTransactions from './Transactions.style';
import { TransactionsToggle } from './components';

let Transactions = () => {

  return (
    <StyledTransactions>
      <TransactionsToggle />
      <Text>TX</Text>
    </StyledTransactions>
  )
}

export default Transactions;
