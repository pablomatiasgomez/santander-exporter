'use strict';

const fs = require('fs');
const childProcess = require('child_process');

//----------------------

let Utils = {};

Utils.USER_AGENT_FOR_REQUESTS = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36';

Utils.NO_OP = () => Promise.resolve();

Utils.CURRENT_BUILD = {
	changeset: childProcess.execSync(`git -C ${__project_dir} rev-parse HEAD`).toString().trim(),
	branch: childProcess.execSync(`git -C ${__project_dir} rev-parse --abbrev-ref HEAD`).toString().trim()
};

Utils.filterAsync = (array, filter) => Promise.all(array.map(filter)).then(bits => array.filter(entry => bits.shift()));

Utils.readFromStdin = function(singleChar, ask, getValue) {
	return new Promise((resolve, reject) => {
		let stop = (result) => {
			try {
				process.stdin.setRawMode(false);
				process.stdin.unref();
			} catch(e) {
				// Nothing to do..
			}
			process.stdin.removeListener('data', listener);
			if (typeof result !== 'undefined') {
				resolve(result);
			} else {
				reject("Exiting!");
			}
		};
		let listener = (key) => {
			if (singleChar) console.log(key); // in rawMode, the char doesn't get printed by itself..
			if (key === '\u0003') return stop();
			let value = getValue(key);
			if (typeof value !== 'undefined') return stop(value);
			ask();
		};
		ask();
		try {
			process.stdin.ref();
			process.stdin.setRawMode(singleChar);
		} catch(e) {
			// Nothing to do.
		}
		process.stdin.setEncoding('utf8');
		process.stdin.on('data', listener);
	});
};

Utils.askYesNoQuestion = function(text) {
	let ask = () => console.log(text + ' [y/n]');
	let getValue = (key) => {
		if (key === 'n') return false;
		if (key === 'y') return true;
	};
	return Utils.readFromStdin(true, ask, getValue);
};

// zero-based index, returns the index of the selected option..
Utils.askOptionQuestion = function(text, options) {
	let ask = () => console.log(text + ' Select an option:\n' + options.map((option, i) => i + ". " + option).join('\n'));
	let getValue = (key) => {
		if (!isNaN(key)) {
			let keyNumber = parseInt(key);
			if (keyNumber >= 0 && keyNumber < options.length) return keyNumber;
		}
	};
	return Utils.readFromStdin(true, ask, getValue);
};

Utils.askForSingleLineText = function(text) {
	let ask = () => console.log(text);
	let getValue = (key) => key;
	return Utils.readFromStdin(false, ask, getValue).then(result => {
		if (result && result.charAt(result.length - 1) === '\n') {
			return result.substring(0, result.length - 1);
		}
		return result;
	});
};

Utils.unresolvablePromise = function() {
	return new Promise(() => null);
};

Utils.getPrintableDuration = function(ms) {
	let secs = ms / 1000;
	let mins = secs / 60;
	let hours = mins / 60;
	let days = hours / 24;

	if (days >= 1) {
		return `${Math.floor(days)}d:${Math.floor(days % 1 * 24).pad(2)}h`;
	} else if (hours >= 1) {
		return `${Math.floor(hours)}h:${Math.floor(hours % 1 * 60).pad(2)}m`;
	} else if (mins >= 1) {
		return `${Math.floor(mins)}m:${Math.floor(mins % 1 * 60).pad(2)}s`;
	} else {
		return `${Math.floor(secs)}s`;
	}
};

Utils.getHoursAsMs = function(hours) {
	return hours * 60 * 60 * 1000;
};

Utils.getPrintableDate = function(ms) {
	return new Date(ms).toUTCString();
};

// Both ends inclusive.
// Example: (40, 100)  -> AVG: 70 (40+60/2) MIN: 40. MAX: 100
Utils.getRandomBetween = function(from, to) {
	let rangeSize = to - from + 1;
	return Math.floor(Math.random() * rangeSize + from);
};

Utils.getRandomBoolean = function() {
	return Math.random() >= 0.5;
};

Utils.createFileIfNotExists = function(filePath) {
	try {
		fs.writeFileSync(filePath, '', { flag: 'wx' });
	} catch (e) {
		// Ignore if already exists.
		if (e.code !== 'EEXIST') {
			throw e;
		}
	}
};

module.exports = Utils;