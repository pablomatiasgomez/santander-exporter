'use strict';

const Utils = include('utils/utils');
const SantanderConnector = include('connector/santander-connector');

const logger = include('utils/logger').newLogger('ExportService');

//----------------------

function ExportService(santanderConnector) {
	this.santanderConnector = santanderConnector;
}

ExportService.prototype.exportData = function() {
	let self = this;
	logger.info(`Exporting data...`);

	return self.santanderConnector.getSaldos().then(saldos => {
		debugger;
	});
};

module.exports = ExportService;

