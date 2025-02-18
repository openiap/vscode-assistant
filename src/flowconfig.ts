import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { MultiStepInput } from './multiStepInput';
import { AppendLineToOutputWindow, findNPMPath, get, GetUser, RequestUserToken, runCommandInOutputWindow, UploadPackage } from './util';
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
                password: false,
                value: apidomain,
                ignoreFocusOut: true,
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
                password: false,
                ignoreFocusOut: true,
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
            if (username != "") {
                password = await input.showInputBox({
                    title: "Add Flow Configuration",
                    step: 2,
                    totalSteps: 2,
                    value: '',
                    password: true,
                    ignoreFocusOut: true,
                    prompt: 'Enter Password',
                    validate: async (value) => {
                        if (value == '') return 'Password is required';
                        return undefined;
                    },
                    shouldResume: shouldResume
                });
            }
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
                    credentials = credentials.filter(x => x.name != name);
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
            AppendLineToOutputWindow(error.message);
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
        try {
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
        } catch (error: any) {
            AppendLineToOutputWindow(error.message);
            vscode.window.showErrorMessage(error.message);
        }
    });
}
async function pack(): Promise<string> {
    try {
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
            vscode.window.showErrorMessage('No package.json found in workspace please run init openiap project first (initproject)');
            return "";
        }
        if (project.name == undefined) {
            vscode.window.showErrorMessage('No name found in package.json');
            return "";
        }
        var name = project.name.replace("/", "-").replace("@", "") + "-" + project.version;
        var cmd = findNPMPath();
        if (cmd != "" && cmd != null) {
            if (fs.existsSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/package.openiap.json') == true) {
                var json = fs.readFileSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/package.openiap.json', 'utf8');
                var tempproject = JSON5.parse(json);
                tempproject.version = project.version;
                fs.writeFileSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/package.openiap.json', JSON.stringify(tempproject, null, 4));

                fs.copyFileSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/package.json', vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/package.json.bak');
                fs.copyFileSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/package.openiap.json', vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/package.json');
                await runCommandInOutputWindow(cmd, ['pack'], workspaceFolder.uri.fsPath);
                fs.copyFileSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/package.json.bak', vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/package.json');
                fs.unlinkSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/package.json.bak');
            } else {
                await runCommandInOutputWindow(cmd, ['pack'], workspaceFolder.uri.fsPath);
            }
        }
        return path.join(workspaceFolder.uri.fsPath, name + '.tgz');
    } catch (error: any) {
        AppendLineToOutputWindow(error.message);
        vscode.window.showErrorMessage(error.message);
        return "";
    }
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
    try {
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
    } catch (error: any) {
        AppendLineToOutputWindow(error.message);
        vscode.window.showErrorMessage(error.message);
        return null;
    }
}
var exampleconfig = {
    "languages": [
        "nodejs",
        "browser",
        "python",
        "dotnet",
        "rust",
        "php",
        "java",
        "c", 
        "binary",
        "powershell",
        "shell"
    ],
    "repositories": [
        {
            "name": "nodejs",
            "description": "Node.js example for most SDK commands",
            "url": "https://github.com/skadefro/nodetest.git"
        },
        {
            "name": "nodejs",
            "description": "Node.js template for processing workitems",
            "url": "https://github.com/openiap/nodeworkitemagent.git"
        },        
        {
            "name": "java",
            "description": "Java example for most SDK commands",
            "url": "https://github.com/skadefro/javatest.git"
        },
        {
            "name": "python",
            "description": "Python example for most SDK commands",
            "url": "https://github.com/skadefro/pythontest.git"
        },
        {
            "name": "python",
            "description": "Python template for processing workitems",
            "url": "https://github.com/openiap/pythonworkitemagent.git"
        },        
        {
            "name": "dotnet",
            "description": "C# example for most SDK commands",
            "url": "https://github.com/skadefro/dotnettest.git"
        },
        {
            "name": "php",
            "description": "PHP example for most SDK commands",
            "url": "https://github.com/skadefro/phptest.git"
        },
        {
            "name": "rust",
            "description": "Rust example with a small CLI for calling some SDK commands",
            "url": "https://github.com/skadefro/rusttest.git"
        },
        {
            "name": "c",
            "description": "C example for most SDK commands",
            "url": "https://github.com/skadefro/ctest.git"
        },
        {
            "name": "binary",
            "description": "Example project for calling a binary on an agent",
            "url": "https://github.com/skadefro/rusttest.git"
        },
        {
            "name": "browser",
            "description": "Vue3 demo website showing most SDK commands",
            "url": "https://github.com/openiap/vue3-web-template.git"
        },
        {
            "name": "browser",
            "description": "AngularJS demo website showing most SDK commands",
            "url": "https://github.com/open-rpa/openflow-web-angularjs-template.git"
        },
        {
            "name": "browser",
            "description": "Angular11 demo website showing most SDK commands",
            "url": "https://github.com/open-rpa/openflow-web-angular11-template.git"
        },
        {
            "name": "browser",
            "description": "Svelte 4 demo implementation of OpenCores frontend",
            "url": "https://github.com/openiap/core-web-arch.git"
        },
        {
            "name": "python",
            "description": "Workitem queue agent example",
            "url": "https://github.com/openiap/pythontest"
        },
        {
            "name": "powershell",
            "description": "Example agent, process a single workitem when linked to a workitem queue",
            "url": "https://github.com/openiap/powershellagent.git"
        },
        {
            "name": "shell",
            "description": "Example agent, process a single workitem when linked to a workitem queue",
            "url": "https://github.com/openiap/shellagent.git"
        }
    ]    
}

