// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const xpcmd = require('./xpcommands');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "xp" is now active!');

	const xpSettings = vscode.workspace.getConfiguration('xp');
	if (xpSettings.createButton) {
		const button = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
		button.text = (xpSettings.createButton.label || '').toString().trim() || 'xpDeploy';
		let buttonCmd = xpSettings.createButton.withChoice ? 'xp.deployWithChoice' : 'xp.deploy';
		button.command = buttonCmd;
		button.show();
	}

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('xp.deploy', function () {
		xpcmd.deploy();
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('xp.deployWithChoice', function () {
		xpcmd.deployWithChoice();
	});
	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}
