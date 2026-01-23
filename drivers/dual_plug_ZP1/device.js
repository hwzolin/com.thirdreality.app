'use strict';

const { ZigBeeDevice } = require("homey-zigbeedriver");
const { CLUSTER, Cluster } = require("zigbee-clusters");
const PlugOnOffCluster = require("../../lib/startUpOnOffSpecificCluster")
const PlugPrivateCluster = require("../../lib/plugPrivateCluster")

Cluster.addCluster(PlugOnOffCluster)
Cluster.addCluster(PlugPrivateCluster)


class Dual_Plug extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    try {
      const _turned_on_left_condition = this.homey.flow.getConditionCard("is_turned_on_left");
      const _turned_off_left_condition = this.homey.flow.getConditionCard("is_turned_off_left");
      const _turned_on_right_condition = this.homey.flow.getConditionCard("is_turned_on_right");
      const _turned_off_right_condition = this.homey.flow.getConditionCard("is_turned_off_right");

      this.registerCapability("measure_current_of_left_dual_plug", CLUSTER.ELECTRICAL_MEASUREMENT)
      this.registerCapability("measure_current_of_right_dual_plug", CLUSTER.ELECTRICAL_MEASUREMENT)
      this.registerCapability("measure_power_of_left_dual_plug", CLUSTER.ELECTRICAL_MEASUREMENT)
      this.registerCapability("measure_power_of_right_dual_plug", CLUSTER.ELECTRICAL_MEASUREMENT)
      this.registerCapability("measure_voltage_of_left_dual_plug", CLUSTER.ELECTRICAL_MEASUREMENT)
      this.registerCapability("measure_voltage_of_right_dual_plug", CLUSTER.ELECTRICAL_MEASUREMENT)
      this.registerCapability("meter_power_of_left_dual_plug", CLUSTER.METERING)
      this.registerCapability("meter_power_of_right_dual_plug", CLUSTER.METERING)

      await this.configAttributeReport(1)
      await this.configAttributeReport(2)
      
      await this.readEndpointOnOffState(1)
      await this.readEndpointOnOffState(2)

      await this.updatePowerCapabilitiesValue(1)
      await this.updatePowerCapabilitiesValue(2)


      await zclNode.endpoints[1].clusters[CLUSTER.ON_OFF.NAME].on("attr.onOff", (onOffState) => {
        if (onOffState === true) {
          this.driver.triggerTurnOnLeftSwitch(this)
        }
        else {
          this.driver.triggerTurnOffLeftSwitch(this)
        }
      })

      await zclNode.endpoints[2].clusters[CLUSTER.ON_OFF.NAME].on("attr.onOff", (onOffState) => {
        if (onOffState === true) {
          this.driver.triggerTurnOnRightSwitch(this)
        }
        else {
          this.driver.triggerTurnOffRightSwitch(this)
        }
      })

      this.registerCapabilityListener('third_reality_dual_plug_left_switch_capability', async (value) => {
        if (value === true) {
          await this.zclNode.endpoints[1].clusters['onOff'].setOn().catch(err => { this.error(err) })
        }
        else {
          await this.zclNode.endpoints[1].clusters['onOff'].setOff().catch(err => { this.error(err) })
        }

      })

      this.registerCapabilityListener('third_reality_dual_plug_right_switch_capability', async (value) => {
        if (value === true) {
          await this.zclNode.endpoints[2].clusters['onOff'].setOn().catch(err => { this.error(err) })
        }
        else {
          await this.zclNode.endpoints[2].clusters['onOff'].setOff().catch(err => { this.error(err) })
        }

      })

      this.registerCapabilityListener('reset_left_summation_delivered_capability', async (value) => {
        if (value === true) {
          await this.zclNode.endpoints[1].clusters["plugPrivateCluster"].writeAttributes({ reset_summation_delivered: 1 }).catch(err => { this.error(err) })
        }

      })