export async function refreshRepositories() {
    try {
        // Fetch https://raw.githubusercontent.com/openiap/openiap-assistant-repos/refs/heads/main/repositories.json if possible
        // if not possible, use exampleconfig
        // if not possible, use hardcoded example
        if (exampleconfigupdated == false) { // only fetch once
            exampleconfigupdated = true;
            try {
                var json = await get("https://raw.githubusercontent.com/openiap/openiap-assistant-repos/refs/heads/main/repositories.json");
                if (json != null && json != "") {
                    exampleconfig = JSON.parse(json);
                }
            } catch (error) {
                exampleconfigupdated = true;
            }
        }

    } catch (error: any) {
    }
}
var exampleconfigupdated = false;
export async function userSelectLanguage(): Promise<string | null> {
    try {
        if (exampleconfig.languages.length > 1) {
            var labels = exampleconfig.languages.map(x => { return { label: x } });
            const input = vscode.window.createQuickPick();
            input.title = "Select language";
            input.step = 1;
            input.totalSteps = 1;
            input.placeholder = "Select language to use";
            input.items = labels
            input.activeItems = [labels[0]];
            input.show();
            await new Promise(resolve => input.onDidAccept(resolve));
            var selected = input.selectedItems[0];
            input.hide();
            var result = exampleconfig.languages.find(x => x == selected.label)
            return ((result != null && result != undefined) ? result : null)
        } else {
            return null;
        }
    } catch (error: any) {
        AppendLineToOutputWindow(error.message);
        vscode.window.showErrorMessage(error.message);
        return null;
    }
}
export async function userSelectLanguageProject(): Promise<string | null> {
    return new Promise<string | null>((resolve, reject) => {
        MultiStepInput.run(async input => {
            try {
                const languages = exampleconfig.languages.map(x => { return { label: x } });
                const language = await input.showQuickPick({
                    title: "Select project language",
                    step: 1,
                    totalSteps: 2,
                    placeholder: 'Choose a language',
                    items: languages,
                    activeItem: languages[0],
                    shouldResume: shouldResume
                });
                if (language == null) {
                    return resolve(null);
                }
                const repositories = exampleconfig.repositories.filter(x => x.name == language.label)
                    .map(x => { return { label: x.description, url: x.url } });
                const repository = await input.showQuickPick({
                    title: "Select project",
                    step: 2,
                    totalSteps: 2,
                    placeholder: 'Choose a project',
                    items: repositories,
                    activeItem: repositories[0],
                    shouldResume: shouldResume
                });
                if (repository == null) {
                    return resolve(null);
                }
                const result = repositories.find(x => x.label == repository.label);
                resolve(result?.url ?? null);
            } catch (error: any) {
                AppendLineToOutputWindow(error.message);
                vscode.window.showErrorMessage(error.message);
            }
        });
    });
}
export async function pushproject() {
    try {
        if (fs.existsSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/package.json') == false) {
            vscode.window.showErrorMessage(`No package.json found in workspace, please run init first`);
            return;
        }
        var credentials = await userSelectConfiguration();
        if (credentials == null) return;
        var json = fs.readFileSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/package.json', 'utf8');
        var project = JSON5.parse(json);
        // increase version 
        var version = project.version.split(".");
        version[version.length - 1] = (parseInt(version[version.length - 1]) + 1).toString();
        project.version = version.join(".");
        fs.writeFileSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/package.json', JSON.stringify(project, null, 4));

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
    } catch (error: any) {
        AppendLineToOutputWindow(error.message);
        vscode.window.showErrorMessage(error.message);
    }
}
export async function _setupProjectRepository(credentials: flowCrendentials | null, forced: boolean) {
    try {
        var _files = fs.readdirSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath as string);
        if (_files.length == 0 || forced) {
            if (credentials == null) return;
            if (_files.length > 0 && forced) {
                const input = vscode.window.createQuickPick();
                input.title = "WARNING! Removed all files ?";
                input.step = 1;
                input.totalSteps = 1;
                input.placeholder = "WARNING, this will delete all existing files in the workspace, are you sure?";
                input.items = yesno
                input.activeItems = [yesno[0]];
                input.show();
                await new Promise(resolve => input.onDidAccept(resolve));
                var selected = input.selectedItems[0];
                input.hide();
                if (selected.label != 'Yes') {
                    return;
                }
            }
            const repo = await userSelectLanguageProject();
            if (repo == null) return;
            if (_files.length > 0 && forced) {
                for (var i = 0; i < _files.length; i++) {
                    fs.rmSync(path.join(vscode.workspace.workspaceFolders?.[0].uri.fsPath as string, _files[i]), { recursive: true, force: true });
                }
            }
            const currentfoldername = path.basename(vscode.workspace.workspaceFolders?.[0].uri.fsPath as string);
            const parent = path.dirname(vscode.workspace.workspaceFolders?.[0].uri.fsPath as string);
            await runCommandInOutputWindow("git", ["clone", repo, currentfoldername], parent);
            const gitFolder = path.join(vscode.workspace.workspaceFolders?.[0].uri.fsPath as string, '.git');
            if (fs.existsSync(gitFolder)) {
                fs.rmSync(gitFolder, { recursive: true, force: true });
            }
        }
    } catch (error: any) {
        AppendLineToOutputWindow(error.message);
        vscode.window.showErrorMessage(error.message);
    }
}
export async function initproject() {
    var credentials = await userSelectConfiguration();
    if (credentials == null) return;
    await _setupProjectRepository(credentials, false)
    await _ensureenv(credentials)
    vscode.window.showInformationMessage(`Project initialised, please edit package.json to your needs`);

}
export async function initprojectforce() {
    var credentials = await userSelectConfiguration();
    if (credentials == null) return;
    await _setupProjectRepository(credentials, true)
    await _ensureenv(credentials)
    vscode.window.showInformationMessage(`Project initialised, please edit package.json to your needs`);

}
export async function _ensureenv(credentials: flowCrendentials | null) {
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
        let usedlaunch = false;
        if (fs.existsSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/.vscode') == true) {
            if (fs.existsSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/.vscode/launch.json') == true) {
                var json = fs.readFileSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/.vscode/launch.json', 'utf8');
                var launch = JSON5.parse(json);
                for (var i = 0; i < launch.configurations.length; i++) {
                    var conf = launch.configurations[i];
                    if (conf.program == null) continue;
                    if (conf != null && conf.env != null && conf.env?.apiurl != null && conf.env?.jwt != null) {
                        conf.env.apiurl = credentials.apiurl;
                        conf.env.jwt = credentials.jwt;
                        usedlaunch = true;
                    }
                }
                fs.writeFileSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/.vscode/launch.json', JSON.stringify(launch, null, 4));
            }
        }
        if (fs.existsSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/.env') == true || usedlaunch == false) {
            var lines: string[] = [];
            let env = "";
            if (fs.existsSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/.env') == true) {
                env = fs.readFileSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/.env', 'utf8');
                lines = env.split("\n");
            }
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];
                if (line.trim().startsWith("apiurl=")) {
                    var parts = line.split("=");
                    if (parts.length > 1) {
                        line = "apiurl=" + credentials.apiurl;
                        lines[i] = line;
                    }
                }
                if (line.trim().startsWith("jwt=")) {
                    var parts = line.split("=");
                    if (parts.length > 1) {
                        line = "jwt=" + credentials.jwt;
                        lines[i] = line;
                    }
                }
            }
            if (env.indexOf("apiurl=") == -1) {
                lines.push("apiurl=" + credentials.apiurl);
            }
            if (env.indexOf("jwt=") == -1) {
                lines.push("jwt=" + credentials.jwt);
            }
            fs.writeFileSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/.env', lines.join("\n"));
            if (fs.existsSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/.gitignore') == false) {
                fs.writeFileSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/.gitignore', '.env');
            } else {
                var gitignore = fs.readFileSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/.gitignore', 'utf8');
                if (gitignore.indexOf('.env') == -1) {
                    gitignore += '\n.env';
                    fs.writeFileSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/.gitignore', gitignore);
                }
            }
            if (fs.existsSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/.npmignore') == true) {
                var npmignore = fs.readFileSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/.npmignore', 'utf8');
                if (npmignore.indexOf('.env') == -1) {
                    npmignore += '\n.env';
                    fs.writeFileSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/.npmignore', npmignore);
                }
            }
        }


    } catch (error: any) {
        AppendLineToOutputWindow(error.message);
        vscode.window.showErrorMessage(`Error adding launch.json ` + error.message);
    }
}
