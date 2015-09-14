import Colors from './Colors';
import tinycolor from 'tinycolor2';

export default {
  textAlign: 'center',
  cursor: 'default',
  display: 'block',
  padding: '6px',
  width: 'calc(100% - 12px)',
  height: '100%',
  borderStyle: 'solid',
  borderColor: tinycolor(Colors.white).darken(15).toRgbString(),
  borderWidth: '1px'
};
