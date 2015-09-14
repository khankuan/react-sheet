export function inBetween (x, start, end) {
  return start < end ? (x >= start && x <= end) : (x <= start && x >= end);
}
