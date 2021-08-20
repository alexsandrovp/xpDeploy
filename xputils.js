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
	if (checkTargetExists && !fs.existsSync(deployment.target)) return 'invalid configuration, selected target path does not exist';

	return null;
}

function getSettingsError(xpSettings) {
	if (!xpSettings) return 'invalid configuration, settings is null';

	let deployments = xpSettings.deployments;
	if (!deployments) return null;
	
	if (xpSettings.defaultDeployment) {
		const deployment = deployments.find(d => d.name === xpSettings.defaultDeployment);
		if (!deployment) return 'invalid configuration, "defaultDeployment" not defined in "deployments" section';
		const err = checkDeploymentSetting(xpSettings, deployment, true);
		if (err) return err;
	}

	return null;
}

function selectDeployment(xpSettings, deploymentName) {
	if (!deploymentName) return null;
	if (!xpSettings.deployments || !xpSettings.deployments.length) {
		return null;
	}
	const deployment = xpSettings.deployments.find(d => d.name === deploymentName);
	const err = checkDeploymentSetting(xpSettings, deployment, true);
	if (err) return null;

	const source = xpSettings.sources.find(d => d.name === deployment.source);
	if (!source) return null;
	const ret = {};
	ret.target = deployment.target;
	ret.include = source.include || '**/*';
	if (Array.isArray(ret.include)) {
		ret.include = ret.include.filter(i => (i || '').toString().trim());
	}
	if (!ret.include.length) ret.include = '**/*';
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