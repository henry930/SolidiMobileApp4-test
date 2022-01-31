
import styled from 'styled-components';

import { menuHeight } from '../../constants';

const StyledTransactions = styled.View`
  position: absolute;
  top: 70%;
  transform: translateY(100px);

  height: 100%;
  width: 100%;

  padding-top: 50px;
  padding-bottom: ${menuHeight}px;
  background: lightgrey;

  border-radius: 20px;

  display: flex;
  flex-direction: column;
  align-items: center;
`;

export default StyledTransactions;
