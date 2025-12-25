'use strict';

const { ZigBeeDevice } = require("homey-zigbeedriver");
const { CLUSTER, Cluster } = require("zigbee-clusters");
const PlugOnOffCluster = require("../../lib/startUpOnOffSpecificCluster")
const PlugPrivateCluster = require("../../lib/plugPrivateCluster")

Cluster.addCluster(PlugOnOffCluster)
Cluster.addCluster(PlugPrivateCluster)

class Plug_702_UK extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {

    try {
      this.registerCapability("onoff", CLUSTER.ON_OFF);

      this.setCapabilityValue('third_reality_reset_summation_delivered_capability', false)

      // const a = await this.zclNode.endpoints[1].clusters[CLUSTER.BASIC.NAME].readAttributes(["manufacturerName", "swBuildId"]).catch(error => { this.log(error) })
      // this.log("a: ",a)

      this.registerCapabilityListener('third_reality_reset_summation_delivered_capability', async (value) => {
        if (value === true) {
          await this.zclNode.endpoints[1].clusters["plugPrivateCluster"].writeAttributes({ reset_summation_delivered: 1 }).catch(err => { this.error(err) })
        }

      })

      await this.zclNode.endpoints[1].clusters["onOff"]
        .on('attr.onOff', this.setOnOffState.bind(this));

      await this.zclNode.endpoints[1].clusters[CLUSTER.ELECTRICAL_MEASUREMENT.NAME]
        .on('attr.activePower', this.setPowerValue.bind(this));

      await this.zclNode.endpoints[1].clusters[CLUSTER.ELECTRICAL_MEASUREMENT.NAME]
        .on('attr.rmsVoltage', this.setVoltageValue.bind(this));

      await this.zclNode.endpoints[1].clusters[CLUSTER.ELECTRICAL_MEASUREMENT.NAME]
        .on('attr.rmsCurrent', this.setCurrentValue.bind(this));

      await this.zclNode.endpoints[1].clusters[CLUSTER.METERING.NAME]
        .on('attr.currentSummationDelivered', this.setMeteringValue.bind(this));

      // this.registerCapability('meter_power',CLUSTER.METERING,{
      //   reportParser: (value) => {
      //     this.log("meter_power: ", value / 1000)
      //     return value / 1000;
      //   },
      //   getOpts: {
      //     getOnStart: false
      //   }
      // })

      // this.registerCapability('measure_power', CLUSTER.ELECTRICAL_MEASUREMENT, {
      //   reportParser: value => {
      //     // return (value * this.measureOffset)/100;
      //     return value / 10;
      //   },
      //   getOpts: {
      //     getOnStart: false
      //   }
      // });
      // // this.printNode();

      // this.registerCapability('measure_current', CLUSTER.ELECTRICAL_MEASUREMENT, {
      //   reportParser: value => {
      //     return value / 1000;
      //   },
      //   getOpts: {
      //     getOnStart: false
      //   }
      // });

      // this.registerCapability('measure_voltage', CLUSTER.ELECTRICAL_MEASUREMENT, {
      //   reportParser: value => {
      //     return value / 10;
      //   },
      //   getOpts: {
      //     getOnStart: false
      //   }
      // });
    } catch (err) {
      this.log(err)
    }
  }

  setOnOffState(value){
    const onoff_state = value
    this.log(`this onoff state: ${onoff_state}`)
    this.setCapabilityValue('onoff', onoff_state)
  }

  setPowerValue(value) {
    const current_value = value / 10
    this.log(`this current value: ${current_value}`)
    this.setCapabilityValue('measure_power', current_value)
  }

  setVoltageValue(value) {
    const current_value = value / 10
    this.log(`this current value: ${current_value}`)
    this.setCapabilityValue('measure_voltage', current_value)
  }

  setCurrentValue(value) {
    const current_value = value / 1000
    this.log(`this current value: ${current_value}`)
    this.setCapabilityValue('measure_current', current_value)
  }

  setMeteringValue(value) {
    const current_value = value / 1000
    this.log(`this metering value: ${current_value}`)
    this.setCapabilityValue('meter_power', current_value)
  }


  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log("changedKeys: ", changedKeys)
    this.log("newSettings: ", newSettings)
    this.log("oldSettings: ", oldSettings)
    for (let changedKey of changedKeys) {
      this.log(`changedKey: ${changedKey}`)
      if (changedKey == "start_up_on_off") {
        if (newSettings[changedKey] == "0") {
          this.zclNode.endpoints[1].clusters["onOff"].writeAttributes({ startUpOnOff: 0 }).catch(err => { this.error(err) })
          console.log("Start Up On/Off is OFF")

        }
        else if (newSettings[changedKey] == "1") {
          this.zclNode.endpoints[1].clusters["onOff"].writeAttributes({ startUpOnOff: 1 }).catch(err => { this.error(err) })
          console.log("Start Up On/Off is ON")

        }
        else if (newSettings[changedKey] == "2") {
          this.zclNode.endpoints[1].clusters["onOff"].writeAttributes({ startUpOnOff: 2 }).catch(err => { this.error(err) })
          console.log("Start Up On/Off is TOGGLE")

        }
        else if (newSettings[changedKey] == "255") {
          this.zclNode.endpoints[1].clusters["onOff"].writeAttributes({ startUpOnOff: 255 }).catch(err => { this.error(err) })
          console.log("Start Up On/Off is PREVIOUS")
        }
      }
      else if (changedKey == "count_down_time") {
        const seconds = newSettings[changedKey]
        this.log("count_down_time: ", seconds)
        this.zclNode.endpoints[1].clusters["plugPrivateCluster"].writeAttributes({ count_down_time: seconds }).catch(err => { this.error(err) })
      }
    }
  }
}


module.exports = Plug_702_UK;
