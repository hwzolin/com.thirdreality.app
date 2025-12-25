'use strict';

const { ZigBeeDevice } = require("homey-zigbeedriver");
const { CLUSTER } = require("zigbee-clusters");

module.exports = class airPressureSensor extends ZigBeeDevice {

  /**
   * onInit is called when the device is initialized.
   */
  async onNodeInit({ zclNode }) {
    this.log('Air Pressure Sensor has been initialized');
    this.registerCapability("measure_battery", CLUSTER.POWER_CONFIGURATION);
    this.registerCapability("measure_pressure", CLUSTER.PRESSURE_MEASUREMENT)

    await this.configAttributeReport()


    // measure_battery // alarm_battery
    zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
      .on('attr.batteryPercentageRemaining', this.onBatteryPercentageRemainingAttributeReport.bind(this));

    //measure_pressure
    zclNode.endpoints[1].clusters[CLUSTER.PRESSURE_MEASUREMENT.NAME]
      .on('attr.measuredValue', this.onMeasuredValueAttributeReport.bind(this));
  }

  async configAttributeReport() {
    
    await this.zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME].configureReporting({
      batteryPercentageRemaining: {
        minInterval: 900,
        maxInterval: 3600,
        minChange: 2
      }
    })
  }

  onBatteryPercentageRemainingAttributeReport(batteryPercentageRemaining) {
    const batteryThreshold = this.getSetting('batteryThreshold') || 20;
    this.log("measure_battery | powerConfiguration - batteryPercentageRemaining (%): ", batteryPercentageRemaining / 2);
    this.setCapabilityValue('measure_battery', batteryPercentageRemaining / 2).catch(this.error);
  }

  onMeasuredValueAttributeReport(measurePressureValue) {
    this.log("measurePressureValue: ", measurePressureValue)
    this.setCapabilityValue("measure_pressure", measurePressureValue).catch(error => { this.log(error) })
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log('Air Pressure Sensor has been added');
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
    this.log('Air Pressure Sensor settings where changed');
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name) {
    this.log('Air Pressure Sensor was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('Air Pressure Sensor has been deleted');
  }

};
