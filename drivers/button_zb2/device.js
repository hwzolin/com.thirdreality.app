'use strict';

const { ZigBeeDevice } = require("homey-zigbeedriver");
const { CLUSTER } = require("zigbee-clusters");

var flag1;
var flag2;
var flag3;

function startSleep1(ms) {

  return new Promise(resolve => {
    flag1 = setTimeout(
      () => resolve(), ms)
  })
}


function cancelSleep1() {
  clearTimeout(flag1);
}

function startSleep2(ms) {

  return new Promise(resolve => {
    flag2 = setTimeout(
      () => resolve(), ms)
  })
}


function cancelSleep2() {
  clearTimeout(flag2);
}

function startSleep3(ms) {

  return new Promise(resolve => {
    flag3 = setTimeout(
      () => resolve(), ms)
  })
}


function cancelSleep3() {
  clearTimeout(flag3);
}



module.exports = class ButtonZB2 extends ZigBeeDevice {

  /**
   * onInit is called when the device is initialized.
   */
  async onNodeInit({ zclNode }) {
    try {
      this.log('Button has been initialized');
      this.registerCapability("measure_battery", CLUSTER.POWER_CONFIGURATION);

      await this.configAttributeReport()


      await zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME].on('attr.batteryPercentageRemaining', this.onBatteryPercentageRemainingAttributeReport.bind(this));


      await zclNode.endpoints[1].clusters[CLUSTER.MULTI_STATE_INPUT.NAME].on('attr.presentValue', (value) => this.updateMultiStateInputPresentValue(1, value));
      await zclNode.endpoints[2].clusters[CLUSTER.MULTI_STATE_INPUT.NAME].on('attr.presentValue', (value) => this.updateMultiStateInputPresentValue(2, value));
      await zclNode.endpoints[3].clusters[CLUSTER.MULTI_STATE_INPUT.NAME].on('attr.presentValue', (value) => this.updateMultiStateInputPresentValue(3, value));


    } catch (error) {
      this.log(error)
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


  async displayButtonStatus(ep, getPresentValue) {

    const getep = ep
    if (getep == 1) {
      if (getPresentValue === 0) {
        this.setCapabilityValue("third_reality_three_button_1_capability", "Long Press")
        this.driver.triggerButton1LongPress(this)
      }
      else if (getPresentValue === 1) {
        this.setCapabilityValue("third_reality_three_button_1_capability", "Press")
        this.driver.triggerButton1SinglePress(this)
      }
      else if (getPresentValue === 2) {
        this.setCapabilityValue("third_reality_three_button_1_capability", "Double Press")
        this.driver.triggerButton1DoublePress(this)
      }
      else if (getPresentValue === 255) {
        this.setCapabilityValue("third_reality_three_button_1_capability", "Release")
        this.driver.triggerButton1Release(this)
      }
    }
    else if (getep == 2) {
      if (getPresentValue === 0) {
        this.setCapabilityValue("third_reality_three_button_2_capability", "Long Press")
        this.driver.triggerButton2LongPress(this)
      }
      else if (getPresentValue === 1) {
        this.setCapabilityValue("third_reality_three_button_2_capability", "Press")
        this.driver.triggerButton2SinglePress(this)
      }
      else if (getPresentValue === 2) {
        this.setCapabilityValue("third_reality_three_button_2_capability", "Double Press")
        this.driver.triggerButton2DoublePress(this)
      }
      else if (getPresentValue === 255) {
        this.setCapabilityValue("third_reality_three_button_2_capability", "Release")
        this.driver.triggerButton2Release(this)
      }
    }
    else {
      if (getPresentValue === 0) {
        this.setCapabilityValue("third_reality_three_button_3_capability", "Long Press")
        this.driver.triggerButton3LongPress(this)
      }
      else if (getPresentValue === 1) {
        this.setCapabilityValue("third_reality_three_button_3_capability", "Press")
        this.driver.triggerButton3SinglePress(this)
      }
      else if (getPresentValue === 2) {
        this.setCapabilityValue("third_reality_three_button_3_capability", "Double Press")
        this.driver.triggerButton3DoublePress(this)
      }
      else if (getPresentValue === 255) {
        this.setCapabilityValue("third_reality_three_button_3_capability", "Release")
        this.driver.triggerButton3Release(this)
      }
    }

  }


  async updateMultiStateInputPresentValue(ep, getPresentValue) {

    this.log("getep: ", ep)
    this.log("getPresentValue: ", getPresentValue)
    if (ep == 1) {
      if (flag1) {
        cancelSleep1()
      }
    }
    else if (ep == 2) {
      if (flag2) {
        cancelSleep2()
      }
    }
    else if (ep == 3) {
      if (flag3) {
        cancelSleep3()
      }
    }

    try {
      this.displayButtonStatus(ep, getPresentValue)
      if (ep == 1) {
        await startSleep1(3000)
        this.setCapabilityValue("third_reality_three_button_1_capability", "").catch(err => { this.log(err) })
      }
      else if (ep == 2) {
        await startSleep2(3000)
        this.setCapabilityValue("third_reality_three_button_2_capability", "").catch(err => { this.log(err) })

      }
      else if (ep == 3) {
        await startSleep3(3000)
        this.setCapabilityValue("third_reality_three_button_3_capability", "").catch(err => { this.log(err) })

      }



    } catch (error) {
      this.log(error)
    }


  }


  onBatteryPercentageRemainingAttributeReport(batteryPercentageRemaining) {
    const batteryThreshold = this.getSetting('batteryThreshold') || 20;
    this.log("measure_battery | powerConfiguration - batteryPercentageRemaining (%): ", batteryPercentageRemaining / 2);
    this.setCapabilityValue('measure_battery', batteryPercentageRemaining / 2).catch(err => { this.log(err) });
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log('ButtonZB2 has been added');
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
    this.log('ButtonZB2 settings where changed');
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name) {
    this.log('ButtonZB2 was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('ButtonZB2 has been deleted');
  }

};
