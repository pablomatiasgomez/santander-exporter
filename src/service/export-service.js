'use strict';

const Utils = include('utils/utils');

const logger = include('utils/logger').newLogger('ExportService');

//----------------------

function ExportService(santanderConnector) {
	this.santanderConnector = santanderConnector;
}

ExportService.prototype.exportData = function(id) {
	let self = this;
	logger.info(`Exporting data...`);

	return self.getAllData().then(data => {
		logger.info(`Going to save data exported: `, data);
		Utils.createFile(self.getFilePath(id), JSON.stringify(data));
		// TODO send to some spreadsheet.
	}).catch(e => {
		logger.error(`Failed to export data:`, e);
		throw e;
	});
};

ExportService.prototype.getAllData = function() {
	let self = this;
	logger.info(`Getting all data from the browser...`);

	let data = { };
	return Promise.resolve().then(() => {
		return self.santanderConnector.getSaldos();
	}).then(saldos => {
		logger.info(`Saldos: ${JSON.stringify(saldos)}`);
		data.saldos = saldos;
		return self.santanderConnector.getPlazoFijos();
	}).then(plazoFijos => {
		logger.info(`Plazo fijos: ${JSON.stringify(plazoFijos)}`);
		data.plazoFijos = plazoFijos;
		return self.santanderConnector.getFondosDeInversion();
	}).then(fondosDeInversion => {
		logger.info(`Fondos de inversion: ${JSON.stringify(fondosDeInversion)}`);
		data.fondosDeInversion = fondosDeInversion;
		return self.santanderConnector.getTitulosValores();
	}).then(titulosValores => {
		logger.info(`Titulos valores: ${JSON.stringify(titulosValores)}`);
		data.titulosValores = titulosValores;
		return data;
	});
};

ExportService.prototype.getFilePath = function(id) {
	return `${__project_dir}/exports/${id}-${new Date().toISOString().split("T")[0]}.json`;
};

module.exports = ExportService;

