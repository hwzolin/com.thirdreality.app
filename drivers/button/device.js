'use strict';

const { ZigBeeDevice } = require("homey-zigbeedriver");
const { CLUSTER } = require("zigbee-clusters");


var flag;

function startSleep(ms) {

  return new Promise(resolve => {
    flag = setTimeout(
      () => resolve(), ms)
  })
}


function cancelSleep() {
  clearTimeout(flag);
}


class Button extends ZigBeeDevice {

  /**
   * onInit is called when the device is initialized.
   */
  async onNodeInit({ zclNode }) {
    try {
      this.log('Button has been initialized');


      if (this.getClusterEndpoint(CLUSTER.MULTI_STATE_INPUT)) {
        zclNode.endpoints[this.getClusterEndpoint(CLUSTER.MULTI_STATE_INPUT)].clusters[CLUSTER.MULTI_STATE_INPUT.NAME]
          .on('attr.presentValue', this.onGetMultiStateInputPresentValueAttributeReport.bind(this));
      }



      if (this.getClusterEndpoint(CLUSTER.POWER_CONFIGURATION)) {
        zclNode.endpoints[this.getClusterEndpoint(CLUSTER.POWER_CONFIGURATION)].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
          .on('attr.batteryPercentageRemaining', this.onBatteryPercentageRemainingAttributeReport.bind(this));
      }
    } catch (error) {
      this.log(error)
    }
  }


  async displayButtonStatus(getPresentValue) {
    // this.log("flag   ", flag)
    if (getPresentValue === 0) {
      this.setCapabilityValue("third_reality_button_capability", "Long Press")
      this.driver.triggerButtonLongPress(this)
    }
    else if (getPresentValue === 1) {
      this.setCapabilityValue("third_reality_button_capability", "Press")
      this.driver.triggerButtonSinglePress(this)
    }
    else if (getPresentValue === 2) {
      this.setCapabilityValue("third_reality_button_capability", "Double Press")
      this.driver.triggerButtonDoublePress(this)
    }
    else if (getPresentValue === 255) {
      this.setCapabilityValue("third_reality_button_capability", "Release")
      this.driver.triggerButtonRelease(this)
    }

    await startSleep(3000)
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log('Button has been added');
  }

  async onGetMultiStateInputPresentValueAttributeReport(presentValue) {
    var getPresentValue = presentValue
    this.log("Button present value is: ", String(presentValue))

    if (flag) {
      cancelSleep()
    }

    try {
      await this.displayButtonStatus(getPresentValue)
      this.setCapabilityValue("third_reality_button_capability", "")
    } catch (error) {
      this.log(error)
    }
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
    this.log('Button settings where changed');
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name) {
    this.log('Button was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('Button has been deleted');
  }

}

module.exports = Button;
