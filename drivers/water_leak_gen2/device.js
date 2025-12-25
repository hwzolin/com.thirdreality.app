'use strict';

const { ZigBeeDevice } = require("homey-zigbeedriver");
const { CLUSTER } = require("zigbee-clusters");

class WaterLeak_Gen2 extends ZigBeeDevice {

  /**
   * onInit is called when the device is initialized.
   */
  async onNodeInit({ zclNode }) {
    try {
      this.log('Water Leak Sensor has been initialized');
      this.registerCapability("measure_battery", CLUSTER.POWER_CONFIGURATION);
      this.registerCapability("alarm_water", CLUSTER.IAS_ZONE);

      await this.configAttributeReport()

      zclNode.endpoints[1].clusters.iasZone.zoneEnrollResponse({
        enrollResponseCode: 0, // Success
        zoneId: 0, // Choose a zone id
      }).catch(err => { this.error(err) });

      

      // alarm_motion & alarm_tamper
      zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME].onZoneStatusChangeNotification = payload => {
        this.onIASZoneStatusChangeNotification(payload);
      }

      // measure_battery // alarm_battery
      zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
        .on('attr.batteryPercentageRemaining', this.onBatteryPercentageRemainingAttributeReport.bind(this));
    } catch (err) {
      this.log(err)
    }

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

  onIASZoneStatusChangeNotification({ zoneStatus, extendedStatus, zoneId, delay, }) {
    this.log('IASZoneStatusChangeNotification received:', zoneStatus.alarm1, extendedStatus, zoneId, delay);
    this.setCapabilityValue('alarm_water', zoneStatus.alarm1).catch(err => { this.error(err) });
  }

  onBatteryPercentageRemainingAttributeReport(batteryPercentageRemaining) {
    const batteryThreshold = this.getSetting('batteryThreshold') || 20;
    this.log("measure_battery | powerConfiguration - batteryPercentageRemaining (%): ", batteryPercentageRemaining / 2);
    this.setCapabilityValue('measure_battery', batteryPercentageRemaining / 2).catch(err => { this.error(err) })
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log('WaterLeak Sensor Gen2 has been added');
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
    this.log('WaterLeak Sensor Gen2 settings where changed');
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name) {
    this.log('WaterLeak Sensor Gen2 was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('WaterLeak Sensor Gen2 has been deleted');
  }

}

module.exports = WaterLeak_Gen2;
