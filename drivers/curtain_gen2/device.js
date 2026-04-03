"use strict";

const { ZigBeeDevice } = require("homey-zigbeedriver");
const { Cluster, debug, CLUSTER } = require("zigbee-clusters");
const blind_width_data = require("./blindWidth.json");

const blindGen2SpecificCluster = require("../../lib/blindGen2SpecificCluster");

Cluster.addCluster(blindGen2SpecificCluster);

class Curtain_Gen2 extends ZigBeeDevice {
  /**
   * onInit is called when the device is initialized.
   */
  async onNodeInit({ zclNode }) {
    try {
      this.log("Smart Blind Gen2 has been initialized");
      this._pendingSettings = {};
      this._settingsTimer = null;

      await this.registerCapability(
        "measure_battery",
        CLUSTER.POWER_CONFIGURATION,
      );

      // await this.registerCapability("windowcoverings_set", CLUSTER.WINDOW_COVERING);
      await this.registerCapability(
        "windowcoverings_state",
        CLUSTER.WINDOW_COVERING,
      );

      // console.log(await zclNode.endpoints[1].clusters)
      zclNode.endpoints[1].clusters[CLUSTER.WINDOW_COVERING.NAME].on(
        "attr.currentPositionLiftPercentage",
        this.updatePostion.bind(this),
      );
      this.registerCapabilityListener("windowcoverings_set", (value) =>
        this.setPosition(zclNode, value),
      );

      zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME].on(
        "attr.batteryPercentageRemaining",
        this.onBatteryPercentageRemainingAttributeReport.bind(this),
      );
    } catch (err) {
      this.log(err);
    }
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  onBatteryPercentageRemainingAttributeReport(batteryPercentageRemaining) {
    const batteryThreshold = this.getSetting("batteryThreshold") || 20;
    this.log(
      "measure_battery | powerConfiguration - batteryPercentageRemaining (%): ",
      batteryPercentageRemaining / 2,
    );
    this.setCapabilityValue(
      "measure_battery",
      batteryPercentageRemaining / 2,
    ).catch(this.error);
  }

  async updatePostion(position) {
    console.log("current curtain lift percentage is: ", 100 - position);
    this.setCapabilityValue(
      "windowcoverings_set",
      (100 - position) / 100,
    ).catch(this.error);
  }

  async setPosition(zclNode, pos) {
    zclNode.endpoints[1].clusters[CLUSTER.WINDOW_COVERING.NAME]
      .goToLiftPercentage({
        percentageLiftValue: (1 - pos) * 100,
      })
      .catch((error) => {
        this.log(error);
      });
  }
  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log("Smart Blind Gen2 has been added");
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name) {
    this.log("Smart Blind Gen2 was renamed");
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log("Smart Blind Gen2 has been deleted");
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log("changedKeys: ", changedKeys);
    this.log("newSettings: ", newSettings);
    this.log("oldSettings: ", oldSettings);
    let syncSettings = {};
    for (let changedKey of changedKeys) {
      this.log(`changedKey: ${changedKey}`);

      if (changedKey == "judge_height") {
        const new_judge_height = newSettings["judge_height"];
        this.log("new_judge_height: " + new_judge_height);

        const write_result = await this.zclNode.endpoints[1].clusters[
          "blindGen2Cluster"
        ]
          .writeAttributes({ judgeHeight: new_judge_height })
          .catch((err) => {
            this.error(err);
          });
        if (
          write_result &&
          write_result.attributes &&
          write_result.attributes.length > 0
        ) {
          const status = write_result.attributes[0].status;
          this.log("judgeHeight write result:", status); // 输出: "SUCCESS"

          if (status === "SUCCESS") {
            this.log("write success");
            var final_value = null;
            for (let i = 0; i < 2; i++) {
              await this.delay(100);
              const read_result = await this.zclNode.endpoints[1].clusters[
                "blindGen2Cluster"
              ]
                .readAttributes(["judgeHeight"])
                .catch((err) => {
                  this.error(err);
                });
              this.log("judge_height read result: ", read_result);
              final_value = read_result.judgeHeight;
            }
            syncSettings["judge_height"] = final_value;
          } else {
            this.log("write failed:", status);
          }
        }
      } else if (changedKey == "pre_setting_bottom_height") {
        const new_pre_setting_bottom_height =
          newSettings["pre_setting_bottom_height"];
        this.log(
          "new_pre_setting_bottom_height: " + new_pre_setting_bottom_height,
        );
        const write_result = await this.zclNode.endpoints[1].clusters[
          "blindGen2Cluster"
        ]
          .writeAttributes({
            preSettingBottomHeight: new_pre_setting_bottom_height,
          })
          .catch((err) => {
            this.error(err);
          });

        const status = write_result.attributes[0].status;
        this.log("preSettingBottomHeight write result:", status); // 输出: "SUCCESS"
        if (status === "SUCCESS") {
          this.log("write success");
          var final_value = null;
          for (let i = 0; i < 2; i++) {
            await this.delay(100);
            const read_result = await this.zclNode.endpoints[1].clusters[
              "blindGen2Cluster"
            ]
              .readAttributes(["preSettingBottomHeight"])
              .catch((err) => {
                this.error(err);
              });
            this.log("pre_setting_bottom_height read result: ", read_result);
            final_value = read_result.preSettingBottomHeight;
          }
          syncSettings["pre_setting_bottom_height"] = final_value;
        } else {
          this.log("write failed:", status);
        }
      } else if (changedKey == "blind_width") {
        const new_blind_width = newSettings["blind_width"];
        this.log("new_blind_width: ", new_blind_width);
        const send_value = blind_width_data["blind_width"][new_blind_width];
        this.log("send_value: ", send_value);
        await this.zclNode.endpoints[1].clusters["blindGen2Cluster"]
          .writeAttributes({
            blindWidth: send_value,
          })
          .catch((err) => {
            this.error(err);
          });
      }
    }
    setTimeout(() => {
      this.setSettings(syncSettings).catch((err) => {
        this.error(err);
      });
    }, 100);
  }
}

module.exports = Curtain_Gen2;
