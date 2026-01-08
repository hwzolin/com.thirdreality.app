'use strict';

const { ZigBeeDevice } = require("homey-zigbeedriver");
const { CLUSTER, Cluster } = require('zigbee-clusters');
const startUpOnOffCluster = require("../../lib/startUpOnOffSpecificCluster")
require('events').EventEmitter.defaultMaxListeners = 0;


const {
  wait,
  limitValue,
  mapValueRange,
  wrapAsyncWithRetry,
  calculateLevelControlTransitionTime,
  calculateColorControlTransitionTime,
  convertHSVToCIE,
  mapTemperatureToHueSaturation
} = require('./util');

Cluster.addCluster(startUpOnOffCluster)

const MAX_HUE = 254;
const MAX_DIM = 254;
const MAX_SATURATION = 254;
const CIE_MULTIPLIER = 65536;
const CURRENT_LEVEL = 'currentLevel';

const lightHueCapabilityDefinition = {
  capabilityId: 'light_hue',
  cluster: CLUSTER.COLOR_CONTROL
};
const lightSaturationCapabilityDefinition = {
  capabilityId: 'light_saturation',
  cluster: CLUSTER.COLOR_CONTROL
};
const lightModeCapabilityDefinition = {
  capabilityId: 'light_mode',
  cluster: CLUSTER.COLOR_CONTROL
};
const lightTemperatureCapabilityDefinition = {
  capabilityId: "light_temperature",
  cluster: CLUSTER.COLOR_CONTROL
}

class colorBulbZL1 extends ZigBeeDevice {

  /**
   * onInit is called when the device is initialized.
   */
  async onNodeInit({ zclNode }) {
    this.registerCapability("light_mode",CLUSTER.COLOR_CONTROL)

    if (!this.getStoreValue('colorClusterConfigured')
      && (this.hasCapability('light_hue')
      || this.hasCapability('light_saturation')
      || this.hasCapability('light_mode')
      || this.hasCapability('light_temperature'))
    ) {
      await wrapAsyncWithRetry(this.readColorControlAttributes.bind(this));
    }

    // Override if needed
    if (typeof supportsColorTemperature === 'boolean') {
      this._supportsColorTemperature = supportsColorTemperature;
    }
    if (typeof supportsHueAndSaturation === 'boolean') {
      this._supportsHueAndSaturationOption = supportsHueAndSaturation;
    }

    // Register `onoff` and `dim` capabilities
    if (this.hasCapability('onoff')) {
      this.registerCapabilityListener('onoff', value => {
        return this.changeOnOff(value);
      });
    }
    if (this.hasCapability('dim')) {
      this.registerCapabilityListener('dim', (value, opts) => {
        return this.changeDimLevel(value, opts);
      });
    }

    // Register color related capabilities if device has one of the following
    if (this.hasCapability('light_hue')
      || this.hasCapability('light_saturation')
      || this.hasCapability('light_mode')
      || this.hasCapability('light_temperature')
    ) {
      await this.registerColorCapabilities({ zclNode });
    }

    this.log('ZigBeeLightDevice is initialized', {
      supportsHueAndSaturation: this.supportsHueAndSaturation,
      supportsColorTemperature: this.supportsColorTemperature,
      colorTemperatureRange: this.colorTemperatureRange,
    });
    

  }

  get supportsHueAndSaturation() {
    if (typeof this._supportsHueAndSaturationOption === 'boolean') {
      return this._supportsHueAndSaturationOption;
    }
    return !!((this.getStoreValue('colorCapabilities') || {}).hueAndSaturation);
  }

  get supportsColorTemperature() {
    if (typeof this._supportsColorTemperature === 'boolean') {
      return this._supportsColorTemperature;
    }
    return !!((this.getStoreValue('colorCapabilities') || {}).colorTemperature);
  }

  get colorTemperatureRange() {
    return {
      min: this.getStoreValue('colorTempMin'),
      max: this.getStoreValue('colorTempMax'),
    };
  }

  get onOffCluster() {
    const onOffClusterEndpoint = this.getClusterEndpoint(CLUSTER.ON_OFF);
    if (onOffClusterEndpoint === null) throw new Error('missing_on_off_cluster');
    return this.zclNode.endpoints[1].clusters.onOff;
  }

