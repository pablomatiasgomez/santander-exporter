'use strict';

const puppeteer = require('puppeteer');

const logger = include('utils/logger').newLogger('SantanderBrowser');

//---------------

const LOGIN_URL = 'https://www2.personas.santander.com.ar/obp-webapp/angular/#!/login';
const DEBUG = true;

function SantanderBrowser(id, password, username) {
	if (!id) throw 'You must specify id!';
	if (!password) throw 'You must specify password!';
	if (!username) throw 'You must specify username!';
	this.id = id;
	this.password = password;
	this.username = username;

	this.browser = null;
	this.page = null;
}

SantanderBrowser.prototype.login = function() {
	let self = this;
	logger.info(`Logging in for user ${self.id} ..`);

	let options = DEBUG ? {
		headless: false,
		devtools: true,
		executablePath: '/Users/pgomez/sources/santander-exporter/node_modules/puppeteer/.local-chromium/mac-672088/chrome-mac/Chromium.app/Contents/MacOS/Chromium',
		userDataDir: '/Users/pgomez/Library/Application Support/Chromium/',
		//executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
		//userDataDir: '/Users/pgomez/Library/Application Support/Google/Chrome/',
	} : {};
	return Promise.resolve().then(() => {
		return puppeteer.launch(options);
	}).then(browser => {
		self.browser = browser;
		return self.browser.newPage();
	}).then(page => {
		self.page = page;
	}).then(page => {
		return self.page.goto(LOGIN_URL);
	}).then(() => {
		return self.page.type('#input_0', self.id);
	}).then(() => {
		return self.page.type('#input_1', self.password);
	}).then(() => {
		return self.page.type('#input_2', self.username);
	}).then(() => {
		return self.page.click('#form > button');
	}).then(() => {
		return self.page.waitForSelector('home-card');
	}).delay(2000).catch(e => {
		logger.error(`Unable to do login... ${e}`, e);
		throw e;
	});
};

SantanderBrowser.prototype.dispose = function() {
	let self = this;
	return Promise.resolve().then(() => {
		if (self.page) {
			return self.logout().catch(e => {
				logger.error(`Failed to do logout..`, e);
			}).finally(() => {
				return self.page.close();
			});
		}
	}).then(() => {
		if (self.browser) {
			return self.browser.close();
		}
	});
};

SantanderBrowser.prototype.logout = function() {
	let self = this;
	logger.info(`Logging out for user ${self.id} ..`);

	return Promise.resolve().then(() => {
		// Click logout button on the navbar
		return self.page.click('#topbar .action-container a:last-child');
	}).then(() => {
		return self.page.waitForSelector('md-dialog');
	}).delay(2000).then(() => {
		// Click Yes
		return self.page.click('md-dialog md-dialog-actions div:last-child obp-boton');
	}).then(() => {
		return self.page.waitForNavigation();
	}).delay(2000);
};

SantanderBrowser.prototype.getSaldos = function() {
	let self = this;
	logger.info(`Getting saldos ...`);

	return Promise.resolve().then(() => {
		return self.goToMenu('Cuentas');
	}).then(() => {
		return self.page.waitForSelector('cuentas-card');
	}).delay(2000).then(() => {
		// Get all cuentas
		return self.page.$$('cuentas-card .card-cuentas_wrapper_saldos_general');
	}).then(cuentas => {
		// Get saldo for each cuenta
		return Promise.all(cuentas.map(cuenta => self.page.evaluate(element => element.textContent, cuenta)));
	});
};

SantanderBrowser.prototype.getPlazoFijos = function() {
	let self = this;
	logger.info(`Getting plazo fijos ...`);

	return Promise.resolve().then(() => {
		return self.goToMenu('Plazos Fijos');
	}).then(() => {
		return self.page.waitForSelector('table.tenencia');
	}).delay(2000).then(() => {
		return self.page.evaluate(() => {
			let scope = angular.element(document.querySelector('#main-view > plazo-fijo plazo-fijo-tenencia > div.tabla-contenedor')).scope().$parent.cuenta;
			return scope.tenenciasShowing.flatMap(pfs => {
				return pfs.map(pf => {
					return {
						tipo: pf.tipo,
						fechaConstitucion: pf.fechaConstitucion,
						fechaVencimiento: pf.fechaVencimiento,
						plazo: pf.plazoVigencia,
						tna: pf.tna,
						capital: pf.capitalInicial,
						interes: pf.interes,
						valorActual: pf.tenenciaValuadaHastaHoy,
						valorFinal: pf.montoCobrar,
					};
				});
			});
		});
	}).delay(2000);
};

SantanderBrowser.prototype.getFondosDeInversion = function() {
	let self = this;
	logger.info(`Getting fondos de inversion ...`);

	return Promise.resolve().then(() => {
		return self.goToMenu('Fondos Comunes de Inversión');
	}).then(() => {
		return self.page.waitForSelector('table.tenencia');
	}).delay(2000).then(() => {
		return self.page.evaluate(() => {
			let scope = angular.element(document.querySelector('#main-view > fondos fondos-tenencia > div.tabla-contenedor')).scope().$parent.cuenta;
			if (scope.tenenciasError) throw 'Tenencias Error. Aborting';

			return [ scope.tenencias.tenenciaFondosSuscritosPesos, scope.tenencias.tenenciaFondosSuscritosDolares ].flatMap(fondos => {
				return fondos.map(fondo => {
					return {
						nombre: fondo.nombreFondo,
						cuotapartes: fondo.cantidadCuotapartes,
						valorCuotaparte: fondo.valorCuotaparte,
						valorActual: fondo.valuacion,
					};
				});
			});
		});
	}).delay(2000);
};

SantanderBrowser.prototype.getTitulosValores = function() {
	let self = this;
	logger.info(`Getting titulos valores ...`);

	return Promise.resolve().then(() => {
		return self.goToMenu('Títulos Valores');
	}).then(() => {
		return self.page.waitForSelector('table.tenencia');
	}).delay(2000).then(() => {
		return self.page.evaluate(() => {
			let scope = angular.element(document.querySelector('#main-view > titulos-valores titulos-valores-tenencia div.tabla-contenedor')).scope().cuenta;
			if (scope.tenenciasError) throw 'Tenencias Error. Aborting';

			return [ scope.tenencias.tenenciasPesos, scope.tenencias.tenenciasDolares ].flatMap(titulos => {
				return titulos.map(titulo => {
					return {
						tipo: titulo.codigoTipoProducto,
						codigo: titulo.codigoEspecieMercado,
						nombre: titulo.descripcion,
						cantidadNominal: titulo.cantidadValorNominal,
						precio: titulo.precioMercado,
						valorActual: titulo.tenenciaValuada,
					};
				});
			});
		});
	}).delay(2000);
};

SantanderBrowser.prototype.goToMenu = function(menuItem) {
	let self = this;
	logger.info(`Going to menu ${menuItem} ...`);

	return Promise.resolve().then(() => {
		return self.page.click('#menubtn');
	}).then(() => {
		return self.page.waitForSelector('#topbar > div.hidder.opened > menu');
	}).delay(2000).then(() => {
		return self.page.$x(`//*[@id="menu"]//obp-controller-menu-item//a[text()="${menuItem}"]`);
	}).then(linkHandler => {
		if (linkHandler.length > 0) {
			return linkHandler[0].click();
		} else {
			throw `Menu item ${menuItem} not found!`;
		}
	}).delay(2000);
};

// ---------

module.exports = SantanderBrowser;
