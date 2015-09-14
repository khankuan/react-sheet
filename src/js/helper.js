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