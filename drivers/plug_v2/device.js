'use strict';

const { ZigBeeDevice } = require("homey-zigbeedriver");
const { CLUSTER, Cluster } = require("zigbee-clusters");
const PlugOnOffCluster = require("../../lib/startUpOnOffSpecificCluster")
const PlugPrivateCluster = require("../../lib/plugPrivateCluster")

Cluster.addCluster(PlugOnOffCluster)
Cluster.addCluster(PlugPrivateCluster)


class Plug_V2 extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    try {
      this.registerCapability("onoff", CLUSTER.ON_OFF)

      this.setCapabilityValue('third_reality_reset_summation_delivered_capability', false)

      this.registerCapabilityListener('third_reality_reset_summation_delivered_capability', async (value) => {
        if (value === true) {
          await this.zclNode.endpoints[1].clusters['plugPrivateCluster'].writeAttributes({ reset_summation_delivered: 1 }).catch(err => { this.log(err) })
        }

      })

      this.registerCapability('meter_power', CLUSTER.METERING, {
        reportParser: (value) => {
          this.log("meter_power: ", value / 3600000)
          return value / 3600000;
        },
        getOpts: {
          getOnStart: true,
          pollInterval: 240000
        }
      })

      this.registerCapability('measure_power', CLUSTER.ELECTRICAL_MEASUREMENT, {
        reportParser: value => {
          // return (value * this.measureOffset)/100;
          return value / 10;
        },
        getOpts: {
          getOnStart: true,
          pollInterval: this.minReportPower
        }
      });
      // this.printNode();

      this.registerCapability('measure_current', CLUSTER.ELECTRICAL_MEASUREMENT, {
        reportParser: value => {
          return value / 1000;
        },
        getOpts: {
          getOnStart: true,
          pollInterval: this.minReportCurrent
        }
      });

      this.registerCapability('measure_voltage', CLUSTER.ELECTRICAL_MEASUREMENT, {
        reportParser: value => {
          return value / 10;
        },
        getOpts: {
          getOnStart: true,
          pollInterval: this.minReportVoltage
        }
      });
    } catch (err) {
      this.log(err)
    }


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



module.exports = Plug_V2;
