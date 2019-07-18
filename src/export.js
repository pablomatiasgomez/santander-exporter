#!/usr/bin/env node
'use strict';

global.__project_dir = __dirname + '/..';
global.__src_dir = __dirname;
global.include = file => require(__src_dir + '/' + file);
global.Promise = require('bluebird');

const ArgumentParser = require('argparse').ArgumentParser;

const TerminalFont = include('utils/terminal-font');
const Utils = include('utils/utils');

const SantanderBrowser = include('connector/santander-browser');

const ExportService = include('service/export-service');

//----------------------

const parser = new ArgumentParser({
	description: 'Santander Exporter',
	version: require('../package.json').version
});
parser.addArgument([ '-i', '--id' ], { required: true });
parser.addArgument([ '-p', '--password' ], { required: true });
parser.addArgument([ '-u', '--username' ], { required: true });

const logger = include('utils/logger').newLogger('Main');

//----------------------

Array.prototype.flatMap = function(lambda) {
	return Array.prototype.concat.apply([], this.map(lambda));
};

//----------------------

let santanderBrowser;
let exportService;

//----------------------

function initServicesAndExecute() {
	let args = parser.parseArgs();
	let id = args.id;
	let password = args.password;
	let username = args.username;

	logger.info('');
	logger.info('|==================================================================================');
	logger.info(`|                                  ${TerminalFont.Bright}${id}${TerminalFont.Reset}`);
	logger.info('|==================================================================================');
	logger.info(`| Git changeset: ${Utils.CURRENT_BUILD.changeset}`);
	logger.info(`| Git branch: ${Utils.CURRENT_BUILD.branch}`);
	logger.info('|==================================================================================');
	logger.info('');

	return Promise.resolve().then(() => {
		santanderBrowser = new SantanderBrowser(id, password, username);
		return santanderBrowser.login();
	}).then(() => {
		exportService = new ExportService(santanderBrowser);
		return exportService.exportData(id);
	}).finally(() => {
		logger.info(`Shutting down the browser..`);
		return santanderBrowser.dispose();
	});
}

let promise = initServicesAndExecute();


module.exports = promise;
