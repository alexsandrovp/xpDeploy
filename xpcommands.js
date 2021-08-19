const vscode = require('vscode');
const fs = require('fs');
const xpu = require('./xputils');

function enumerate(workspace, include, exclude) {
	const pattern = new vscode.RelativePattern(workspace.uri.path, include);
	return vscode.workspace.findFiles(pattern, exclude);
}

function workOnFile(workspace, targetPath, file, mapping) {
	let subpath = file.path.substr(workspace.uri.path.length + 1);
	console.log('------------');
	console.log('copying file ' + file.fsPath);
	console.log('relative path ' + subpath);

	if (mapping && mapping.regex) {
		//console.log('applying mapping ' + mapping.regex.toString() + ' -> ' + mapping.replace);
		subpath = subpath.replace(mapping.regex, mapping.replace);
		console.log('mapped relative path ' + subpath);
	}
	let dest = vscode.Uri.joinPath(targetPath, subpath);
	dest = dest.scheme + ':' + dest.fsPath;
	console.log('destination path ' + dest);
	xpu.mkdir(dest);
	fs.copyFileSync(file.fsPath, dest);
}

function workOnFiles(workspace, targetPath, files, mapping, progress, commandResolve, commandReject) {
	progress.report({ message: 'coping' });
	setTimeout(() => {
		try {
			files.forEach(file => workOnFile(workspace, targetPath, file, mapping));
			commandResolve();
		} catch (err) {
			commandReject(err);
		}
	});
}

async function deployWithChoice(xpSettings) {
	const deployments = xpSettings.deployments.map(d => d.name).filter(d => (d || '').toString().trim());
	if (deployments.length === 1) {
		deploy(xpSettings, deployments[0]);
		return;
	}
	const input = await vscode.window.showQuickPick(deployments);
	if (input) deploy(xpSettings, input);
}

function deploy(xpSettings, choiceDeployment) {

	const workspace = xpu.getWorkspace();
	if (!workspace) {
		vscode.window.showErrorMessage('Deploy: no workspace');
		return;
	}

	let selectedDeployment = choiceDeployment;
	if (!selectedDeployment) {
		selectedDeployment = xpSettings.defaultDeployment;
	}
	const deployment = xpu.selectDeployment(xpSettings, selectedDeployment);
	if (!deployment) {
		vscode.window.showErrorMessage('xpDeploy: could not select deployment ' + selectedDeployment);
		return;
	}
	if (!fs.existsSync(deployment.target)) {
		vscode.window.showErrorMessage('xpDeploy: target does not exist: ' + deployment.target);
		return;
	}

	vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		title: 'Deploy',
		cancellable: false
	}, progress => {
		progress.report({ message: 'coping' });
		return new Promise((commandResolve, commandReject) => {
			const targetPath = vscode.Uri.parse(deployment.target);
			const inclusion = xpu.buildGlobPattern(deployment.include);
			const exclusion = xpu.buildGlobPattern(deployment.exclude);
			enumerate(workspace, inclusion, exclusion).then(
				files => workOnFiles(workspace, targetPath, files, deployment.mapping, progress, commandResolve, commandReject),
				err => commandReject(err)
			);
		});
	}).then(
		msg => vscode.window.setStatusBarMessage(msg || 'Deploy: all done', 4000),
		err => vscode.window.showErrorMessage('Deploy error: ' + err)
	);
}

function createButton(xpSettings) {
	if (xpSettings.createButton) {
		const button = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
		button.text = (xpSettings.createButton.label || '').toString().trim() || 'xpDeploy';
		let buttonCmd = xpSettings.createButton.withChoice ? 'xp.deployWithChoice' : 'xp.deploy';
		button.command = buttonCmd;
		button.show();
	}
}

exports.deploy = deploy;
exports.deployWithChoice = deployWithChoice;
exports.createButton = createButton;