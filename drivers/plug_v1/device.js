'use strict';


const { ZigBeeDevice } = require("homey-zigbeedriver");
const { CLUSTER, Cluster } = require("zigbee-clusters");
const PlugOnOffCluster = require("../../lib/startUpOnOffSpecificCluster")
const PlugPrivateCluster = require("../../lib/plugPrivateCluster")

Cluster.addCluster(PlugOnOffCluster)
Cluster.addCluster(PlugPrivateCluster)

class Plug extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    try {
      this.registerCapability("onoff", CLUSTER.ON_OFF);
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


module.exports = Plug;
