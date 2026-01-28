'use strict';

const { ZCLDataTypes, Cluster } = require('zigbee-clusters');


const ATTRIBUTES = {
  vocValue: { id: 0, type: ZCLDataTypes.single }
};

const COMMANDS = {};


class vocPrivateCluster extends Cluster {

  static get ID() {
    return 1070;
  }

  static get NAME() {
    return 'vocPrivateCluster';
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES;
  }

  static get COMMANDS() {
    return COMMANDS;
  }

}

Cluster.addCluster(vocPrivateCluster);

module.exports = vocPrivateCluster;
