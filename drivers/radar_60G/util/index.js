'use strict';

const { debug } = require('zigbee-clusters');
const color = require('./color');

async function wait(timeout) {
  if (typeof timeout !== 'number') throw new TypeError('expected_timeout_number');
  return new Promise(resolve => setTimeout(resolve, timeout));
}

function wrapAsyncWithRetry(
  method,
  times = 1,
  interval = 0,
) {
  if (typeof method !== 'function') throw TypeError('expected_function');
  if (typeof times !== 'number') throw TypeError('expected_times_number');
  if (typeof interval !== 'number' && typeof interval !== 'function') {
    throw TypeError('expected_interval_number_or_function');
  }
  return new Promise((resolve, reject) => {
    let retries = 0;

    // Create function which executes the provided method and resolves the promise if success,
    // if failure it will wait for the provided interval and then execute the method again.
    function executeMethod() {
      method()
        .then(resolve)
        .catch(err => {
          if (times > retries) {
            retries += 1;

            // Determine time to wait
            const waitTime = typeof interval === 'function' ? interval(retries) : interval;
            return wait(waitTime).then(executeMethod);
          }
          return reject(err);
        });
    }

    // Start the execution
    executeMethod();
  });
}

function calculateLevelControlTransitionTime(opts = {}) {
  if (typeof opts.duration === 'number') {
    // Convert from milliseconds to tenth of second, then cap the range between 0 and 65534, the
    // full range is 65535 but 0xFFFF does not represent the longest time possible but the time
    // set in `OnOffTransactionTime` attribute.
    return Math.max(Math.min(opts.duration / 100, 65534), 0);
  }

  // Use the default transition time or as determined by the `OnOffTransactionTime` attribute
  return 0xFFFF;
}

function calculateColorControlTransitionTime(opts = {}) {
  if (typeof opts.duration === 'number') {
    // Convert from milliseconds to tenth of second, then cap the range between 0 and 65535.
    return Math.max(Math.min(opts.duration / 100, 65535), 0);
  }

  // If no `duration` property is found move as fast as possible to the desired color
  return 0;
}

function limitValue(value, min, max) {
  if (typeof value !== 'number') throw new TypeError('expected_value_number');
  if (typeof min !== 'number') throw new TypeError('expected_min_number');
  if (typeof max !== 'number') throw new TypeError('expected_max_number');
  return Math.min(Math.max(value, min), max);
}

function mapValueRange(originalRangeStart, originalRangeEnd, newRangeStart, newRangeEnd, value) {
  if (typeof originalRangeStart !== 'number') throw new TypeError('expected_original_range_start_number');
  if (typeof originalRangeEnd !== 'number') throw new TypeError('expected_original_range_end_number');
  if (typeof newRangeStart !== 'number') throw new TypeError('expected_new_range_start_number');
  if (typeof newRangeEnd !== 'number') throw new TypeError('expected_new_range_end_number');
  if (typeof value !== 'number') throw new TypeError('expected_value_number');

  return newRangeStart + ((newRangeEnd - newRangeStart) / (originalRangeEnd - originalRangeStart))
    * (Math.min(Math.max(originalRangeStart, value), originalRangeEnd) - originalRangeStart);
}

/**
 * Utility class with several color and range conversion methods.
 * @class Util
 */
module.exports = {
  ...color,
  wait,
  limitValue,
  mapValueRange,
  wrapAsyncWithRetry,
  calculateLevelControlTransitionTime,
  calculateColorControlTransitionTime
};