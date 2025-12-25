'use strict';

const { ZigBeeDevice } = require("homey-zigbeedriver");
const { CLUSTER, Cluster } = require('zigbee-clusters');
const startUpOnOffCluster = require("../../lib/startUpOnOffSpecificCluster")
require('events').EventEmitter.defaultMaxListeners = 0;


const {
  wrapAsyncWithRetry
} = require('./util');

Cluster.addCluster(startUpOnOffCluster)

const MAX_HUE = 254;
const MAX_DIM = 254;
const MAX_SATURATION = 254;
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

    try {
      this.registerCapability("onoff", CLUSTER.ON_OFF);
      await this.zclNode.endpoints[1].clusters.levelControl.on("attr.currentLevel", currentLevel => {
        this.log("currentLevel: ", currentLevel)
        this.setCapabilityValue("dim", currentLevel / MAX_DIM).catch(this.error)
      })

      // await wrapAsyncWithRetry(this.readLevelContorlAttributes.bind(this));
      if (!this.getStoreValue('colorClusterConfigured')
        && (this.hasCapability('light_hue')
          || this.hasCapability('light_saturation')
          || this.hasCapability('light_mode')
          || this.hasCapability('light_temperature'))
      ) {
        await wrapAsyncWithRetry(this.readColorControlAttributes.bind(this));
      }


      if (this.hasCapability('light_hue')
        || this.hasCapability('light_saturation')
        || this.hasCapability('light_mode')
        || this.hasCapability('light_temperature')
      ) {
        await this.registerColorCapabilities({ zclNode });
      }

      if (this.hasCapability('dim')) {
        // this.setCapabilityValue('dim',this.zclNode.endpoints[1].clusters[CLUSTER.LEVEL_CONTROL.NAME].readAttributes['currentLevel'])
        this.registerCapabilityListener('dim', (value, opts) => {
          return this.changeDimLevel(value, opts);
        });
      }
    }
    catch (error) {
      this.log(error)
    }

  }


  get colorControlCluster() {
    const colorControlEndpoint = this.getClusterEndpoint(CLUSTER.COLOR_CONTROL);
    if (colorControlEndpoint === null) throw new Error('missing_color_control_cluster');
    return this.zclNode.endpoints[colorControlEndpoint].clusters['colorControl'];
  }

  get levelControlCluster() {
    const levelControlClusterEndpoint = this.getClusterEndpoint(CLUSTER.LEVEL_CONTROL);
    if (levelControlClusterEndpoint === null) throw new Error('missing_level_control_cluster');
    return this.zclNode.endpoints[levelControlClusterEndpoint].clusters.levelControl;
  }

  async changeDimLevel(dim, opts = {}) {
    this.log('changeDimLevel() →', dim);

    const moveToLevelWithOnOffCommand = {
      level: Math.round(dim * MAX_DIM),
      transitionTime: 65535
    };

    // Execute dim
    this.debug('changeDimLevel() → ', dim, moveToLevelWithOnOffCommand);
    return this.levelControlCluster.moveToLevelWithOnOff(moveToLevelWithOnOffCommand)
      .then(async result => {
        // Update onoff value
        if (dim === 0) {
          this.log("dim is 0")
          this.setCapabilityValue('onoff', false).catch(this.error);
        } else if (this.getCapabilityValue('onoff') === false && dim > 0) {
          this.log("dim is not 0")
          this.setCapabilityValue('onoff', true).catch(this.error);
        }
        this.zclNode.endpoints[1].clusters.levelControl.readAttributes(["currentLevel"])
        // Do not update onoff value
        // if (dim === 0) {
        //     this.log("dim is 0")
        //   } else if (this.getCapabilityValue('onoff') === false && dim > 0) {
        //     this.log("dim is not 0")
        //   }
        return result;
      });
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
    if (this.hasCapability('light_mode')) {
      groupedCapabilities.push(lightModeCapabilityDefinition);
    }
    if (this.hasCapability("light_temperature")) {
      groupedCapabilities.push(lightTemperatureCapabilityDefinition);
    }

    // Register multiple capabilities, they will be debounced when one of them is called
    // eslint-disable-next-line consistent-return
    this.registerMultipleCapabilities(groupedCapabilities, (valueObj, optsObj) => {
      const lightHueChanged = typeof valueObj.light_hue === 'number';
      const lightSaturationChanged = typeof valueObj.light_saturation === 'number';
      const lightModeChanged = typeof valueObj.light_mode === 'string';
      const lightTemperatureChanged = typeof valueObj.light_temperature == "number"

      this.log('capabilities changed', {
        lightHueChanged, lightSaturationChanged, lightModeChanged, lightTemperatureChanged
      });

      // If a color capability changed or light mode was changed to color, change the color
      if (lightHueChanged || lightSaturationChanged || (lightModeChanged && valueObj.light_mode === 'color')) {
        return this.changeColor(
          { hue: valueObj.light_hue, saturation: valueObj.light_saturation, value: null },
          { ...optsObj.light_saturation, ...optsObj.light_hue }
        ).catch(err => {
          if (err && err.message && err.message.includes('FAILURE')) {
            throw new Error('Make sure the device is turned on before changing its color.');
          }
          throw err;
        });
      }
      if (lightTemperatureChanged) {
        this.log(valueObj.light_temperature)
        return this.changeColorTemperature(
          { temperature: valueObj.light_temperature },
          { ...optsObj.light_temperature }
        ).catch(err => {
          if (err && err.message && err.message.includes('FAILURE')) {
            throw new Error('Make sure the device is turned on before changing its temperature.');
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



  async changeColorTemperature({ temperature }, opts = {}) {
    this.log('changeColorTemperature() →', { temperature })

    if (typeof temperature !== 'number') {
      if (typeof this.getCapabilityValue('light_temperature') === 'number') {
        temperature = this.getCapabilityValue('light_temperature');
      } else {
        temperature = 1;
      }
    }

    const moveToColorTemperatureCommand = {
      colorTemperature: 142 + Math.round(temperature * 312),
      transitionTime: 0
    };

    // Move to the specified hue and saturation
    this.log(moveToColorTemperatureCommand)
    await this.colorControlCluster.moveToColorTemperature(moveToColorTemperatureCommand).catch('changeColorTemperature() → failed to change temperature')

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

    // Determine value with fallback to current dim capability value or 1
    if (typeof value !== 'number') {
      value = this.getCapabilityValue('dim') || 1;
    }

    // Update light_mode capability if necessary
    if (this.hasCapability('light_mode'
      && this.getCapabilityValue('light_mode') !== 'color')) {
      await this.setCapabilityValue('light_mode', 'color').catch(this.error);
    }


    // Execute move to hue and saturation command
    const moveToHueAndSaturationCommand = {
      hue: Math.round(hue * MAX_HUE),
      saturation: Math.round(saturation * MAX_SATURATION),
      transitionTime: 0
    };

    this.debug('changeColor() → hue and saturation', moveToHueAndSaturationCommand);

    try {

      // Move to the specified hue and saturation
      await this.colorControlCluster.moveToHueAndSaturation(moveToHueAndSaturationCommand);
      const current_level_attr = await this.zclNode.endpoints[1].clusters.levelControl.readAttributes(["currentLevel"]).catch(err => { this.error(err) })
      const current_level = current_level_attr["currentLevel"]
      this.log("current_level: ", current_level)
      this.setCapabilityValue("dim", current_level / MAX_DIM).catch(err => this.error(err))

      return true;
    } catch (error) {
      // Log the error and return false
      this.error('changeColor() → failed to change color', error);
      return false;
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
