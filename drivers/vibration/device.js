'use strict';

const { ZigBeeDevice } = require("homey-zigbeedriver");
const { CLUSTER } = require("zigbee-clusters");

class VibrationSensor extends ZigBeeDevice {

  /**
   * onInit is called when the device is initialized.
   */
  async onNodeInit({ zclNode }) {
    try {
      this.log('Vibration Sensor has been initialized');
      if (this.getClusterEndpoint(CLUSTER.IAS_ZONE)) {
        zclNode.endpoints[this.getClusterEndpoint(CLUSTER.IAS_ZONE)].clusters[CLUSTER.IAS_ZONE.NAME].onZoneStatusChangeNotification = payload => {
          this.onIASZoneStatusChangeNotification(payload)
        };
      }
      if (this.getClusterEndpoint(CLUSTER.POWER_CONFIGURATION)) {
        zclNode.endpoints[this.getClusterEndpoint(CLUSTER.POWER_CONFIGURATION)].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
          .on('attr.batteryPercentageRemaining', this.onBatteryPercentageRemainingAttributeReport.bind(this));
      }
    } catch (err) {
      this.log(err)
    }
  }


  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log('Vibration Sensor has been added');
  }

  onIASZoneStatusChangeNotification({ zoneStatus, extendedStatus, zoneId, delay, }) {
    this.log('IASZoneStatusChangeNotification received:', zoneStatus, extendedStatus, zoneId, delay);
    this.log('zoneStatus', zoneStatus.alarm1);
    this.setCapabilityValue('alarm_generic', zoneStatus.alarm1).catch(this.error);
  }

  onBatteryPercentageRemainingAttributeReport(batteryPercentageRemaining) {
    const batteryThreshold = this.getSetting('batteryThreshold') || 20;
    this.log("measure_battery | powerConfiguration - batteryPercentageRemaining (%): ", batteryPercentageRemaining / 2);
    this.setCapabilityValue('measure_battery', batteryPercentageRemaining / 2).catch(this.error);
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
    this.log('Vibration Sensor settings where changed');
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name) {
    this.log('Vibration Sensor was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('Vibration Sensor has been deleted');
  }

}

module.exports = VibrationSensor;
