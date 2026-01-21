'use strict';

const { Driver } = require('homey');

class MyDriver extends Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('MyDriver has been initialized');

    // Custom Flow triggers
    this.voc_less_than_trigger = this.homey.flow.getDeviceTriggerCard("voc_less_than")
    this.voc_less_than_trigger.registerRunListener(async (args, state) => {
      const set_voc_value = args.voc_value
      const current_voc_value = state.state.voc_value
      this.log('voc_less_than_trigger_set_voc_value: ',set_voc_value)
      this.log('current_voc_value: ',current_voc_value)
      return current_voc_value < set_voc_value
    });

    this.voc_greater_than_trigger = this.homey.flow.getDeviceTriggerCard("voc_greater_than")
    this.voc_greater_than_trigger.registerRunListener(async (args, state) => {
      const set_voc_value = args.voc_value
      const current_voc_value = state.state.voc_value
      this.log('voc_greater_than_trigger_set_voc_value: ',set_voc_value)
      this.log('current_voc_value: ',current_voc_value)
      return current_voc_value > set_voc_value
    });

  }

  async triggerVocLessThanTrigger(device,current_voc_value){
    const state = {'voc_value': current_voc_value}
    this.voc_less_than_trigger.trigger(device, {}, {state}).then(this.log).catch(this.error)
  }

  async triggerVocGreaterThanTrigger(device,current_voc_value){
    const state = {'voc_value': current_voc_value}
    this.voc_greater_than_trigger.trigger(device, {}, {state}).then(this.log).catch(this.error)
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
