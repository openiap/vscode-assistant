import * as vscode from 'vscode';
import { MultiStepInput } from './multiStepInput';
import { GetUser, RequestUserToken, runCommandInOutputWindow, UploadPackage } from './util';
import * as path from 'path';
import * as fs from 'fs';
const JSON5 = require('json5')

const protocols = [{ label: 'grpc:' }, { label: 'ws:' }, { label: 'wss:' }, { label: 'pipe:' }, { label: 'socket:' }, { label: 'http:' }, { label: 'https:' }]
const yesno = [{ label: 'Yes' }, { label: 'No' }]
function shouldResume() {
    // Could show a notification with the option to resume.
    return new Promise<boolean>((resolve, reject) => {
        // noop
        // resolve(true)
        resolve(false)
    });
}
export interface flowCrendentials {
    name: string;
    username: string;
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
            if (protocol.label == 'grpc:') apidomain = 'grpc.app.openiap.io';
            apidomain = await input.showInputBox({
                title: "Add Flow Configuration",
                step: 2,
                totalSteps: 3,
                value: apidomain,
                prompt: 'Enter API domain',
                validate: async (value) => {
                    if (value == '') return 'API URL is required';
                    return undefined;
                },
                shouldResume: shouldResume
            });
            var webdomain = apidomain;
            if (apidomain.startsWith('grpc.')) {
                webdomain = apidomain.substring(5);
            }
            try {
                var credentials = vscode.workspace.getConfiguration().get<flowCrendentials[]>('openiap.flow.credentials');
                if (credentials == undefined || credentials.length == 0) credentials = [];
            } catch (error) {
                console.error(error);
            }

