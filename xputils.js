const fs = require('fs');
const path = require('path');
const vscode = require('vscode');

function mkdir(filePath) {
	const d = path.dirname(filePath);
	if (!fs.existsSync(d)) {
		fs.mkdirSync(d, { recursive: true });
	}
}

function getWorkspace(index) {
	index = parseInt(index) || 0;
	if (index < 0) index = 0;
	return vscode.workspace.workspaceFolders
		&& vscode.workspace.workspaceFolders.length
		&& vscode.workspace.workspaceFolders.length > index
		? vscode.workspace.workspaceFolders[index] : null;
}

function checkDeploymentSetting(xpSettings, deployment, checkTargetExists) {
	if (!deployment) return 'invalid configuration, selected deployment is null';
	if (!deployment.source) return 'invalid configuration, selected deployment has no source';
	if (!deployment.target) return 'invalid configuration, selected deployment has no target path';
	if (!xpSettings.sources) return 'invalid configuration, missing "sources" array';
	if (!xpSettings.sources.length) return 'invalid configuration, "sources" array is empty';

	const source = xpSettings.sources.find(i => i.name === deployment.source);
	if (!source) return 'invalid configuration, selected source does not exist, ' + deployment.source;
	if (!source.include) {
		console.warn('invalid configuration, selected source ' + source.name + ' has no include pattern, assuming default as **/*');
		source.include = '**/*';
	}

	if (checkTargetExists && !fs.existsSync(deployment.target)) return 'invalid configuration, selected target path does not exist';

	return null;
}

function getSettingsError(xpSettings) {
	if (!xpSettings) return 'invalid configuration, settings is null';
	const deployments = xpSettings.deployments;
	if (!deployments) return 'invalid configuration, missing "deployments" section';
	if (deployments.length <= 0) return 'invalid configuration, "deployments" section is empty';
	
	if (xpSettings.defaultDeployment) {
		const filtered = deployments.filter(d => d.name === xpSettings.defaultDeployment);
		if (filtered.length <= 0) return 'invalid configuration, "defaultDeployment" not defined in "deployments" section';
		const err = checkDeploymentSetting(xpSettings, filtered[0], true);
		if (err) return err;
	}
	
	if (xpSettings.watch) {
		const filtered = deployments.filter(d => d.name === xpSettings.watch);
		if (filtered.length <= 0) return 'invalid configuration, "watch" not defined in "deployments" section';
		const err = checkDeploymentSetting(xpSettings, filtered[0], true);
		if (err) return err;
	}

	let errors = [];
	deployments.forEach(d => {
		errors.push(checkDeploymentSetting(xpSettings, d, false));
	});

	errors = errors.filter(e => e);
	if (errors.length) return errors.join(', ');
	return null;
}

function selectDeployment(xpSettings, deploymentName) {
	if (!deploymentName) return null;
	const filtered = xpSettings.deployments.filter(d => d.name === deploymentName);
	if (!filtered.length) return null;
	const deployment = filtered[0];
	const source = xpSettings.sources.find(d => d.name === deployment.source);
	if (!source) return null;
	const ret = {};
	ret.target = deployment.target;
	ret.include = source.include;
	if (source.exclude) ret.exclude = source.exclude;
	if (source.mapping && source.mapping.regex) {
		ret.mapping = {
			regex: new RegExp(source.mapping.regex, 'i'),
			replace: source.mapping.replace
		};
	}
	return ret;
}

function buildGlobPattern(pattern) {
	let x = pattern || '';
	if (Array.isArray(x)) {
		x = '{' + x.join(',') + '}';
	} else {
		x = x.toString();
	}
	return x;
}

function Defer() {
	const self = this;
	self.promise = new Promise((resolve, reject) => {
		self.resolve = resolve;
		self.reject = reject;
	});
}

exports.mkdir = mkdir;
exports.getWorkspace = getWorkspace;
exports.getSettingsError = getSettingsError;
exports.selectDeployment = selectDeployment;
exports.buildGlobPattern = buildGlobPattern;
exports.Defer = Defer;