  get colorControlCluster() {
    const colorControlEndpoint = this.getClusterEndpoint(CLUSTER.COLOR_CONTROL);
    if (colorControlEndpoint === null) throw new Error('missing_color_control_cluster');
    return this.zclNode.endpoints[1].clusters['colorControl'];
  }

  get levelControlCluster() {
    const levelControlClusterEndpoint = this.getClusterEndpoint(CLUSTER.LEVEL_CONTROL);
    if (levelControlClusterEndpoint === null) throw new Error('missing_level_control_cluster');
    return this.zclNode.endpoints[1].clusters.levelControl;
  }

  async changeOnOff(onoff) {
    this.log('changeOnOff() →', onoff);
    return this.onOffCluster[onoff ? 'setOn' : 'setOff']()
      .then(async result => {
        if (onoff === false) {
          this.setCapabilityValue('dim', 0).catch(this.error); // Set dim to zero when turned off
        } else if (onoff) {
          // Wait for a little while, some devices do not directly update their currentLevel
          wait(1000)
            .then(async () => {
              // Get current level attribute to update dim level
              const { currentLevel } = await this.levelControlCluster.readAttributes([
                CURRENT_LEVEL,
              ]);
              this.debug('changeOnOff() →', onoff, { currentLevel });
              // Always set dim to 0.01 or higher since bulb is turned on
              await this.setCapabilityValue('dim', Math.max(0.01, currentLevel / MAX_DIM)).catch(this.error);
            })
            .catch(err => {
              this.error('Error: could not update dim capability value after `onoff` change', err);
            });
        }
        return result;
      });
  }

  async changeDimLevel(dim, opts = {}) {
    this.log('changeDimLevel() →', dim);

    const moveToLevelWithOnOffCommand = {
      level: Math.round(dim * MAX_DIM),
      transitionTime: calculateLevelControlTransitionTime(opts),
    };

    // Execute dim
    this.debug('changeDimLevel() → ', dim, moveToLevelWithOnOffCommand);
    return this.levelControlCluster.moveToLevelWithOnOff(moveToLevelWithOnOffCommand)
      .then(async result => {
        // Update onoff value
        if (dim === 0) {
          this.setCapabilityValue('onoff', false).catch(this.error);
        } else if (this.getCapabilityValue('onoff') === false && dim > 0) {
          this.setCapabilityValue('onoff', true).catch(this.error);
        }
        return result;
      });
  }

  async changeColorTemperature(temperature, opts = {}) {
    this.log('changeColorTemperature() →', temperature);

    // Determine value with fallback to current light_saturation capability value or 1
    if (typeof temperature !== 'number') {
      if (typeof this.getCapabilityValue('light_temperature') === 'number') {
        temperature = this.getCapabilityValue('light_temperature');
      } else {
        temperature = 1;
      }
    }

    // Update light_mode capability if necessary
    if (this.hasCapability('light_mode')
      && this.getCapabilityValue('light_mode') !== 'temperature') {
      await this.setCapabilityValue('light_mode', 'temperature').catch(this.error);
    }

    // Not all devices support moveToColorTemperature
    if (this.supportsColorTemperature) {
      // Map color temperature based on provided min max values
      const { min, max } = this.colorTemperatureRange;
      const colorTemperature = Math.round(
        mapValueRange(0, 1, min, max, temperature),
      );

      // Execute move to color temperature command
      const moveToColorTemperatureCommand = {
        colorTemperature,
        transitionTime: calculateColorControlTransitionTime(opts),
      };
      this.debug(`changeColorTemperature() → ${temperature} →`, moveToColorTemperatureCommand);
      return this.colorControlCluster.moveToColorTemperature(moveToColorTemperatureCommand);
    }

    this.error('Warning: this device does not support \'moveToColorTemperature\', it should'
      + ' not have the \'light_temperature\' capability');

    // Calculate fake temperature range
    const { hue, saturation, value } = mapTemperatureToHueSaturation(temperature);

    // Convert HSV to CIE
    const { x, y } = convertHSVToCIE({
      hue,
      saturation,
      value, // || this.getCapabilityValue('dim'),
    });

    // Execute move to color command
    const moveToColorCommand = {
      colorX: x * CIE_MULTIPLIER,
      colorY: y * CIE_MULTIPLIER,
      transitionTime: calculateColorControlTransitionTime(opts),
    };
    this.debug(`changeColorTemperature() → ${temperature} →`, moveToColorCommand);
    return this.colorControlCluster.moveToColor(moveToColorCommand);
  }




