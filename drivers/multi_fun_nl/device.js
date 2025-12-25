'use strict';


const { ZigBeeDevice } = require("homey-zigbeedriver");
const { CLUSTER, Cluster } = require('zigbee-clusters');
const MultiFunNightLightMotionCluster = require('../../lib/MultiFunNightLightMotionSpecificCluster');
const startUpOnOffCluster = require("../../lib/startUpOnOffSpecificCluster")

Cluster.addCluster(MultiFunNightLightMotionCluster)
Cluster.addCluster(startUpOnOffCluster)

const MAX_HUE = 254;
const MAX_SATURATION = 254;
const lightHueCapabilityDefinition = {
  capabilityId: 'light_hue',
  cluster: CLUSTER.COLOR_CONTROL
};
const lightSaturationCapabilityDefinition = {
  capabilityId: 'light_saturation',
  cluster: CLUSTER.COLOR_CONTROL
};

class multiFunNightLight extends ZigBeeDevice {

  /**
   * onInit is called when the device is initialized.
   */
  async onNodeInit({ zclNode }) {
    try {
      this.registerCapability("onoff", CLUSTER.ON_OFF);
      this.registerCapability("dim", CLUSTER.LEVEL_CONTROL)
      this.registerCapability("measure_luminance", CLUSTER.ILLUMINANCE_MEASUREMENT)

      if (this.hasCapability('light_hue')
        || this.hasCapability('light_saturation')
        || this.hasCapability('light_mode')
      ) {
        await this.registerColorCapabilities({ zclNode });
      }

      await zclNode.endpoints[1].clusters["mFunNightLightMotion"].on("attr.zoneStatus", (zoneStatus) => this.onPrivateMotionValue(zoneStatus))


      await zclNode.endpoints[1].clusters["illuminanceMeasurement"]
        .on("attr.measuredValue", (measuredValue) => this.onIlluminanceMeasurementGet(measuredValue))
    } catch (err) {
      this.log(err)
    }


  }
  get colorControlCluster() {
    const colorControlEndpoint = this.getClusterEndpoint(CLUSTER.COLOR_CONTROL);
    if (colorControlEndpoint === null) throw new Error('missing_color_control_cluster');
    return this.zclNode.endpoints[colorControlEndpoint].clusters['colorControl'];
  }

  // Convert the obtained illuminance value
  async onIlluminanceMeasurementGet(value) {
    this.log("Get illuminance: ", value)
    const zigbee_illuminance = Math.round(10 ** ((value - 1) / 10000))
    this.log("Result illumincance for zigbee: ", zigbee_illuminance)
    this.setCapabilityValue("measure_luminance", zigbee_illuminance).catch(this.error)
  }

  async onPrivateMotionValue(value) {
    this.log("Night Light motion: ", value.alarm1)
    this.setCapabilityValue("alarm_motion", value.alarm1).catch(this.error)
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
    // if (this.hasCapability('light_mode')) {
    //   groupedCapabilities.push(lightModeCapabilityDefinition);
    // }

    // Register multiple capabilities, they will be debounced when one of them is called
    // eslint-disable-next-line consistent-return
    this.registerMultipleCapabilities(groupedCapabilities, (valueObj, optsObj) => {
      const lightHueChanged = typeof valueObj.light_hue === 'number';
      const lightSaturationChanged = typeof valueObj.light_saturation === 'number';
      const lightModeChanged = typeof valueObj.light_mode === 'string';

      this.log('capabilities changed', {
        lightHueChanged, lightSaturationChanged, lightModeChanged
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
    this.log('Multi-Function Night Light has been added');
  }

  /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Multi-Function Night Light settings where changed');
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name) {
    this.log('Multi-Function Night Light was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('Multi-Function Night Light has been deleted');
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys.includes("start_up_on_off")) {
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

module.exports = multiFunNightLight;
