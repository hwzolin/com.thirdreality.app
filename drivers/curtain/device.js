'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { Cluster, debug, CLUSTER } = require('zigbee-clusters');

class Curtain extends ZigBeeDevice {

  /**
   * onInit is called when the device is initialized.
   */
  async onNodeInit({ zclNode }) {
    try {
      this.log('MyDevice has been initialized');

      await this.registerCapability("measure_battery", CLUSTER.POWER_CONFIGURATION);

      // await this.registerCapability("windowcoverings_set", CLUSTER.WINDOW_COVERING);
      await this.registerCapability("windowcoverings_state", CLUSTER.WINDOW_COVERING);
      // console.log(await zclNode.endpoints[1].clusters)
      zclNode.endpoints[1].clusters[CLUSTER.WINDOW_COVERING.NAME].on("attr.currentPositionLiftPercentage", this.updatePostion.bind(this))
      this.registerCapabilityListener('windowcoverings_set', value => this.setPosition(zclNode, value));

      zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
        .on('attr.batteryPercentageRemaining', this.onBatteryPercentageRemainingAttributeReport.bind(this));
    } catch (err) {
      this.log(err)
    }

  }

  onBatteryPercentageRemainingAttributeReport(batteryPercentageRemaining) {
    const batteryThreshold = this.getSetting('batteryThreshold') || 20;
    this.log("measure_battery | powerConfiguration - batteryPercentageRemaining (%): ", batteryPercentageRemaining / 2);
    this.setCapabilityValue('measure_battery', batteryPercentageRemaining / 2).catch(this.error);
  }

  async updatePostion(position) {
    console.log("current curtain lift percentage is: ", (100 - position))
    this.setCapabilityValue('windowcoverings_set', (100 - position) / 100).catch(this.error);
  }

  async setPosition(zclNode, pos) {
    zclNode.endpoints[1].clusters[CLUSTER.WINDOW_COVERING.NAME].goToLiftPercentage({
      percentageLiftValue: (1 - pos) * 100
    })


  }
  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log('Curtain has been added');
  }


  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name) {
    this.log('Curtain was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('Curtain has been deleted');
  }

}

module.exports = Curtain;
