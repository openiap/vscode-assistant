import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { addflowconfig, deleteflowconfig, packproject, pushproject, initproject, addpackageconfig, addlaunchconfig, flowCrendentials } from './flowconfig';

export function activate(context: vscode.ExtensionContext) {
	// const protocols =[{label: 'grpc:'}, {label: 'ws:'}, {label: 'wss:'}, {label: 'pipe:'}, {label: 'socket:'}, {label: 'http:'}, {label: 'https:'}]

	var credentials:flowCrendentials[] = [];
	try {
		credentials = vscode.workspace.getConfiguration().get<flowCrendentials[]>('openiap.flow.credentials') as flowCrendentials[];
		// @ts-ignore
		if(credentials == undefined || credentials.length == 0 || credentials == false) credentials = [];
		var exists = credentials.find(x => x.apidomain == "blahblah");
		for(var i = 0; i < credentials.length; i++){
			if(credentials[i].name == "" || credentials[i].name == null){
				credentials[i].name = credentials[i].apidomain;
			}
		}
	} catch (error) {
		credentials = [];
	}
	vscode.workspace.getConfiguration().update('openiap.flow.credentials', credentials, vscode.ConfigurationTarget.Global).then(() => {
		// console.log("credentials updated");
	})

	let disposable = vscode.commands.registerCommand('openiap.addflowconfig', addflowconfig);
	context.subscriptions.push(disposable);
	disposable = vscode.commands.registerCommand('openiap.deleteflowconfig', deleteflowconfig);
	context.subscriptions.push(disposable);
	disposable = vscode.commands.registerCommand('openiap.packproject', packproject);
	context.subscriptions.push(disposable);
	disposable = vscode.commands.registerCommand('openiap.pushproject', pushproject);
	context.subscriptions.push(disposable);
	disposable = vscode.commands.registerCommand('openiap.initproject', initproject);
	context.subscriptions.push(disposable);
	disposable = vscode.commands.registerCommand('openiap.addpackageconfig', addpackageconfig);
	context.subscriptions.push(disposable);
	disposable = vscode.commands.registerCommand('openiap.addlaunchconfig', addlaunchconfig);
	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
