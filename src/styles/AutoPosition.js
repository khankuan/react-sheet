export default {
  base: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    zIndex: 1,
    pointerEvents: 'none'
  },
  child: {
    transition: 'opacity 0.2s ease',
    position: 'absolute',
    opacity: 1
  }
};
