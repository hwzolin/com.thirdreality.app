"use strict";

const { ZCLDataTypes, Cluster } = require("zigbee-clusters");

const ATTRIBUTES = {
  judgeHeight: { id: 1, type: ZCLDataTypes.int8 },
  preSettingBottomHeight: { id: 2, type: ZCLDataTypes.uint16 },
  blindWidth: { id: 3, type: ZCLDataTypes.uint16 },
};

const COMMANDS = {};

class blindGen2SpecificCluster extends Cluster {
  static get ID() {
    return 65521;
  }

  static get NAME() {
    return "blindGen2Cluster";
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES;
  }

  static get COMMANDS() {
    return COMMANDS;
  }
}

Cluster.addCluster(blindGen2SpecificCluster);

module.exports = blindGen2SpecificCluster;
