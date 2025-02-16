import * as vscode from 'vscode';
import { addflowconfig, deleteflowconfig, flowCrendentials, initproject, initprojectforce, packproject, pushproject, refreshRepositories } from './flowconfig';

export function activate(context: vscode.ExtensionContext) {
	var credentials: flowCrendentials[] = [];
	try {
		credentials = vscode.workspace.getConfiguration().get<flowCrendentials[]>('openiap.flow.credentials') as flowCrendentials[];
		// @ts-ignore
		if (credentials == undefined || credentials.length == 0 || credentials == false) credentials = [];
		var exists = credentials.find(x => x.apidomain == "blahblah");
		for (var i = 0; i < credentials.length; i++) {
			if (credentials[i].name == "" || credentials[i].name == null) {
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
	disposable = vscode.commands.registerCommand('openiap.initprojectforce', initprojectforce);
	context.subscriptions.push(disposable);

	try {
		refreshRepositories();
	} catch (error) {
		
	}
}
export function deactivate() { }
