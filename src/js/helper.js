export function inBetween (x, start, end) {
  return start < end ? (x >= start && x <= end) : (x <= start && x >= end);
}

export function inBetweenArea (x, y, startX, endX, startY, endY) {
  return inBetween(x, startX, endX) && inBetween(y, startY, endY);
}

export function isEqualObject (a, b, ignoreKeys = {}) {
  for (let key in a){
    if (a[key] !== b[key] &&
        !ignoreKeys[key] &&
        typeof a[key] !== 'function'){
      return false;
    }
  }

  return true;
}

export function isInParent (child, parent) {
  while (child) {
    if (child === parent){
      return true;
    } else {
      child = child.parentNode;
    }
  }

  return false;
}

export const ignoreKeyCodes = {
  37: true,
  38: true,
  39: true,
  40: true,
  13: true,
  16: true,
  17: true,
  18: true,
  27: true,
  91: true,
  93: true
};


export function isCommand (e) {
  return (e.metaKey || e.ctrlKey) && (e.keyCode === 67 || e.keyCode === 86 || e.keyCode === 88) ||
          (e.keyCode === 8 || e.keyCode === 46);
}
