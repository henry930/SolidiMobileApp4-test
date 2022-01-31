import { StyleSheet } from 'react-native';
import Button from './Button/Button';
import { colours } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';

let StandardButton = (props) => {
  return <Button {...props} styles={styles} />
};

let styles = StyleSheet.create({
  view: {
    height: scaledHeight(40),
    alignSelf: 'flex-start',
    height: 40,
    paddingHorizontal: scaledWidth(20),
    borderRadius: scaledWidth(8),
    backgroundColor: colours.standardButton,
  },
  text: {
    color: colours.standardButtonText,
    fontWeight: 'bold',
    fontSize: normaliseFont(16),
  },
});

export default StandardButton;
