const vscode = require('vscode');
const fs = require('fs');
const xpu = require('./xputils');

function enumerate(workspace, include, exclude) {
	const pattern = new vscode.RelativePattern(workspace.uri.path, include);
	return vscode.workspace.findFiles(pattern, exclude);
}

function workOnFile(workspace, targetPath, file, mapping) {
	let subpath = file.fsPath.substr(workspace.uri.fsPath.length + 1);
	if (mapping && mapping.regex) {
		subpath = subpath.replace(mapping.regex, mapping.replace);
	}
	let dest = vscode.Uri.joinPath(targetPath, subpath);
	dest = dest.scheme + ':' + dest.fsPath;
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

async function deployWithChoice() {
	const xpSettings = vscode.workspace.getConfiguration('xp');
	const deployments = xpSettings.deployments.map(d => d.name).filter(d => (d || '').toString().trim());

	const input = await vscode.window.showQuickPick(deployments);
	deploy(input);
}

function deploy(choiceDeployment) {

	const workspace = xpu.getWorkspace();
	if (!workspace) {
		vscode.window.showErrorMessage('Deploy: no workspace');
		return;
	}

	const xpSettings = vscode.workspace.getConfiguration('xp');
	let selectedDeployment = choiceDeployment;
	if (!selectedDeployment) {
		selectedDeployment = xpSettings.defaultDeployment;
	}
	const deployments = xpSettings.deployments;
	const deployment = deployments.find(i => i.name === selectedDeployment);

	if (!deployment) {
		vscode.window.showErrorMessage('Deploy: invalid deployment: ' + selectedDeployment);
		return;
	}

	if (!fs.existsSync(deployment.target)) {
		vscode.window.showErrorMessage('Deploy: target does not exist: ' + deployment.target);
		return;
	}

	const sources = xpSettings.sources;
	const source = sources.find(i => i.name === deployment.source);

	if (!source) {
		vscode.window.showErrorMessage('Deploy: invalid source: ' + deployment.source);
		return;
	}

	const mapping = {
		regex: new RegExp(source.mapping.regex, 'i'),
		replace: source.mapping.replace
	};

	vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		title: 'Deploy',
		cancellable: false
	}, progress => {
		progress.report({ message: 'coping' });

		return new Promise((commandResolve, commandReject) => {

			const targetPath = vscode.Uri.parse(deployment.target);

			let inclusion = source.include || '';
			if (Array.isArray(inclusion)) {
				inclusion = '{' + inclusion.join(',') + '}';
			} else {
				inclusion = inclusion.toString();
			}

			let exclusion = source.exclude || '';
			if (Array.isArray(exclusion)) {
				exclusion = '{' + exclusion.join(',') + '}';
			} else {
				exclusion = exclusion.toString();
			}

			enumerate(workspace, inclusion, exclusion).then(
				files => workOnFiles(workspace, targetPath, files, mapping, progress, commandResolve, commandReject),
				err => commandReject(err)
			);
		});

	}).then(
		msg => {
			vscode.window.setStatusBarMessage(msg || 'Deploy: all done', 6000);
		},
		err => {
			vscode.window.showErrorMessage('Deploy error: ' + err);
		}
	);
}

exports.deploy = deploy;
exports.deployWithChoice = deployWithChoice;