// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const xpcmd = require('./xpcommands');
const xpwatch = require('./xpwatcher');
const xpu = require('./xputils');

let xpwatcher = null;
let xpSettings = null;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Extension "xp" is now active');

	xpSettings = vscode.workspace.getConfiguration('xp');
	const error = xpu.getSettingsError(xpSettings);
	if (error) {
		console.error('Extension "xp" settings error: ' + error);
		vscode.window.showErrorMessage('xpDeploy: ' + error);
		return;
	}

	xpcmd.createButton(xpSettings);

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('xp.deploy', function () {
		xpcmd.deploy(xpSettings);
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('xp.deployWithChoice', function () {
		xpcmd.deployWithChoice(xpSettings);
	});
	context.subscriptions.push(disposable);

	if (xpSettings.watch) {
		xpwatcher = new xpwatch.XPWatcher(xpSettings);
		if (xpwatcher && xpwatcher.invalid) {
			xpwatcher = null;
			vscode.window.showErrorMessage('Could not create workspace watcher, files will not be automatically deployed when changed');
		}
	}
}

// this method is called when your extension is deactivated
function deactivate() {
	if (xpwatcher) xpwatcher.dispose();
}

module.exports = {
	activate,
	deactivate
}