  async registerColorCapabilities({ zclNode }) {
    // Register debounced capabilities
    const groupedCapabilities = [];
    if (this.hasCapability('light_hue')) {
      groupedCapabilities.push(lightHueCapabilityDefinition);
    }
    if (this.hasCapability('light_saturation')) {
      groupedCapabilities.push(lightSaturationCapabilityDefinition);
    }
    if (this.hasCapability('light_temperature')) {
      groupedCapabilities.push(lightTemperatureCapabilityDefinition);
    }
    if (this.hasCapability('light_mode')) {
      groupedCapabilities.push(lightModeCapabilityDefinition);
    }

    // Register multiple capabilities, they will be debounced when one of them is called
    // eslint-disable-next-line consistent-return
    this.registerMultipleCapabilities(groupedCapabilities, (valueObj, optsObj) => {
      const lightHueChanged = typeof valueObj.light_hue === 'number';
      const lightSaturationChanged = typeof valueObj.light_saturation === 'number';
      const lightTemperatureChanged = typeof valueObj.light_temperature === 'number';
      const lightModeChanged = typeof valueObj.light_mode === 'string';

      this.log('capabilities changed', {
        lightHueChanged, lightSaturationChanged, lightTemperatureChanged, lightModeChanged,
      });

      // If a color capability changed or light mode was changed to color, change the color
      if (lightHueChanged || lightSaturationChanged || (lightModeChanged && valueObj.light_mode === 'color')) {
        return this.changeColor(
          { hue: valueObj.light_hue, saturation: valueObj.light_saturation },
          { ...optsObj.light_saturation, ...optsObj.light_hue },
        ).catch(err => {
          if (err && err.message && err.message.includes('FAILURE')) {
            throw new Error('Make sure the device is turned on before changing its color.');
          }
          throw err;
        });
      }

      // If the light temperature was changed or the light mode was changed to temperature,
      // change the temperature
      if (lightTemperatureChanged || (lightModeChanged && valueObj.light_mode === 'temperature')) {
        return this.changeColorTemperature(
          valueObj.light_temperature,
          { ...optsObj.light_temperature },
        ).catch(err => {
          if (err && err.message && err.message.includes('FAILURE')) {
            throw new Error('Make sure the device is turned on before changing its color temperature.');
          }
          throw err;
        });
      }
    });
  }


  /**
   * Read colorControl cluster attributes needed in order to operate the device properly.
   * @returns {Promise<T>}
   */
  async readColorControlAttributes() {
    this.log('readColorControlAttributes()');
    return this.colorControlCluster.readAttributes([
      'colorCapabilities', 'colorTemperatureMireds', 'colorTempPhysicalMinMireds',
      'colorTempPhysicalMaxMireds', 'currentHue', 'currentSaturation', 'colorMode', 'currentX',
      'currentY',
    ])
      .then(async ({
        colorCapabilities, colorTemperatureMireds, colorTempPhysicalMinMireds,
        colorTempPhysicalMaxMireds, currentHue, currentSaturation, colorMode, currentX, currentY,
      }) => {
        // Make sure not undefined
        colorCapabilities = colorCapabilities || {};

        // Store all properties
        await this.setStoreValue('colorCapabilities', {
          hueAndSaturation: colorCapabilities.hueAndSaturation,
          enhancedHue: colorCapabilities.enhancedHue,
          colorLoop: colorCapabilities.colorLoop,
          xy: colorCapabilities.xy,
          colorTemperature: colorCapabilities.colorTemperature,
        });

        await this.setStoreValue('colorTempMin', colorTempPhysicalMinMireds);
        await this.setStoreValue('colorTempMax', colorTempPhysicalMaxMireds);
        await this.setStoreValue('colorClusterConfigured', true);

        this._supportsColorTemperature = colorCapabilities.colorTemperature;
        this._supportsHueAndSaturationOption = colorCapabilities.hueAndSaturation;

        this.log('read configuration attributes', {
          colorCapabilities,
          colorTemperatureMireds,
          colorTempPhysicalMinMireds,
          colorTempPhysicalMaxMireds,
          currentHue,
          currentSaturation,
          colorMode,
          currentX,
          currentY,
        });
      })
      .catch(err => {
        this.error('Error: could not read color control attributes', err);
      });
  }

