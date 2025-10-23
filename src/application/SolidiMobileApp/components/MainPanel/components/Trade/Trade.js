// Trade Component - Redirects to Assets page for trading functionality
import React from 'react';
import Assets from '../Assets/Assets';

const Trade = () => {
  // Simply render the Assets component for trading functionality
  // When users click on a crypto, they'll navigate to CryptoContent page
  // which will have the Buy/Sell/Send/Receive buttons
  return <Assets />;
};

export default Trade;
