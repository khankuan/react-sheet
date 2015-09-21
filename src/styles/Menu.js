import Colors from './Colors';

export default {
  base: {
    background: 'white',
    boxShadow: '0 0 1px 1px #ccc',
    pointerEvents: 'all',
    minWidth: '120px',
    fontSize: '14px',
    color: Colors.dark
  },
  item: {
    padding: '6px 8px',
    cursor: 'pointer',
    ':hover': {
      background: Colors.grey
    }
  }
};