      this.registerCapabilityListener('reset_right_summation_delivered_capability', async (value) => {
        if (value === true) {
          await this.zclNode.endpoints[2].clusters["plugPrivateCluster"].writeAttributes({ reset_summation_delivered: 1 }).catch(err => { this.error(err) })
        }

      })

      _turned_on_left_condition.registerRunListener(async (args, state) => {
        const currentValue = await this.getCapabilityValue("third_reality_dual_plug_left_switch_capability")
        if (currentValue === true) {
          return true
        }
      })

      _turned_off_left_condition.registerRunListener(async (args, state) => {
        const currentValue = await this.getCapabilityValue("third_reality_dual_plug_left_switch_capability")
        if (currentValue === false) {
          return true
        }
      })

      _turned_on_right_condition.registerRunListener(async (args, state) => {
        const currentValue = await this.getCapabilityValue("third_reality_dual_plug_right_switch_capability")
        if (currentValue === true) {
          return true
        }
      })

      _turned_off_right_condition.registerRunListener(async (args, state) => {
        const currentValue = await this.getCapabilityValue("third_reality_dual_plug_right_switch_capability")
        if (currentValue === false) {
          return true
        }
      })

      this.driver._turn_on_left_action.registerRunListener(async (args, state) => {
        await this.zclNode.endpoints[1].clusters['onOff'].setOn().catch(err => { this.error(err) })
      })
      this.driver._turn_on_right_action.registerRunListener(async (args, state) => {
        await this.zclNode.endpoints[2].clusters['onOff'].setOn().catch(err => { this.error(err) })
      })
      this.driver._turn_off_left_action.registerRunListener(async (args, state) => {
        await this.zclNode.endpoints[1].clusters['onOff'].setOff().catch(err => { this.error(err) })
      })
      this.driver._turn_off_right_action.registerRunListener(async (args, state) => {
        await this.zclNode.endpoints[2].clusters['onOff'].setOff().catch(err => { this.error(err) })
      })
    } catch (err) {
      this.log(err)
    }
  }

  async configAttributeReport(ep) {
    await this.zclNode.endpoints[ep].clusters[CLUSTER.ON_OFF.NAME].configureReporting({
      onOff: {
        minInterval: 0,
        maxInterval: 300
      }
    })
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
          this.log(`left_current_value: ${currentValue} A`)
          this.setCapabilityValue("measure_current_of_left_dual_plug", currentValue)
        }
      )

      await this.zclNode.endpoints[ep].clusters[CLUSTER.ELECTRICAL_MEASUREMENT.NAME].on(
        "attr.rmsVoltage",
        (value) => {
          const voltageValue = value / 10
          this.log(`left_voltage_value: ${voltageValue} V`)
          this.setCapabilityValue("measure_voltage_of_left_dual_plug", voltageValue)
        }
      )

      await this.zclNode.endpoints[ep].clusters[CLUSTER.ELECTRICAL_MEASUREMENT.NAME].on(
        "attr.activePower",
        (value) => {
          const powerValue = value / 10
          this.log(`left_power_value: ${powerValue} W`)
          this.setCapabilityValue("measure_power_of_left_dual_plug", powerValue)
        }
      )

      await this.zclNode.endpoints[ep].clusters[CLUSTER.METERING.NAME].on(
        "attr.currentSummationDelivered",
        (value) => {
          const meteringValue = value / 1000
          this.log(`left_metering_value: ${meteringValue} kWh`)
          this.setCapabilityValue("meter_power_of_left_dual_plug", meteringValue)
        }
      )
    }

    else if (ep === 2) {
      await this.zclNode.endpoints[ep].clusters[CLUSTER.ELECTRICAL_MEASUREMENT.NAME].on(
        "attr.rmsCurrent",
        (value) => {
          const currentValue = value / 1000
          this.log(`right_current_value: ${currentValue} A`)
          this.setCapabilityValue("measure_current_of_right_dual_plug", currentValue)
        }
      )

      await this.zclNode.endpoints[ep].clusters[CLUSTER.ELECTRICAL_MEASUREMENT.NAME].on(
        "attr.rmsVoltage",
        (value) => {
          const voltageValue = value / 10
          this.log(`right_voltage_value: ${voltageValue} V`)
          this.setCapabilityValue("measure_voltage_of_right_dual_plug", voltageValue)
        }
      )

      await this.zclNode.endpoints[ep].clusters[CLUSTER.ELECTRICAL_MEASUREMENT.NAME].on(
        "attr.activePower",
        (value) => {
          const powerValue = value / 10
          this.log(`right_power_value: ${powerValue} W`)
          this.setCapabilityValue("measure_power_of_right_dual_plug", powerValue)
        }
      )

      await this.zclNode.endpoints[ep].clusters[CLUSTER.METERING.NAME].on(
        "attr.currentSummationDelivered",
        (value) => {
          const meteringValue = value / 1000
          this.log(`right_metering_value: ${meteringValue} kWh`)
          this.setCapabilityValue("meter_power_of_right_dual_plug", meteringValue)
        }
      )
    }
  }


  async readEndpointOnOffState(ep) {
    await this.zclNode.endpoints[ep].clusters['onOff'].on("attr.onOff", (onOffState) => {
      this.log(`on_off_state_${ep}: `, onOffState)
      if (ep === 1) {
        this.setCapabilityValue("third_reality_dual_plug_left_switch_capability", onOffState).catch(err => { this.error(err) })
      }
      else if (ep === 2) {
        this.setCapabilityValue("third_reality_dual_plug_right_switch_capability", onOffState).catch(err => { this.error(err) })
      }

    })
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log("changedKeys: ", changedKeys)
    this.log("newSettings: ", newSettings)
    this.log("oldSettings: ", oldSettings)
    for (let changedKey of changedKeys) {
      this.log(`changedKey: ${changedKey}`)
      if (changedKey == "start_up_on_off_left") {
        if (newSettings[changedKey] == "0") {
          await this.zclNode.endpoints[1].clusters["onOff"].writeAttributes({ startUpOnOff: 0 }).catch(err => { this.error(err) })
          console.log("Startup ON/OFF(Left) is OFF")

        }
        else if (newSettings[changedKey] == "1") {
          await this.zclNode.endpoints[1].clusters["onOff"].writeAttributes({ startUpOnOff: 1 }).catch(err => { this.error(err) })
          console.log("Startup ON/OFF(Left) is ON")

        }
        else if (newSettings[changedKey] == "2") {
          await this.zclNode.endpoints[1].clusters["onOff"].writeAttributes({ startUpOnOff: 2 }).catch(err => { this.error(err) })
          console.log("Startup ON/OFF(Left) is TOGGLE")

        }
        else if (newSettings[changedKey] == "255") {
          await this.zclNode.endpoints[1].clusters["onOff"].writeAttributes({ startUpOnOff: 255 }).catch(err => { this.error(err) })
          console.log("Startup ON/OFF(Left) is PREVIOUS")
        }
      }
      else if (changedKey == "start_up_on_off_right") {
        if (newSettings[changedKey] == "0") {
          await this.zclNode.endpoints[2].clusters["onOff"].writeAttributes({ startUpOnOff: 0 }).catch(err => { this.error(err) })
          console.log("Startup ON/OFF(Right) is OFF")

        }
        else if (newSettings[changedKey] == "1") {
          await this.zclNode.endpoints[2].clusters["onOff"].writeAttributes({ startUpOnOff: 1 }).catch(err => { this.error(err) })
          console.log("Startup ON/OFF(Right) is ON")

        }
        else if (newSettings[changedKey] == "2") {
          await this.zclNode.endpoints[2].clusters["onOff"].writeAttributes({ startUpOnOff: 2 }).catch(err => { this.error(err) })
          console.log("Startup ON/OFF(Right) is TOGGLE")

        }
        else if (newSettings[changedKey] == "255") {
          await this.zclNode.endpoints[2].clusters["onOff"].writeAttributes({ startUpOnOff: 255 }).catch(err => { this.error(err) })
          console.log("Startup ON/OFF(Right) is PREVIOUS")
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



module.exports = Dual_Plug;
