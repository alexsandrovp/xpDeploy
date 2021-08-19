const vscode = require('vscode');
const fs = require('fs');
const xpu = require('./xputils');

function XPWatcher(xpSettings) {
	const self = this;
	const queue = [];

	let executor = null;

	const watchSettings = xpu.selectDeployment(xpSettings, xpSettings.watch);
	if (!watchSettings) {
		console.warn('xpDeploy: invalid settings for fs watcher');
		self.invalid = true;
		return;
	}

	const workspace = xpu.getWorkspace();
	if (!workspace) {
		console.error('xpDeploy watch: no workspace');
		self.invalid = true;
		return;
	}

	const strPattern = xpu.buildGlobPattern(watchSettings.include);
	const pattern = new vscode.RelativePattern(workspace.uri, strPattern);
	const watcher = vscode.workspace.createFileSystemWatcher(pattern);
	if (!watcher) {
		console.warn('xpDeploy: could not create vscode watcher, api error');
		self.invalid = true;
		return;
	}
	
	self.dispose = () => watcher.dispose();

	function execute() {
		const toaster = vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: 'Deploy',
			cancellable: false
		}, progress => {
			progress.report({ message: 'coping' });
			return new Promise((commandResolve, commandReject) => {
				let hasErrors = false;
				while(queue.length) {
					//const runner = queue.shift();
					//if (runner) setTimeout(runner);
					try {
						queue.shift()();
					} catch (error) {
						console.error('xpDeploy watch: ' + error);
						hasErrors = true;
					}
				}
				if (hasErrors) commandReject('Some files could not be copied. Please see the console for more information');
				else commandResolve();
			});
		});

		toaster.then(
			msg => vscode.window.setStatusBarMessage(msg || 'Deploy (watch): all done', 4000),
			err => vscode.window.showErrorMessage('Deploy error (watch): ' + err)
		);
	}

	function processEvent(event) {
		if (!event) return;
		if (!event.file) return;
		if (event.file.scheme !== 'file') return;

		/*
		const workspace = xpu.getWorkspace();
		if (!workspace) {
			console.error('xpDeploy watch: no workspace');
			return;
		}
		*/

		const file = event.file;
		if (!file.path.startsWith(workspace.uri.path)) {
			console.debug('xpDeploy watch: ignoring file not belonging to workspace, ' + file.fsPath);
			return;
		}
		
		if (!fs.existsSync(watchSettings.target)) {
			vscode.window.showErrorMessage('xpDeploy watch: target does not exist: ' + watchSettings.target);
			return;
		}

		const targetPath = vscode.Uri.parse(watchSettings.target);

		if (executor) {
			clearTimeout(executor);
			executor = null;
		}

		vscode.workspace.fs.stat(file).then(
			stats => {
				if (stats.type === vscode.FileType.Directory) {
					console.debug('xpDeploy watch: ignoring directory, ' + file.fsPath);
				} else {
					try {
						console.debug('xpDeploy watch: event type=' + event.type + ', file=' + JSON.stringify(file));
						let subpath = file.path.substr(workspace.uri.path.length + 1);
						if (watchSettings.mapping && watchSettings.mapping.regex) {
							//console.log('applying mapping ' + mapping.regex.toString() + ' -> ' + mapping.replace);
							subpath = subpath.replace(watchSettings.mapping.regex, watchSettings.mapping.replace);
							console.debug('xpDeploy watch: mapped relative path ' + subpath);
						}
						let dest = vscode.Uri.joinPath(targetPath, subpath);
						dest = dest.scheme + ':' + dest.fsPath;
						console.log('xpDeploy watch: destination path ' + dest);
				
						queue.push(() => {
							console.log('xpDeploy watch: copying ' + file.fsPath + ' -> ' + dest);
							xpu.mkdir(dest);
							fs.copyFileSync(file.fsPath, dest);
						});
						executor = setTimeout(execute, 800);
					} catch (error) {
						console.error('xpDeploy watch: ' + error);
						vscode.window.showErrorMessage('xpDeploy watch: ' + error);
					}
				}
			},
			error => {
				console.error('xpDeploy watch: ' + error);
				vscode.window.showErrorMessage('xpDeploy watch: ' + error);
			}
		);

		
	}

	watcher.onDidChange(file => processEvent({type: 'change', file}));
	watcher.onDidCreate(file => processEvent({type: 'create', file}));
	//watcher.onDidDelete(file => processEvent({type: 'delete', file}));
}

exports.XPWatcher = XPWatcher;