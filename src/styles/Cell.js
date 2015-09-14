import Colors from './Colors';
import tinycolor from 'tinycolor2';

export default {
  input: {
    fontSize: 'inherit',
    display: 'inline-block',
    width: 'calc(100% - 13px)',
    height: 'calc(100% - 9px)',
    paddingLeft: '6px',
    paddingRight: '6px',
    paddingTop: '4px',
    paddingBottom: '4px',
    borderStyle: 'solid',
    borderLeftColor: tinycolor(Colors.white).darken(15).toRgbString(),
    borderRightColor: tinycolor(Colors.white).darken(15).toRgbString(),
    borderTopColor: tinycolor(Colors.white).darken(15).toRgbString(),
    borderBottomColor: tinycolor(Colors.white).darken(15).toRgbString(),
    borderLeftWidth: '1px',
    borderRightWidth: '0px',
    borderTopWidth: '1px',
    borderBottomWidth: '0px'
  },
  select: {
    position: 'absolute',
    right: 0,
    top: 0,
    appearance: 'none',
    WebkitAppearance: 'none',
    background: 'none',
    border: 'none',
    width: '20px',
    height: '100%',
    padding: '4px',
    opacity: 0,
    cursor: 'pointer'
  },
  arrow: {
    fontSize: '0.6em',
    opacity: 0.25,
    position: 'absolute',
    right: '5px',
    top: '50%',
    transform: 'translateY(-50%)'
  }
};
