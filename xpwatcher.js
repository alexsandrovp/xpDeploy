const vscode = require('vscode');
const fs = require('fs');
const xpu = require('./xputils');

function XPWatcher(xpSettings) {
	const self = this;
	const queue = [];

	let executor = null;
	let toaster = null;

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

	const targetPath = vscode.Uri.parse(watchSettings.target);
	const strPattern = xpu.buildGlobPattern(watchSettings.include);
	const pattern = new vscode.RelativePattern(workspace.uri, strPattern);
	const watcher = vscode.workspace.createFileSystemWatcher(pattern);
	if (!watcher) {
		console.warn('xpDeploy: could not create vscode watcher, api error');
		self.invalid = true;
		return;
	}
	
	self.dispose = () => watcher.dispose();

	function createToaster(title) {
		let p, resolve, reject;
		if (!title) title = 'Deploy';
		const t = vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: title,
			cancellable: false
		}, progress => {
			p = progress;
			return new Promise((toasterResolve, toasterReject) => {
				resolve = toasterResolve;
				reject = toasterReject;
			});
		});
		t.then(
			msg => console.debug(msg || 'Deploy (watch): batch done'),
			err => vscode.window.showErrorMessage('Deploy error (watch): ' + err)
		);
		return {progress: p, resolve, reject};
	}

	function execute() {
		let hasErrors = false;
		console.debug('Deploy (watch): starting a new batch');
		while(queue.length) {
			try {
				queue.shift()();
			} catch (error) {
				console.error('xpDeploy watch: ' + error);
				hasErrors = true;
			}
		}
		if (toaster) {
			if (hasErrors) toaster.reject('Some files could not be copied. Please see the console for more information');
			else toaster.resolve();
			toaster = null;
		}
	}

	function processEvent(event) {
		if (!event) return;
		if (!event.file) return;
		if (event.file.scheme !== 'file') return;

		const file = event.file;
		if (!file.path.startsWith(workspace.uri.path)) {
			console.debug('xpDeploy watch: ignoring file not belonging to workspace, ' + file.fsPath);
			return;
		}
		
		if (!fs.existsSync(watchSettings.target)) {
			vscode.window.showErrorMessage('xpDeploy watch: target does not exist: ' + watchSettings.target);
			return;
		}

		vscode.workspace.fs.stat(file).then(
			stats => {
				if (stats.type === vscode.FileType.Directory) {
					console.debug('xpDeploy watch: ignoring directory, ' + file.fsPath);
				} else {
					if (executor) {
						clearTimeout(executor);
						executor = null;
					}

					if (!toaster) {
						toaster = createToaster();
						toaster.progress.report({ message: 'copying' });
					}

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
					} catch (error) {
						console.error('xpDeploy watch: ' + error);
						vscode.window.showErrorMessage('xpDeploy watch: ' + error);
					} finally {
						executor = setTimeout(execute, watchSettings.watchBatchDelay || 600);
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