import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { addflowconfig, deleteflowconfig, packproject, pushproject, flowCrendentials } from './flowconfig';

export function activate(context: vscode.ExtensionContext) {
	// const protocols =[{label: 'grpc:'}, {label: 'ws:'}, {label: 'wss:'}, {label: 'pipe:'}, {label: 'socket:'}, {label: 'http:'}, {label: 'https:'}]

	let disposable = vscode.commands.registerCommand('openiap.addflowconfig', addflowconfig);
	context.subscriptions.push(disposable);
	disposable = vscode.commands.registerCommand('openiap.deleteflowconfig', deleteflowconfig);
	context.subscriptions.push(disposable);
	disposable = vscode.commands.registerCommand('openiap.packproject', packproject);
	context.subscriptions.push(disposable);
	disposable = vscode.commands.registerCommand('openiap.pushproject', pushproject);
	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