            let jwt: string = "";
            let username = await input.showInputBox({
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

            var prot = "http:"
            if (protocol.label != 'ws:' && protocol.label != 'wss:') {
                if (webdomain == "app.openiap.io") {
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
                    if (secure.label == 'Yes') {
                        prot = "https:"
                    } else {
                        prot = "http:"
                    }
                }
            } else if (protocol.label == 'ws:') {
                prot = "http:"
            } else if (protocol.label == 'wss:') {
                prot = "https:"
            }
            if (protocol.label != 'ws:' && protocol.label != 'wss:' && protocol.label != 'http:' && protocol.label != 'https:') {
                port = ":80"
                if (prot == "https:") {
                    port = ":443"
                }
            } else if (protocol.label == 'ws:' || protocol.label == 'wss:') {
                pathname = "/ws/v2"
            } else if (protocol.label == 'http:' || protocol.label == 'https:') {
                pathname = "/api/v2"
            }
            if (username != "") {
                password = await input.showInputBox({
                    title: "Add Flow Configuration",
                    step: 2,
                    totalSteps: 2,
                    value: '',
                    prompt: 'Enter Password',
                    validate: async (value) => {
                        if (value == '') return 'Password is required';
                        return undefined;
                    },
                    shouldResume: shouldResume
                });
            } else {
                jwt = await RequestUserToken(prot + '//' + webdomain);
            }
            
            var apiurl = protocol.label + '//' + apidomain + port + pathname;
            if (username != "" && password != "") {
                apiurl = protocol.label + '//' + username + ':' + password + '@' + apidomain + port + pathname;
            }

            var user = await GetUser(apiurl, jwt);
            if (user == null) {
                vscode.window.showErrorMessage('Failed to get user');
                return;
            }
            username = user.username;
            var name = apidomain + " (" + username + ")";
            try {
                if (credentials != null) {
                    credentials = credentials.filter(x => x.webdomain != webdomain);
                    credentials.push({ apiurl, apidomain, webdomain, jwt, name, username });
                } else {
                    credentials = [{ apiurl, apidomain, webdomain, jwt, name, username }]
                }
            } catch (error) {
                credentials = [{ apiurl, apidomain, webdomain, jwt, name, username }]
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
            if (value == "Yes") {
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
    if (confirmit.label == 'Yes') {
        return true
    }
    return false
}

export async function deleteflowconfig() {
    MultiStepInput.run(async input => {
        var credentials = vscode.workspace.getConfiguration().get<flowCrendentials[]>('openiap.flow.credentials');
        // @ts-ignore
        if (credentials == null || credentials.length == 0 || credentials == false) {
            vscode.window.showInformationMessage(`No configurations found`);
            return;
        }
        var configurations = credentials.map(x => { return { label: x.name } });

        const configpick = await input.showQuickPick({
            title: "Select Configuration to delete",
            step: 1,
            totalSteps: 2,
            placeholder: 'Choose a protocol',
            items: configurations,
            activeItem: protocols[0],
            shouldResume: shouldResume
        });
        if (configpick != null && configpick.label != null && configpick.label != "") {
            if (await InputConfirm(input, `Are you sure you want to delete the configuration for ${configpick.label}?`) == false) {
                return;
            }
            credentials = credentials.filter(x => x.name != configpick.label);
            await vscode.workspace.getConfiguration().update('openiap.flow.credentials', credentials, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(`Deleted flow configuration for ${configpick.label}`);
        }
    });
}
async function pack(): Promise<string> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open');
        return "";
    }
    var project = { name: "na", version: "0.0.0" };
    if (fs.existsSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/package.json') == true) {
        var json = fs.readFileSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/package.json', 'utf8');
        project = JSON5.parse(json);
    } else {
        vscode.window.showErrorMessage('No package.json found in workspace please run npm init first');
        return "";

    }
    if (project.name == undefined) {
        vscode.window.showErrorMessage('No name found in package.json');
        return "";
    }
    var name = project.name.replace("/", "-").replace("@", "") + "-" + project.version;
    await runCommandInOutputWindow(['pack'], workspaceFolder.uri.fsPath);
    return path.join(workspaceFolder.uri.fsPath, name + '.tgz');
}
export async function packproject() {
    var filename = await pack()
    if (filename == "") {
        return;
    }
    if (!fs.existsSync(filename)) {
        vscode.window.showErrorMessage(`Failed to pack project, ${filename} + " does not exist`);
        return;
    }
    vscode.window.showInformationMessage(`Packed project to ${filename}`);
}
export async function userSelectConfiguration(): Promise<flowCrendentials | null> {
    var credentials = vscode.workspace.getConfiguration().get<flowCrendentials[]>('openiap.flow.credentials');
    // @ts-ignore
    if (credentials == undefined || credentials.length == 0 || credentials == false) credentials = [];
    if (credentials.length == 0) {
        vscode.window.showErrorMessage(`No configurations found`);
        return null;
    }
    if (credentials.length > 1) {
        var labels = credentials.map(x => { return { label: x.name } });
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
        var result = credentials.find(x => x.name == selected.label)
        return ((result != null && result != undefined) ? result : null)
    } else {
        return credentials[0]
    }
}
export async function pushproject() {
    if (fs.existsSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/package.json') == false) {
        vscode.window.showErrorMessage(`No package.json found in workspace, please run init first`);
        return;
    }
    var credentials = await userSelectConfiguration();
    if (credentials == null) return;
    var json = fs.readFileSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/package.json', 'utf8');
    var project = JSON5.parse(json);

    var filename = await pack()
    if (filename == "") {
        return;
    }
    if (!fs.existsSync(filename)) {
        vscode.window.showErrorMessage(`Failed to pack project, ${filename} + " does not exist`);
        return;
    }
    await UploadPackage(credentials.apiurl, filename, project, credentials.jwt);
    vscode.window.showInformationMessage(`Pushed ${filename} to ${credentials.apiurl}`);
}
export async function addpackageconfig() {
    var credentials = await userSelectConfiguration();
    _addpackageconfig(credentials)
    vscode.window.showInformationMessage(`Project initialised, please edit package.json to your needs`);
}
export async function _addpackageconfig(credentials: flowCrendentials | null) {
    if (credentials == null) return;


    // is workspace empty ?
    var _files = fs.readdirSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath as string);
    if (_files.length == 0) {
        fs.writeFileSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/main.py', `import openiap, asyncio
from openiap import Client
async def __wait_for_message(cli:Client, message, payload):
    workitem = await cli.PopWorkitem("testq")
    if workitem != None:
        workitem.state = "successful"
        cli.UpdateWorkitem(workitem, None, True)
async def onconnected(cli:Client):
    try:
        await cli.Signin()
        print("Connected to OpenIAP") 
        queuename = await cli.RegisterQueue("", __wait_for_message)
        print(f"Consuming queue {queuename}")
        result = await cli.Query(collectionname="entities", projection={"_created": 1, "name": 1, "_type": 1})
        print(result)
        
    except Exception as e:
        print(e)
    # cli.Close()
async def main():
    client = openiap.Client()
    client.onconnected = onconnected
    await asyncio.sleep(2)
    while client.connected:
        await asyncio.sleep(1)
asyncio.run(main())`);
        fs.writeFileSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/main.js', `const { openiap } = require("@openiap/nodeapi");
async function main() {
    var client = new openiap();
    await client.connect();
    var localqueue = await client.RegisterQueue({ queuename:""}, async (msg, payload, user, jwt)=> {
        var wi = await client.PopWorkitem({"wiq": "testq"});
        if(wi == null) {
            console.log("No workitem found");
            return;
        }
        // simulate work
        await new Promise(resolve => { setTimeout(resolve, 5000) });
        wi.state = "successful";
        await client.UpdateWorkitem({workitem: wi});
        console.log("Updated workitem");
    })
    console.log("listening on " + localqueue);
    var result = await client.Query({query: {}, projection: {"_created":1, "name":1}, top:5})
    console.log(JSON.stringify(result, null, 2))
}
main();`);
    }


    var json = `{
        "name": "",
        "version": "0.0.1",
        "description": "Example agent, please change",
        "main": "main.js",
        "openiap": {
            "daemon": false,
            "chromium": false
        }
    }`
    if (fs.existsSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/package.json') == true) {
        json = fs.readFileSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/package.json', 'utf8');
    }
        
    // get workspace's parent folder name 
    var parentname = vscode.workspace.workspaceFolders?.[0].uri.fsPath.split("/").pop();

    var project = JSON5.parse(json);
    if (project.openiap == null) project.openiap = {};
    if((project.main == null || project.main == "") || (project.openiap.language == null || project.openiap.language == "") ) {
        var files = await vscode.workspace.findFiles('**/*.ts', '**/node_modules/**');
        if (files.length == 0) {
            files = await vscode.workspace.findFiles('**/*.js', '**/node_modules/**');
            if (files.length > 0) {
                project.openiap.language = "nodejs";
                project.openiap.typescript = false;
            }
        } else {
            project.openiap.language = "nodejs";
            project.openiap.typescript = true;
        }
        if (files.length == 0) {
            files = await vscode.workspace.findFiles('**/*.py', '**/node_modules/**');
            if (files.length > 0) project.openiap.language = "python";
        } 
        if (files.length == 0) {
            files = await vscode.workspace.findFiles('**/*.csproj', '**/node_modules/**');
            if (files.length > 0) project.openiap.language = "dotnet";
        }
        if (files.length == 0) {
            files = await vscode.workspace.findFiles('**/*.vbproj', '**/node_modules/**');
            if (files.length > 0) project.openiap.language = "dotnet";
        }
        if (files.length > 0 && (project.main == null || project.main == "")) {
            var name:string = files[0].fsPath.replace(vscode.workspace.workspaceFolders?.[0].uri.fsPath as any, "");
            if(name.startsWith("/") || name.startsWith("\\")) name = name.substring(1);
            if (project.openiap.language != "dotnet") {
                project.main = name;
            }
        }
    }
    var updateapi = false;
    if (project.name == "" || project.name == null) project.name = parentname;
    if (project.main.indexOf(".js") > 0) {
        if (project.scripts == null) project.scripts = {};
        if (project.scripts.updateapi == null) {
            project.scripts.updateapi = "npm uninstall @openiap/nodeapi && npm i @openiap/nodeapi"
            updateapi = true;
        } else {
            if (fs.existsSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/node_modules/@openiap/nodeapi') == false) {
                updateapi = true;
            }

        }
    } else if (project.main.indexOf(".py") > 0) {
        if (fs.existsSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/requirements.txt') == false) {
            fs.writeFileSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/requirements.txt', `openiap`);
        } else {
            var requirements = fs.readFileSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/requirements.txt', 'utf8');
            if (requirements.indexOf('openiap') < 0) {
                fs.writeFileSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/requirements.txt', requirements + `\nopeniap`);
            }
        }
    }
    if (project.openiap.daemon == null) project.openiap.daemon = false;
    if (project.openiap.chromium == null) project.openiap.chromium = false;
    fs.writeFileSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/package.json', JSON.stringify(project, null, 4));

    if (updateapi) {
        await runCommandInOutputWindow(['run updateapi'], vscode.workspace.workspaceFolders?.[0].uri.fsPath);
    }
}
export async function initproject() {
    var credentials = await userSelectConfiguration();
    if (credentials == null) return;
    await _addpackageconfig(credentials)
    await _addlaunchconfig(credentials)
    vscode.window.showInformationMessage(`Project initialised, please edit package.json to your needs`);

}
export async function addlaunchconfig() {
    var credentials = await userSelectConfiguration();
    _addlaunchconfig(credentials)
    vscode.window.showInformationMessage(`Launch checked`);
}
export async function _addlaunchconfig(credentials: flowCrendentials | null) {
    try {
        if (credentials == null) return;
        var project: any = {}
        if (fs.existsSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/package.json') == true) {
            var json = fs.readFileSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/package.json', 'utf8');
            project = JSON5.parse(json);
        } else {
            vscode.window.showInformationMessage(`package.json missing, please run initproject first`);
            return;
        }
        // make sure .vscode filder exists and check if launch.json exists
        if (fs.existsSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/.vscode') == false) {
            fs.mkdirSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/.vscode');
        }
        if (fs.existsSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/.vscode/launch.json') == false) {
            var _files = fs.readdirSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath as string);
            if(_files.indexOf('main.py') > 0 && _files.indexOf('main.js') > 0) {
                fs.writeFileSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/.vscode/launch.json', `{
                    "version": "0.2.0",
                    "configurations": [
                        {
                            "type": "node",
                            "request": "launch",
                            "name": "NodeJS: Run main.js",
                            "skipFiles": [
                                "<node_internals>/**"
                            ],
                            "program": "\${workspaceFolder}/main.js",
                            "console": "integratedTerminal",
                            "env": {
                                "apiurl": "${credentials.apiurl}",
                                "jwt": "${credentials.jwt}"
                        
                            }
                        },
                        {
                            "name": "Python: Run main.pyt",
                            "type": "python",
                            "request": "launch",
                            "program": "main.py",
                            "console": "integratedTerminal",
                            "env": {
                                "apiurl": "${credentials.apiurl}",
                                "jwt": "${credentials.jwt}"
                        
                            }
                        }
                    ]
                }`);
            } else {
                fs.writeFileSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/.vscode/launch.json', `{
                    "version": "0.2.0",
                    "configurations": [
                    ]
                }`);
            }


        }
        var configuration: any = null;
        var json = fs.readFileSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/.vscode/launch.json', 'utf8');
        var launch = JSON5.parse(json);
        for(var i = 0; i < launch.configurations.length; i++) {
            if(launch.configurations[i].program.indexOf(project.main) > 0) {
                configuration = launch.configurations[i];
            }
        }
        if(configuration == null && launch.configurations.length == 1) configuration = launch.configurations[0];
        if(configuration == null) {
            if (project.openiap.language == "python") {
                configuration = {
                    "name": "Python: Run "+ project.main,
                    "type": "python",
                    "request": "launch",
                    "program": project.main,
                    "console": "integratedTerminal",
                };
                launch.configurations.push(configuration);
            } else if (project.openiap.language == "nodejs") {
                if(project.openiap.typescript == true && project.main.endsWith(".ts")) {
                    configuration =         {
                        "type": "node",
                        "request": "launch",
                        "name": "TypeScript: Run " + project.main,
                        "runtimeArgs": [
                            "--loader",
                            "ts-node/esm"
                        ],
                        "skipFiles": [
                            "<node_internals>/**"
                        ],
                        "program": `\${workspaceFolder}/${project.main}`,
                        "console": "integratedTerminal"
                    }
                    // not needed anymore
                    // var files = await vscode.workspace.findFiles('**/nodemon.json', '**/node_modules/**');
                    // if(files.length == 0) {
                    //     fs.writeFileSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/nodemon.json', `{
                    //         "execMap": {
                    //             "ts": "ts-node"
                    //         }
                    //     }`);
                    // }
                } else {
                    configuration = {
                        "type": "node",
                        "request": "launch",
                        "name": "NodeJS: Run " + project.main,
                        "skipFiles": [
                            "<node_internals>/**"
                        ],
                        "program": `\${workspaceFolder}/${project.main}`,
                        "console": "integratedTerminal",
                    };
                }
                launch.configurations.push(configuration);
            } else if (project.openiap.language == "dotnet") {
                configuration = {
                    "name": ".NET Core Launch ${project.name}",
                    "type": "coreclr",
                    "request": "launch",
                    "preLaunchTask": "build",
                    "program": `\${workspaceFolder}/bin/Debug/net6.0/${project.name}.dll`,
                    "console": "integratedTerminal",
                    "stopAtEntry": false,
                    "cwd": "${workspaceFolder}",
                };
                launch.configurations.push(configuration);
            }
        }
        if(configuration == null) {
            vscode.window.showInformationMessage(`Error adding launch.json`);
            return;
        }
        if(configuration.env == null) configuration.env = {};
        configuration.env.apiurl = credentials.apiurl;
        configuration.env.jwt = credentials.jwt;
        for(var i = 0; i < launch.configurations.length; i++) {
            var conf = launch.configurations[i];
            if(conf != null&& conf.env != null && conf.env.apiurl != null && conf.env.jwt != null) {
                conf.env.apiurl = credentials.apiurl;
                conf.env.jwt = credentials.jwt;
            }
        }
        fs.writeFileSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/.vscode/launch.json', JSON.stringify(launch, null, 4));
    } catch (error) {
        console.error(error);
        vscode.window.showInformationMessage(`Error adding launch.json`);
    }
}

