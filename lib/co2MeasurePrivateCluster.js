'use strict';

const { ZCLDataTypes, Cluster } = require('zigbee-clusters');


const ATTRIBUTES = {
  measuredValue: { id: 0, type: ZCLDataTypes.single }
};

const COMMANDS = {};


class co2MeasurePrivateCluster extends Cluster {

  static get ID() {
    return 1037;
  }

  static get NAME() {
    return 'co2MeasurePrivateCluster';
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES;
  }

  static get COMMANDS() {
    return COMMANDS;
  }

}

Cluster.addCluster(co2MeasurePrivateCluster);

module.exports = co2MeasurePrivateCluster;
