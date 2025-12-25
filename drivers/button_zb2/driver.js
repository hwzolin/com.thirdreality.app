'use strict';

const Homey = require('homey');

module.exports = class MyDriver extends Homey.Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('MyDriver has been initialized');

    this.button_1_singlePress = this.homey.flow.getDeviceTriggerCard("three_button_1_press_single");
    this.button_1_doublepress = this.homey.flow.getDeviceTriggerCard("three_button_1_press_double");
    this.button_1_longpress = this.homey.flow.getDeviceTriggerCard("three_button_1_press_Long");
    this.button_1_release = this.homey.flow.getDeviceTriggerCard("three_button_1_release");
    this.button_2_singlePress = this.homey.flow.getDeviceTriggerCard("three_button_2_press_single");
    this.button_2_doublepress = this.homey.flow.getDeviceTriggerCard("three_button_2_press_double");
    this.button_2_longpress = this.homey.flow.getDeviceTriggerCard("three_button_2_press_Long");
    this.button_2_release = this.homey.flow.getDeviceTriggerCard("three_button_2_release");
    this.button_3_singlePress = this.homey.flow.getDeviceTriggerCard("three_button_3_press_single");
    this.button_3_doublepress = this.homey.flow.getDeviceTriggerCard("three_button_3_press_double");
    this.button_3_longpress = this.homey.flow.getDeviceTriggerCard("three_button_3_press_Long");
    this.button_3_release = this.homey.flow.getDeviceTriggerCard("three_button_3_release");

  }

  triggerButton1SinglePress(device) {
    this.button_1_singlePress.trigger(device).then(this.log).catch(this.error)
  }

  triggerButton1DoublePress(device) {
    this.button_1_doublepress.trigger(device).then(this.log).catch(this.error)
  }

  triggerButton1LongPress(device) {
    this.button_1_longpress.trigger(device).then(this.log).catch(this.error)
  }

  triggerButton1Release(device) {
    this.button_1_release.trigger(device).then(this.log).catch(this.error)
  }

  triggerButton2SinglePress(device) {
    this.button_2_singlePress.trigger(device).then(this.log).catch(this.error)
  }

  triggerButton2DoublePress(device) {
    this.button_2_doublepress.trigger(device).then(this.log).catch(this.error)
  }

  triggerButton2LongPress(device) {
    this.button_2_longpress.trigger(device).then(this.log).catch(this.error)
  }

  triggerButton2Release(device) {
    this.button_2_release.trigger(device).then(this.log).catch(this.error)
  }

  triggerButton3SinglePress(device) {
    this.button_3_singlePress.trigger(device).then(this.log).catch(this.error)
  }

  triggerButton3DoublePress(device) {
    this.button_3_doublepress.trigger(device).then(this.log).catch(this.error)
  }

  triggerButton3LongPress(device) {
    this.button_3_longpress.trigger(device).then(this.log).catch(this.error)
  }

  triggerButton3Release(device) {
    this.button_3_release.trigger(device).then(this.log).catch(this.error)
  }


  /**
   * onPairListDevices is called when a user is adding a device
   * and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
  async onPairListDevices() {
    return [
      // Example device data, note that `store` is optional
      // {
      //   name: 'My Device',
      //   data: {
      //     id: 'my-device',
      //   },
      //   store: {
      //     address: '127.0.0.1',
      //   },
      // },
    ];
  }

};