  /**
 * Read colorControl cluster attributes needed in order to operate the device properly.
 * @returns {Promise<T>}
 */
  async readLevelContorlAttributes() {
    this.log('readLevelContorlAttributes()');
    return this.levelControlCluster.readAttributes([
      'currentLevel', 'remainingTime', 'onOffTransitionTime',
      'onLevel', 'onTransitionTime', 'offTransitionTime', 'defaultMoveRate'
    ])
      .then(async ({
        currentLevel, remainingTime, onOffTransitionTime,
        onLevel, onTransitionTime, offTransitionTime, defaultMoveRate
      }) => {

        // Store all properties

        await this.setStoreValue('currentLevel', currentLevel);
        await this.setStoreValue('remainingTime', remainingTime);
        await this.setStoreValue('onOffTransitionTime', onOffTransitionTime);
        await this.setStoreValue('onLevel', onLevel);
        await this.setStoreValue('onTransitionTime', onTransitionTime);
        await this.setStoreValue('offTransitionTime', offTransitionTime);
        await this.setStoreValue('defaultMoveRate', defaultMoveRate);

        this.log('read configuration attributes', {
          currentLevel,
          remainingTime,
          onOffTransitionTime,
          onLevel,
          onTransitionTime,
          offTransitionTime,
          defaultMoveRate
        });
      })
      .catch(err => {
        this.error('Error: could not read level control attributes', err);
      });
  }

  async changeColor({ hue, saturation, value }, opts = {}) {
    this.log('changeColor() →', { hue, saturation, value });

    // Determine value with fallback to current light_saturation capability value or 1
    if (typeof saturation !== 'number') {
      if (typeof this.getCapabilityValue('light_saturation') === 'number') {
        saturation = this.getCapabilityValue('light_saturation');
      } else {
        saturation = 1;
      }
    }

    // Determine value with fallback to current light_saturation capability value or 1
    if (typeof hue !== 'number') {
      if (typeof this.getCapabilityValue('light_hue') === 'number') {
        hue = this.getCapabilityValue('light_hue');
      } else {
        hue = 1;
      }
    }

    // Update light_mode capability if necessary
    if (this.hasCapability('light_mode'
      && this.getCapabilityValue('light_mode') !== 'color')) {
        this.log('qweqweqeqeqqweqeq')
      await this.setCapabilityValue('light_mode', 'color').catch(this.error);
    }

    // If this device supports hue and saturation commands
    if (this.supportsHueAndSaturation) {
      // Execute move to hue and saturation command
      const moveToHueAndSaturationCommand = {
        hue: Math.round(hue * MAX_HUE),
        saturation: Math.round(saturation * MAX_SATURATION),
        transitionTime: calculateColorControlTransitionTime(opts),
      };
      this.debug('changeColor() → hue and saturation', moveToHueAndSaturationCommand);
      return this.colorControlCluster.moveToHueAndSaturation(moveToHueAndSaturationCommand);
    }

    // Determine value with fallback to current dim capability value or 1, value should never be
    // zero, this would result in colorX=0 and colorY=0 being sent to the device which makes
    // some bulbs flicker when turned on again.
    if (typeof value !== 'number') {
      value = this.getCapabilityValue('dim') || 1;
    }

    // Convert to CIE color space
    const { x, y } = convertHSVToCIE({ hue, saturation, value });

    // Execute move to color command
    const moveToColorCommand = {
      colorX: x * CIE_MULTIPLIER,
      colorY: y * CIE_MULTIPLIER,
      transitionTime: calculateColorControlTransitionTime(opts),
    };
    this.debug('changeColor() → hue', moveToColorCommand);
    return this.colorControlCluster.moveToColor(moveToColorCommand);

  }

