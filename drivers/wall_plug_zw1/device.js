'use strict';

const { ZigBeeDevice } = require("homey-zigbeedriver");
const { CLUSTER, Cluster } = require("zigbee-clusters");
const PlugOnOffCluster = require("../../lib/startUpOnOffSpecificCluster")
const PlugPrivateCluster = require("../../lib/plugPrivateCluster")

Cluster.addCluster(PlugOnOffCluster)
Cluster.addCluster(PlugPrivateCluster)


class Wall_Plug_ZW1 extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    const _turned_on_left_condition = this.homey.flow.getConditionCard("wall_zw1_is_turned_on_bottom");
    const _turned_off_left_condition = this.homey.flow.getConditionCard("wall_zw1_is_turned_off_bottom");
    const _turned_on_right_condition = this.homey.flow.getConditionCard("wall_zw1_is_turned_on_top");
    const _turned_off_right_condition = this.homey.flow.getConditionCard("wall_zw1_is_turned_off_top");

    this.registerCapability("wall_plug_zw1_bottom_measure_current", CLUSTER.ELECTRICAL_MEASUREMENT)
    this.registerCapability("wall_plug_zw1_top_measure_current", CLUSTER.ELECTRICAL_MEASUREMENT)
    this.registerCapability("wall_plug_zw1_bottom_measure_power", CLUSTER.ELECTRICAL_MEASUREMENT)
    this.registerCapability("wall_plug_zw1_top_measure_power", CLUSTER.ELECTRICAL_MEASUREMENT)
    this.registerCapability("wall_plug_zw1_bottom_measure_voltage", CLUSTER.ELECTRICAL_MEASUREMENT)
    this.registerCapability("wall_plug_zw1_top_measure_voltage", CLUSTER.ELECTRICAL_MEASUREMENT)
    this.registerCapability("wall_plug_zw1_bottom_meter_power", CLUSTER.METERING)
    this.registerCapability("wall_plug_zw1_top_meter_power", CLUSTER.METERING)

    await this.configAttributeReport(1)
    await this.configAttributeReport(2)

    await this.readEndpointOnOffState(1)
    await this.readEndpointOnOffState(2)

    await this.updatePowerCapabilitiesValue(1)
    await this.updatePowerCapabilitiesValue(2)


    await zclNode.endpoints[1].clusters[CLUSTER.ON_OFF.NAME].on("attr.onOff", (onOffState) => {
      if (onOffState === true) {
        this.driver.triggerTurnOnBottomSwitch(this)
      }
      else {
        this.driver.triggerTurnOffBottomSwitch(this)
      }
    })

    await zclNode.endpoints[2].clusters[CLUSTER.ON_OFF.NAME].on("attr.onOff", (onOffState) => {
      if (onOffState === true) {
        this.driver.triggerTurnOnTopSwitch(this)
      }
      else {
        this.driver.triggerTurnOffTopSwitch(this)
      }
    })

    this.registerCapabilityListener('wall_plug_zw1_bottom_switch_capability', async (value) => {
      this.log("wall_plug_zw1_bottom_switch_capability value: ", value)
      if (value === true) {
        await this.zclNode.endpoints[1].clusters['onOff'].setOn().catch(err => { this.error(err) })
      }
      else {
        await this.zclNode.endpoints[1].clusters['onOff'].setOff().catch(err => { this.error(err) })
      }

    })

    this.registerCapabilityListener('wall_plug_zw1_top_switch_capability', async (value) => {
      this.log("wall_plug_zw1_top_switch_capability value: ", value)
      if (value === true) {
        await this.zclNode.endpoints[2].clusters['onOff'].setOn().catch(err => { this.error(err) })
      }
      else {
        await this.zclNode.endpoints[2].clusters['onOff'].setOff().catch(err => { this.error(err) })
      }

    })

    this.registerCapabilityListener('wall_plug_zw1_reset_bottom_summation_delivered_capability', async (value) => {
      if (value === true) {
        await this.zclNode.endpoints[1].clusters["plugPrivateCluster"].writeAttributes({ reset_summation_delivered: 1 }).catch(err => { this.error(err) })
      }

    })

    this.registerCapabilityListener('wall_plug_zw1_reset_top_summation_delivered_capability', async (value) => {
      if (value === true) {
        await this.zclNode.endpoints[2].clusters["plugPrivateCluster"].writeAttributes({ reset_summation_delivered: 1 }).catch(err => { this.error(err) })
      }

    })

    _turned_on_left_condition.registerRunListener(async (args, state) => {
      const currentValue = await this.getCapabilityValue("wall_plug_zw1_bottom_switch_capability")
      if (currentValue === true) {
        return true
      }
    })

    _turned_off_left_condition.registerRunListener(async (args, state) => {
      const currentValue = await this.getCapabilityValue("wall_plug_zw1_bottom_switch_capability")
      if (currentValue === false) {
        return true
      }
    })

    _turned_on_right_condition.registerRunListener(async (args, state) => {
      const currentValue = await this.getCapabilityValue("wall_plug_zw1_top_switch_capability")
      if (currentValue === true) {
        return true
      }
    })

    _turned_off_right_condition.registerRunListener(async (args, state) => {
      const currentValue = await this.getCapabilityValue("wall_plug_zw1_top_switch_capability")
      if (currentValue === false) {
        return true
      }
    })

    this.driver._turn_on_bottom_action.registerRunListener(async (args, state) => {
      await this.zclNode.endpoints[1].clusters['onOff'].setOn().catch(err => { this.error(err) })
    })
    this.driver._turn_on_top_action.registerRunListener(async (args, state) => {
      await this.zclNode.endpoints[2].clusters['onOff'].setOn().catch(err => { this.error(err) })
    })
    this.driver._turn_off_bottom_action.registerRunListener(async (args, state) => {
      await this.zclNode.endpoints[1].clusters['onOff'].setOff().catch(err => { this.error(err) })
    })
    this.driver._turn_off_top_action.registerRunListener(async (args, state) => {
      await this.zclNode.endpoints[2].clusters['onOff'].setOff().catch(err => { this.error(err) })
    })
  }

  async configAttributeReport(ep) {
    await this.zclNode.endpoints[ep].clusters[CLUSTER.ON_OFF.NAME].configureReporting({
      onOff: {
        minInterval: 0,
        maxInterval: 300
      }
    }).catch(err => { this.error(err) });
    await this.zclNode.endpoints[ep].clusters[CLUSTER.ELECTRICAL_MEASUREMENT.NAME].configureReporting({
      rmsCurrent: {
        minInterval: 5,
        maxInterval: 1800,
        minChange: 1
      },
      rmsVoltage: {
        minInterval: 5,
        maxInterval: 1800,
        minChange: 1
      },
      activePower: {
        minInterval: 5,
        maxInterval: 1800,
        minChange: 1
      },
    }).catch(err => { this.error(err) });

    await this.zclNode.endpoints[ep].clusters[CLUSTER.METERING.NAME].configureReporting({
      currentSummationDelivered: {
        minInterval: 5,
        maxInterval: 1800,
        minChange: 1
      },
    }).catch(err => { this.error(err) });
  }

  async updatePowerCapabilitiesValue(ep) {
    if (ep === 1) {
      await this.zclNode.endpoints[ep].clusters[CLUSTER.ELECTRICAL_MEASUREMENT.NAME].on(
        "attr.rmsCurrent",
        (value) => {
          const currentValue = value / 1000
          this.log(`bottom_current_value: ${currentValue} A`)
          this.setCapabilityValue("wall_plug_zw1_bottom_measure_current", currentValue)
        }
      )

      await this.zclNode.endpoints[ep].clusters[CLUSTER.ELECTRICAL_MEASUREMENT.NAME].on(
        "attr.rmsVoltage",
        (value) => {
          const voltageValue = value / 10
          this.log(`bottom_voltage_value: ${voltageValue} V`)
          this.setCapabilityValue("wall_plug_zw1_bottom_measure_voltage", voltageValue)
        }
      )

      await this.zclNode.endpoints[ep].clusters[CLUSTER.ELECTRICAL_MEASUREMENT.NAME].on(
        "attr.activePower",
        (value) => {
          const powerValue = value / 10
          this.log(`bottom_power_value: ${powerValue} W`)
          this.setCapabilityValue("wall_plug_zw1_bottom_measure_power", powerValue)
        }
      )

      await this.zclNode.endpoints[ep].clusters[CLUSTER.METERING.NAME].on(
        "attr.currentSummationDelivered",
        (value) => {
          const meteringValue = value / 1000
          this.log(`bottom_metering_value: ${meteringValue} kWh`)
          this.setCapabilityValue("wall_plug_zw1_bottom_meter_power", meteringValue)
        }
      )
    }

    else if (ep === 2) {
      await this.zclNode.endpoints[ep].clusters[CLUSTER.ELECTRICAL_MEASUREMENT.NAME].on(
        "attr.rmsCurrent",
        (value) => {
          const currentValue = value / 1000
          this.log(`top_current_value: ${currentValue} A`)
          this.setCapabilityValue("wall_plug_zw1_top_measure_current", currentValue)
        }
      )

      await this.zclNode.endpoints[ep].clusters[CLUSTER.ELECTRICAL_MEASUREMENT.NAME].on(
        "attr.rmsVoltage",
        (value) => {
          const voltageValue = value / 10
          this.log(`top_voltage_value: ${voltageValue} V`)
          this.setCapabilityValue("wall_plug_zw1_top_measure_voltage", voltageValue)
        }
      )

      await this.zclNode.endpoints[ep].clusters[CLUSTER.ELECTRICAL_MEASUREMENT.NAME].on(
        "attr.activePower",
        (value) => {
          const powerValue = value / 10
          this.log(`top_power_value: ${powerValue} W`)
          this.setCapabilityValue("wall_plug_zw1_top_measure_power", powerValue)
        }
      )

      await this.zclNode.endpoints[ep].clusters[CLUSTER.METERING.NAME].on(
        "attr.currentSummationDelivered",
        (value) => {
          const meteringValue = value / 1000
          this.log(`top_metering_value: ${meteringValue} kWh`)
          this.setCapabilityValue("wall_plug_zw1_top_meter_power", meteringValue)
        }
      )
    }
  }


  async readEndpointOnOffState(ep) {
    await this.zclNode.endpoints[ep].clusters['onOff'].on("attr.onOff", (onOffState) => {
      this.log(`on_off_state_${ep}: `, onOffState)
      if (ep === 1) {
        this.setCapabilityValue("wall_plug_zw1_bottom_switch_capability", onOffState).catch(err => { this.error(err) })
      }
      else if (ep === 2) {
        this.setCapabilityValue("wall_plug_zw1_top_switch_capability", onOffState).catch(err => { this.error(err) })
      }

    })
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log("changedKeys: ", changedKeys)
    this.log("newSettings: ", newSettings)
    this.log("oldSettings: ", oldSettings)
    for (let changedKey of changedKeys) {
      this.log(`changedKey: ${changedKey}`)
      if (changedKey == "start_up_on_off_bottom") {
        if (newSettings[changedKey] == "0") {
          await this.zclNode.endpoints[1].clusters["onOff"].writeAttributes({ startUpOnOff: 0 }).catch(err => { this.error(err) })
          console.log("Startup ON/OFF(Bottom) is OFF")

        }
        else if (newSettings[changedKey] == "1") {
          await this.zclNode.endpoints[1].clusters["onOff"].writeAttributes({ startUpOnOff: 1 }).catch(err => { this.error(err) })
          console.log("Startup ON/OFF(Bottom) is ON")

        }
        else if (newSettings[changedKey] == "2") {
          await this.zclNode.endpoints[1].clusters["onOff"].writeAttributes({ startUpOnOff: 2 }).catch(err => { this.error(err) })
          console.log("Startup ON/OFF(Bottom) is TOGGLE")

        }
        else if (newSettings[changedKey] == "255") {
          await this.zclNode.endpoints[1].clusters["onOff"].writeAttributes({ startUpOnOff: 255 }).catch(err => { this.error(err) })
          console.log("Startup ON/OFF(Bottom) is PREVIOUS")
        }
      }
      else if (changedKey == "start_up_on_off_top") {
        if (newSettings[changedKey] == "0") {
          await this.zclNode.endpoints[2].clusters["onOff"].writeAttributes({ startUpOnOff: 0 }).catch(err => { this.error(err) })
          console.log("Startup ON/OFF(Top) is OFF")

        }
        else if (newSettings[changedKey] == "1") {
          await this.zclNode.endpoints[2].clusters["onOff"].writeAttributes({ startUpOnOff: 1 }).catch(err => { this.error(err) })
          console.log("Startup ON/OFF(Top) is ON")

        }
        else if (newSettings[changedKey] == "2") {
          await this.zclNode.endpoints[2].clusters["onOff"].writeAttributes({ startUpOnOff: 2 }).catch(err => { this.error(err) })
          console.log("Startup ON/OFF(Top) is TOGGLE")

        }
        else if (newSettings[changedKey] == "255") {
          await this.zclNode.endpoints[2].clusters["onOff"].writeAttributes({ startUpOnOff: 255 }).catch(err => { this.error(err) })
          console.log("Startup ON/OFF(Top) is PREVIOUS")
        }
      }


    }

    // else if(changedKeys == "count_down_time"){
    //   const seconds = newSettings[changedKeys]
    //   this.log("count_down_time: ",seconds)
    //   this.zclNode.endpoints[1].clusters["plugPrivateCluster"].writeAttributes({ count_down_time: seconds }).catch(err => { this.error(err)})
    // }
  }
}



module.exports = Wall_Plug_ZW1;
