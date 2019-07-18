'use strict';

const request = require('request-promise');
const cheerio = require('cheerio');
const FileCookieStore = require('tough-cookie-file-store');

const Utils = include('utils/utils');

const logger = include('utils/logger').newLogger('SantanderConnector');

//---------------

const MAX_TRY_AGAIN_COUNT = 10;
const TRY_AGAIN_DELAY = 60 * 1000; // 60 secs

function SantanderConnector(id, password, username) {
	if (!id) throw 'You must specify id!';
	if (!password) throw 'You must specify password!';
	if (!username) throw 'You must specify username!';
	this.id = id;
	this.password = password;
	this.username = username;


	let cookieFile = __project_dir + `/cookies/${this.id}.json`;
	Utils.createFileIfNotExists(cookieFile);
	this.cookieStore = new FileCookieStore(cookieFile);

	let jar = request.jar(this.cookieStore);
	jar.setCookie(request.cookie('JSESSIONID=0000IR8P9XOWJOyevEedCBaxYOv:1bqdhgn03'), 'https://www2.personas.santander.com.ar');
	jar.setCookie(request.cookie('TS012b2b03=017e7bd40533c62c097aeea00fe5e0e8609b0eafc3b3eaf42ccc8e1824cebdc61953b8310e7b848d8800d1d10c319c70d28dfc10cec1902ab1a76574d63a584b8bc1b618bb40743b863e1192db08a9ee32da268751'), 'https://www2.personas.santander.com.ar');
	this.request = request.defaults({
		jar : jar
	});
}

SantanderConnector.prototype.getSaldos = function() {
	let self = this;
	logger.info(`Getting saldos ...`);

	return self.getServiceData("home/obtenerSaldosCuentas");
};

SantanderConnector.prototype.getServiceData = function(serviceName) {
	let self = this;
	logger.info(`Getting service ${serviceName} ...`);

	// Get basic cookies first.
	return self.doApiRequest({
		headers: self.getHeaders(),
		url: `https://www2.personas.santander.com.ar/obp-servicios/${serviceName}`,
		method: 'POST'
	}).then(response => {
		console.log(response);
	});
};


// ---------

SantanderConnector.prototype.doApiRequest = function(options) {
	let self = this;

	return self.doRequest(options).then(response => {
		if (response.statusCode === 200) {
			try {
				return JSON.parse(response.body);
			} catch (e) {
				logger.error('JSON parse error..', e, response.body);
				return Promise.reject(e);
			}
		} else {
			logger.error(response.statusCode, response.body);
			return Promise.reject(response);
		}
	});
};

SantanderConnector.prototype.doRequest = function(options, tryCount) {
	let self = this;
	tryCount = tryCount || 0;

	function retry(delay) {
		tryCount++;
		if (tryCount > MAX_TRY_AGAIN_COUNT) {
			logger.info('Tried max allowed times..');
			return Promise.reject('Tried max allowed times..');
		}

		return Promise.delay(delay).then(() => {
			logger.info(`Retrying request... retry number ${tryCount}`);
			return self.doRequest(options, tryCount);
		});
	}

	options.resolveWithFullResponse = true;
	options.simple = false;
	options.followRedirect = true;
	return self.request(options).then(response => {
		if (response && response.statusCode >= 500) {
			logger.error(`Response is ${response.statusCode}, lets try it again...`, response.statusCode, response.body);
			return retry(TRY_AGAIN_DELAY);
		}
		return response;
	}).catch(error => {
		if (self.networkErrorShouldBeTriedAgain(error)) {
			logger.error('Connection Error should be tried again...');
			return retry(TRY_AGAIN_DELAY);
		} else {
			logger.error(error);
			return Promise.reject(error);
		}
	});
};

// noinspection SpellCheckingInspection
const ERROR_CODES_TO_TRY_AGAIN = [
	'ENOTFOUND',
	'EAI_AGAIN',
	'ECONNRESET',
	'ETIMEDOUT',
	'ENETUNREACH',
	'ECONNREFUSED'
];

SantanderConnector.prototype.networkErrorShouldBeTriedAgain = function(error) {
	return error && error.cause && ERROR_CODES_TO_TRY_AGAIN.includes(error.cause.code);
};

SantanderConnector.prototype.geHeaders = function(customHeaders = {}) {
	let baseHeaders = {
		'User-Agent': Utils.USER_AGENT_FOR_REQUESTS,
		'Accept': 'application/json, text/plain, */*',
		'Accept-Encoding': 'gzip, deflate, br',
		'Accept-Language': 'en-US,en;q=0.9,es-AR;q=0.8,es;q=0.7',
		'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJudXAiOiIwNjE1NTk5MSIsImlhdCI6MTU2MzIzNzY2NCwiZXhwIjoxNTYzMjM3OTA0LCJqdGkiOiIyMGQ5MTVlMC0zYzZjLTQxYjAtOWZkZi02NjBiNTlkMmE3ZDAifQ.VwmgBZQLsfmCdlCRVC7-3FisGt75DDHycWfWKN0ZDSQ',
		'Wil': 'https://www2.personas.santander.com.ar/obp-webapp/angular/',
		'Referer': 'https://www2.personas.santander.com.ar/obp-webapp/angular/',
	};
	Object.keys(customHeaders).forEach(headerName => {
		baseHeaders[headerName] = customHeaders[headerName];
	});
	return baseHeaders;
};

module.exports = SantanderConnector;
