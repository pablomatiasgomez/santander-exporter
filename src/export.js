#!/usr/bin/env node
'use strict';

global.__project_dir = __dirname + '/..';
global.__src_dir = __dirname;
global.include = file => require(__src_dir + '/' + file);
global.Promise = require('bluebird');

const TerminalFont = include('utils/terminal-font');
const Utils = include('utils/utils');

const SantanderConnector = include('connector/santander-connector');

const ExportService = include('service/export-service');

//----------------------

const logger = include('utils/logger').newLogger('Main');

//----------------------

Array.prototype.flatMap = function(lambda) {
	return Array.prototype.concat.apply([], this.map(lambda));
};

Number.prototype.pad = function(length, chr = "0") {
	return this.toString().pad(length, chr);
};

String.prototype.pad = function(length, chr) {
	let str = this;
	while (str.length < length) {
		str = chr + str;
	}
	return str;
};

//----------------------

let santanderConnector;
let exportService;

//----------------------

function initServicesAndExecute() {
	let id = "";
	let password = "";
	let username = "";

	logger.info('');
	logger.info('|==================================================================================');
	logger.info(`|                                  ${TerminalFont.Bright}${id}${TerminalFont.Reset}`);
	logger.info('|==================================================================================');
	logger.info(`| Git changeset: ${Utils.CURRENT_BUILD.changeset}`);
	logger.info(`| Git branch: ${Utils.CURRENT_BUILD.branch}`);
	logger.info('|==================================================================================');
	logger.info('');

	return Promise.resolve().then(() => {
		santanderConnector = new SantanderConnector(id, password, username);
		return santanderConnector.connect();
	}).then(() => {
		exportService = new ExportService(santanderConnector);
		return exportService.exportData();
	});
}

let promise = initServicesAndExecute();


module.exports = promise;