  async onEndDeviceAnnounce() {
    // Try and get level control cluster
    let levelControlCluster;
    try {
      levelControlCluster = this.levelControlCluster;
      const { currentLevel } = await levelControlCluster.readAttributes(['currentLevel']);
      this.setCapabilityValue('dim', limitValue(currentLevel / 254, 0, 1)).catch(this.error);
      this.setCapabilityValue('onoff', limitValue(currentLevel > 0, 0, 1)).catch(this.error);
    } catch (err) {
      // Device does not support the level control cluster, skip
    }

    if (!levelControlCluster) {
      let onOffCluster;
      try {
        onOffCluster = this.onOffCluster;
        const { onOff } = await onOffCluster.readAttributes(['onOff']);
        this.setCapabilityValue('onoff', onOff).catch(this.error);
      } catch (err) {
        // Device does not support the onoff cluster, skip
      }
    }


    // Try and get color control cluster
    let colorControlCluster;
    try {
      colorControlCluster = this.colorControlCluster;
    } catch (err) {
      // Device does not support the color control cluster, skip
      return;
    }

    let colorControlAttributes;
    try {
      colorControlAttributes = await colorControlCluster.readAttributes([
        'currentSaturation', 'currentHue', 'colorMode', 'colorTemperatureMireds',
      ]);
      this.log('onEndDeviceAnnounce → read color control attributes', colorControlAttributes);
    } catch (err) {
      this.error('onEndDeviceAnnounce → Error: failed to read color control attributes', err);
      return;
    }

    const {
      currentSaturation,
      currentHue,
      colorMode,
      colorTemperatureMireds,
    } = colorControlAttributes;

    // If device supports hue and saturation fetch it and update the capability values
    if (this.supportsHueAndSaturation && typeof currentHue === 'number' && typeof currentSaturation === 'number') {
      await this.setCapabilityValue('light_hue', limitValue(currentHue / MAX_HUE, 0, 1)).catch(this.error);
      await this.setCapabilityValue('light_saturation', limitValue(currentSaturation / MAX_SATURATION, 0, 1)).catch(this.error);
    }

    // Determine the light_mode
    if (this.hasCapability('light_mode')) {
      await this.setCapabilityValue('light_mode', colorMode === 'colorTemperatureMireds' ? 'temperature' : 'color').catch(this.error);
    }

    // If device supports color temperature and current color temperature is provided
    if (this.supportsColorTemperature && typeof colorTemperatureMireds === 'number') {
      await this.setCapabilityValue('light_temperature', mapValueRange(
        this.getStoreValue('colorTempMin'),
        this.getStoreValue('colorTempMax'),
        0,
        1,
        colorTemperatureMireds,
      )).catch(this.error);
    }
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log('Smart Color Bulb ZL1 has been added');
  }


  async onRenamed(name) {
    this.log('Smart Color Bulb ZL1 was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('Smart Color Bulb ZL1 has been deleted');
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys == "start_up_on_off") {
      if (newSettings[changedKeys] == "off") {
        this.zclNode.endpoints[1].clusters["onOff"].writeAttributes({ startUpOnOff: 0 }).catch(err => { this.error(err) })
        console.log("Start Up On/Off is OFF")

      }
      else if (newSettings[changedKeys] == "on") {
        this.zclNode.endpoints[1].clusters["onOff"].writeAttributes({ startUpOnOff: 1 }).catch(err => { this.error(err) })
        console.log("Start Up On/Off is ON")

      }
      else if (newSettings[changedKeys] == "toggle") {
        this.zclNode.endpoints[1].clusters["onOff"].writeAttributes({ startUpOnOff: 2 }).catch(err => { this.error(err) })
        console.log("Start Up On/Off is TOGGLE")

      }
      else if (newSettings[changedKeys] == "previous") {
        this.zclNode.endpoints[1].clusters["onOff"].writeAttributes({ startUpOnOff: 255 }).catch(err => { this.error(err) })
        console.log("Start Up On/Off is PREVIOUS")
      }
    }
  }
}

module.exports = colorBulbZL1;
