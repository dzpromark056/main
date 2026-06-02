/**
 * idUtils.js
 * Monotonically-increasing integer ID factory.
 * Isolated so tests can reset or replace the counter independently.
 */

let _counter = 1;

/** Returns the next unique integer ID. */
export function uid() {
  return _counter++;
}

/** Reset counter — only use in unit tests. */
export function _resetCounter() {
  _counter = 1;
}
