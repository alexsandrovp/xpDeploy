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

exports.mkdir = mkdir;
exports.getWorkspace = getWorkspace;
