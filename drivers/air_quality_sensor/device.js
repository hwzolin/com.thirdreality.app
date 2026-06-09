"use strict";

const { ZigBeeDevice } = require("homey-zigbeedriver");
const { CLUSTER, Cluster } = require("zigbee-clusters");
const vocPrivateCluster = require("../../lib/vocPrivateCluster");
const co2MeasurePrivateCluster = require("../../lib/co2MeasurePrivateCluster");

Cluster.addCluster(vocPrivateCluster);
Cluster.addCluster(co2MeasurePrivateCluster);

module.exports = class airPressureSensor extends ZigBeeDevice {
  /**
   * onInit is called when the device is initialized.
   */
  async onNodeInit({ zclNode }) {
    this.log("Air Quality Sensor has been initialized");

    await zclNode.endpoints[1].clusters.vocPrivateCluster.on(
      "attr.tvocIndex",
      (value) => {
        this.log("tvocIndex: ", value);
        this.setCapabilityValue("measure_tvoc_index", value).catch((error) =>
          this.log(error),
        );
      },
    );

    await zclNode.endpoints[1].clusters.co2MeasurePrivateCluster.on(
      "attr.measuredValue",
      (value) => {
        this.log("co2ReportValue: ", value);
        const result_value = value * 1000000
        this.setCapabilityValue("measure_co2", result_value).catch((error) =>
          this.log(error),
        );
      },
    );

    await zclNode.endpoints[1].clusters[CLUSTER.TEMPERATURE_MEASUREMENT.NAME].on(
        "attr.measuredValue",
        this.onTemperatureMeasuredAttributeReport.bind(this),
      );

    // measure_humidity
    await zclNode.endpoints[1].clusters[
      CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT.NAME
    ].on(
      "attr.measuredValue",
      this.onRelativeHumidityMeasuredAttributeReport.bind(this),
    );
  }

  onTemperatureMeasuredAttributeReport(measuredValue) {
    const temperatureOffset = this.getSetting("temperature_offset") || 0;
    const parsedValue =
      this.getSetting("temperature_decimals") === "2"
        ? Math.round((measuredValue / 100) * 100) / 100
        : Math.round((measuredValue / 100) * 10) / 10;
    this.log(
      "measure_temperature | temperatureMeasurement - measuredValue (temperature):",
      parsedValue,
      "+ temperature offset",
      temperatureOffset,
    );
    this.setCapabilityValue(
      "measure_temperature",
      parsedValue + temperatureOffset,
    ).catch(this.error);
  }

  onRelativeHumidityMeasuredAttributeReport(measuredValue) {
    const humidityOffset = this.getSetting("humidity_offset") || 0;
    const parsedValue =
      this.getSetting("humidity_decimals") === "2"
        ? Math.round((measuredValue / 100) * 100) / 100
        : Math.round((measuredValue / 100) * 10) / 10;
    this.log(
      "measure_humidity | relativeHumidity - measuredValue (humidity):",
      parsedValue,
      "+ humidity offset",
      humidityOffset,
    );
    this.setCapabilityValue(
      "measure_humidity",
      parsedValue + humidityOffset,
    ).catch(this.error);
  }

  // async configAttributeReport() {
  //   await this.zclNode.endpoints[1].clusters[
  //     CLUSTER.POWER_CONFIGURATION.NAME
  //   ].configureReporting({
  //     batteryPercentageRemaining: {
  //       minInterval: 900,
  //       maxInterval: 3600,
  //       minChange: 2,
  //     },
  //   });
  // }



  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log("Air Quality Sensor has been added");
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
    this.log("Air Quality Sensor settings where changed");
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name) {
    this.log("Air Quality Sensor was renamed");
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log("Air Quality Sensor has been deleted");
  }
};
