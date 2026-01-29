'use strict';

const { ZigBeeDevice } = require("homey-zigbeedriver");
const { CLUSTER, Cluster } = require("zigbee-clusters");

class MotionR1 extends ZigBeeDevice {

  /**
   * onInit is called when the device is initialized.
   */
  async onNodeInit({ zclNode }) {

    try {
      this.registerCapability("measure_battery", CLUSTER.POWER_CONFIGURATION);
      this.registerCapability("alarm_motion", CLUSTER.IAS_ZONE);


      // this.printNode();
      // if (this.isFirstInit()) {
      //   await this.configureAttributeReporting([
      //     {
      //       endpointId: 1,
      //       cluster: CLUSTER.POWER_CONFIGURATION,
      //       attributeName: 'batteryPercentageRemaining',
      //       minInterval:0,
      //       maxInterval:65535,
      //       minChange:0
      //     },
      //     {
      //       endpointId: 1,
      //       cluster: CLUSTER.IAS_ZONE,
      //       attributeName: 'zoneStatus',
      //       minInterval:0,
      //       maxInterval:65535,
      //       minChange:0
      //     }
      //   ]).catch(this.error);
      // }

      zclNode.endpoints[1].clusters.iasZone.zoneEnrollResponse({
        enrollResponseCode: 0, // Success
        zoneId: 0, // Choose a zone id
      }).catch(this.error);

      // alarm_motion
      zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME].onZoneStatusChangeNotification = payload => {
        this.onIASZoneStatusChangeNotification(payload);
      }

      // measure_battery
      zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
        .on('attr.batteryPercentageRemaining', this.onBatteryPercentageRemainingAttributeReport.bind(this));


      // await this.configureAttributeReporting([
      //   {
      //     endpointId: 2,
      //     cluster: CLUSTER.coolDownTime,
      //     attributeName: 'coolDownTime',
      //     minInterval: 0,
      //     maxInterval: 300,
      //     minChange: 10,
      //   },
      // ]).catch(error=>this.log(error));

      // this.log(zclNode.endpoints[1].clusters)
      // const readCoolDownTime = zclNode.endpoints[1].clusters["coolDownTime"].configureReporting({
      //   coolDownTime:{}
      // }).catch(error=>this.log(error));
      // this.log(readCoolDownTime)
    } catch (err) {
      this.log(err)
    }

  }

  // setSetting(setting_name){
  //   this.log("aaaaa")
  //   this.log(setting_name)
  //   this.log(setting_value)
  //   // if (setting_name == "cooldown_time"){
  //   //   this.setSetting({
  //   //     cooldown_time: setting_value
  //   //   })
  //   // }

  // }


  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log('Motion Sensor R1 has been added');
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
    this.log('Motion Sensor R1 settings where changed');
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name) {
    this.log('Motion Sensor R1 was renamed');
  }


  onIASZoneStatusChangeNotification({ zoneStatus, extendedStatus, zoneId, delay, }) {
    this.log('IASZoneStatusChangeNotification received:', zoneStatus, extendedStatus, zoneId, delay)
    this.setCapabilityValue('alarm_motion', zoneStatus.alarm1).catch(this.error);
  }

  onBatteryPercentageRemainingAttributeReport(batteryPercentageRemaining) {
    const batteryThreshold = this.getSetting('batteryThreshold') || 20;
    this.log("measure_battery | powerConfiguration - batteryPercentageRemaining (%): ", batteryPercentageRemaining / 2)
    this.setCapabilityValue('measure_battery', batteryPercentageRemaining / 2).catch(this.error);
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('Motion Sensor R1 has been deleted');
  }

}

module.exports = MotionR1;
