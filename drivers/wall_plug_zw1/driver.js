'use strict';

const { Driver } = require('homey');

class MyDriver extends Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    // Custom Flow triggers
    this._turn_on_bottom_trigger = this.homey.flow.getDeviceTriggerCard("wall_zw1_turn_on_bottom");
    this._turn_on_top_trigger = this.homey.flow.getDeviceTriggerCard("wall_zw1_turn_on_top");
    this._turn_off_bottom_trigger = this.homey.flow.getDeviceTriggerCard("wall_zw1_turn_off_bottom");
    this._turn_off_top_trigger = this.homey.flow.getDeviceTriggerCard("wall_zw1_turn_off_top");

    // Custom Flow actions
    this._turn_on_bottom_action = this.homey.flow.getActionCard("wall_zw1_turn_on_bottom");
    this._turn_on_top_action = this.homey.flow.getActionCard("wall_zw1_turn_on_top");
    this._turn_off_bottom_action = this.homey.flow.getActionCard("wall_zw1_turn_off_bottom");
    this._turn_off_top_action = this.homey.flow.getActionCard("wall_zw1_turn_off_top");
  }

  triggerTurnOnBottomSwitch(device){
    this._turn_on_bottom_trigger.trigger(device).then(this.log).catch(this.error)
  }

  triggerTurnOnTopSwitch(device){
    this._turn_on_top_trigger.trigger(device).then(this.log).catch(this.error)
  }

  triggerTurnOffBottomSwitch(device){
    this._turn_off_bottom_trigger.trigger(device).then(this.log).catch(this.error)
  }

  triggerTurnOffTopSwitch(device){
    this._turn_off_top_trigger.trigger(device).then(this.log).catch(this.error)
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

}

module.exports = MyDriver;
