import * as vscode from 'vscode';
import { MultiStepInput } from './multiStepInput';
import { GetUser, RequestUserToken, runCommandInOutputWindow, UploadPackage } from './util';
import * as path from 'path';
import * as fs from 'fs';

const protocols =[{label: 'grpc:'}, {label: 'ws:'}, {label: 'wss:'}, {label: 'pipe:'}, {label: 'socket:'}, {label: 'http:'}, {label: 'https:'}]
const yesno =[{label: 'Yes'}, {label: 'No'}]
function shouldResume() {
	// Could show a notification with the option to resume.
	return new Promise<boolean>((resolve, reject) => {
		// noop
		// resolve(true)
        resolve(false)
	});
}
export interface flowCrendentials {
	apidomain: string;
	webdomain: string;
	apiurl: string;
	jwt: string;
}

export async function addflowconfig() {
    MultiStepInput.run(async input => {
        try {
            const protocol = await input.showQuickPick({
                title: "Add Flow Configuration",
                step: 1,
                totalSteps: 2,
                placeholder: 'Choose a protocol',
                items: protocols,
                activeItem: protocols[0],
                shouldResume: shouldResume
            });
            let apidomain = 'app.openiap.io';
            if(protocol.label == 'grpc:') apidomain = 'grpc.app.openiap.io';
            apidomain = await input.showInputBox({
                title: "Add Flow Configuration",
                step: 2,
                totalSteps: 3,
                value: apidomain,
                prompt: 'Enter API domain',
                validate: async (value) => {
                    if(value == '') return 'API URL is required';
                    return undefined;
                },
                shouldResume: shouldResume
            });
            var webdomain = apidomain;
            if(apidomain.startsWith('grpc.')) {
                webdomain = apidomain.substring(5);
            }
            try {
                var credentials = vscode.workspace.getConfiguration().get<flowCrendentials[]>('openiap.flow.credentials');
                if(credentials == undefined || credentials.length == 0) credentials = [];
                var exists = credentials.find(x => x.apidomain == apidomain);
                if(exists != undefined) {
                    if(!await InputConfirm(input, "Flow configuration already exists, do you want to overwrite it?")) {
                        return
                    }
                }
            } catch (error) {
                console.error(error);                
            }

            let jwt:string = "";
            const username = await input.showInputBox({
                title: "Add Flow Configuration",
                step: 3,
                totalSteps: 3,
                value: '',
                prompt: 'Enter Username, or leave empty to login using browser',
                validate: async (value) => {
                    // if(value == '') return 'Username is required';
                    return undefined;
                },
                shouldResume: shouldResume
            });
            let password = "";
            let port = "";
            let pathname = "";
            if(username != "") {
                password = await input.showInputBox({
                    title: "Add Flow Configuration",
                    step: 2,
                    totalSteps: 2,
                    value: '',
                    prompt: 'Enter Password',
                    validate: async (value) => {
                        if(value == '') return 'Password is required';
                        return undefined;
                    },
                    shouldResume: shouldResume
                });
            } else {
                var prot = "http:"
                if(protocol.label != 'ws:' && protocol.label != 'wss:') {
                    if(webdomain == "app.openiap.io") {
                        prot = "https:"
                    } else {
                        const secure = await input.showQuickPick({
                            title: "Add Flow Configuration",
                            step: 3,
                            totalSteps: 3,
                            placeholder: 'Is the API secure/using https?',
                            items: yesno,
                            activeItem: yesno[0],
                            shouldResume: shouldResume
                        });
                        if(secure.label == 'Yes') {
                            prot = "https:"
                        } else {
                            prot = "http:"
                        }
                    }
                } else if(protocol.label == 'ws:') {
                    prot = "http:"
                } else if(protocol.label == 'wss:') {
                    prot = "https:"
                }
                if(protocol.label != 'ws:' && protocol.label != 'wss:' && protocol.label != 'http:' && protocol.label != 'https:') {
                    port = ":80"
                    if(prot == "https:") {
                        port = ":443"
                    }
                } else if (protocol.label == 'ws:' || protocol.label == 'wss:'){
                    pathname = "/ws/v2"
                } else if (protocol.label == 'http:' || protocol.label == 'https:'){
                    pathname = "/api/v2"
                }
                jwt = await RequestUserToken(prot + '//' + webdomain);
            }
            var apiurl = protocol.label + '//' + apidomain + port + pathname;
            if(username != "" && password != "") {
                apiurl = protocol.label + '//' + username + ':' + password + '@' + apidomain + port + pathname;
            }

            var user = await GetUser(apiurl, jwt);
            if(user == null) {
                vscode.window.showErrorMessage('Failed to get user');
                return;
            }
            try {
                if(credentials != null) {
                    credentials = credentials.filter(x => x.webdomain != webdomain);
                    credentials.push({apiurl, apidomain, webdomain, jwt});
                } else {
                    credentials = [{apiurl, apidomain, webdomain, jwt}]
                }
            } catch (error) {
                credentials = [{apiurl, apidomain, webdomain, jwt}]                
            }
            await vscode.workspace.getConfiguration().update('openiap.flow.credentials', credentials, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(`Added new flow configuration for ${apidomain}`);
        } catch (error: any) {
            vscode.window.showErrorMessage(error.message);
        }
    });
}
function ConfirmIt(message: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
        vscode.window.showInformationMessage(message, "Yes", "No").then((value) => {
            if(value == "Yes") {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
}
async function InputConfirm(input: MultiStepInput, message: string): Promise<boolean> {
    const confirmit = await input.showQuickPick({
        title: message,
        step: 3,
        totalSteps: 3,
        placeholder: message,
        items: yesno,
        activeItem: yesno[0],
        shouldResume: shouldResume
    });
    if(confirmit.label == 'Yes') {
        return true
    }
    return false
}
 
export async function deleteflowconfig() {
    MultiStepInput.run(async input => {
        var credentials = vscode.workspace.getConfiguration().get<flowCrendentials[]>('openiap.flow.credentials');
        // @ts-ignore
        if(credentials == null || credentials.length == 0 || credentials == false) {
            vscode.window.showInformationMessage(`No configurations found`);
            return;
        }
        var configurations = credentials.map(x => {return {label: x.apidomain}});

        const configpick = await input.showQuickPick({
            title: "Select Configuration to delete",
            step: 1,
            totalSteps: 2,
            placeholder: 'Choose a protocol',
            items: configurations,
            activeItem: protocols[0],
            shouldResume: shouldResume
        });
        if(configpick != null && configpick.label != null && configpick.label != "") {
            if(await InputConfirm(input, `Are you sure you want to delete the configuration for ${configpick.label}?`) == false) {
                return;
            }
            credentials = credentials.filter(x => x.apidomain != configpick.label);
            await vscode.workspace.getConfiguration().update('openiap.flow.credentials', credentials, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(`Deleted flow configuration for ${configpick.label}`);
        }
    });
}
async function pack():Promise<string> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open');
        return "";
    }
    var project = require(workspaceFolder.uri.fsPath + '/package.json');
    if(project == undefined) {
        vscode.window.showErrorMessage('No package.json found in workspace please run npm init first');
        return "";
    }
    if(project.name == undefined) {
        vscode.window.showErrorMessage('No name found in package.json');
        return "";
    }
    var name = project.name.replace("/","-").replace("@", "") + "-" + project.version;
    await runCommandInOutputWindow(['pack'], workspaceFolder.uri.fsPath);
    return path.join(workspaceFolder.uri.fsPath, name + '.tgz');
}
export async function packproject() {
    var filename = await pack()
    if(filename == "") {
        return;
    }
    if(!fs.existsSync(filename)) {
        vscode.window.showErrorMessage(`Failed to pack project, ${filename} + " does not exist`);
        return;
    }
    vscode.window.showInformationMessage(`Packed project to ${filename}`);
}
export async function pushproject() {
    var credentials = vscode.workspace.getConfiguration().get<flowCrendentials[]>('openiap.flow.credentials');
    // @ts-ignore
    if(credentials == undefined || credentials.length == 0 || credentials == false) credentials = [];
    if(credentials.length == 0) {
        vscode.window.showErrorMessage(`No configurations found`);
        return;
    }
    var apiurl = ""; var jwt = "";
    if(credentials.length > 1) {
        var labels = credentials.map(x => {return {label: x.apidomain}});
        const input = vscode.window.createQuickPick();
        input.title = "Select Configuration to use";
        input.step = 1;
        input.totalSteps = 1;
        input.placeholder = "Select Configuration to use";
        input.items = labels
        input.activeItems = [labels[0]];
        input.show();
        await new Promise(resolve => input.onDidAccept(resolve));
        var selected = input.selectedItems[0];
        input.hide();
        apiurl = credentials.filter(x => x.apidomain == selected.label)[0].apiurl;
        jwt = credentials.filter(x => x.apidomain == selected.label)[0].jwt;
    } else {
        apiurl = credentials[0].apiurl;
        jwt = credentials[0].jwt;
    }
    if(fs.existsSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/package.json') == false) {
        vscode.window.showErrorMessage(`No package.json found in workspace, please run npm init first`);
        return;
    }
    // var project = require(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/package.json');
    var json = fs.readFileSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/package.json', 'utf8');
    var project = JSON.parse(json);
    
    var filename = await pack()
    if(filename == "") {
        return;
    }
    if(!fs.existsSync(filename)) {
        vscode.window.showErrorMessage(`Failed to pack project, ${filename} + " does not exist`);
        return;
    }
    await UploadPackage(apiurl, filename, project, jwt);
    vscode.window.showInformationMessage(`Pushed ${filename} to ${apiurl}`);
}
