import { openiap, User } from '@openiap/nodeapi';
import * as cp from 'child_process';
const ctrossspawn = require('cross-spawn');
import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as vscode from 'vscode';
import { Uri } from 'vscode';
const JSON5 = require('json5')

export function get(url: string): Promise<string> {
	return new Promise((resolve, reject) => {
		var provider = http;
		if (url.startsWith("https")) {
			// @ts-ignore
			provider = https;
		}
		provider.get(url, (resp) => {
			let data = "";
			resp.on("data", (chunk) => {
				data += chunk;
			});
			resp.on("end", () => {
				resolve(data);
			});
		}).on("error", (err) => {
			reject(err);
		});
	})
}
export function post(jwt: string | undefined, agent: any, url: string, body: string): Promise<string> {
	return new Promise((resolve, reject) => {
		try {
			var provider = http;
			var u = new URL(url);
			var options = {
				rejectUnauthorized: false,
				agent: agent,
				hostname: u.hostname,
				port: u.port,
				path: u.pathname,
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Content-Length": Buffer.byteLength(body)
				}
			};
			if (jwt != null && jwt != "") {
				// @ts-ignore
				options.headers["Authorization"] = "Bearer " + jwt;
			}
			if (url.startsWith("https")) {
				delete options.agent;
				// @ts-ignore
				provider = https;
			}
			var req = provider.request(url, options, (res) => {
				res.setEncoding("utf8");
				if (res.statusCode != 200) {
					return reject(new Error("HTTP Error: " + res.statusCode + " " + res.statusMessage));
				}
				var body = "";
				res.on("data", (chunk) => {
					body += chunk;
				});
				res.on("end", () => {
					var r = res;
					resolve(body);
				});
			}
			);
			req.write(body);
			req.end();

		} catch (error) {
			reject(error);
		}
	})
}
export function RequestUserToken(apiurl: string) {
	return new Promise<string>(async (resolve, reject) => {
		var tokenkey = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
		var u = new URL(apiurl);
		var addtokenurl = u.protocol + "//" + u.host + "/AddTokenRequest";
		var gettokenurl = u.protocol + "//" + u.host + "/GetTokenRequest?key=" + tokenkey;
		var signinurl = u.protocol + "//" + u.host + "/login?key=" + tokenkey;
		var result = await post(undefined, null, addtokenurl, JSON.stringify({ key: tokenkey }));

		vscode.env.openExternal(Uri.parse(signinurl));

		const id = setInterval(async () => {
			var result = await get(gettokenurl);
			var res = JSON.parse(result)
			if (res.jwt != "" && res.jwt != null) {
				clearInterval(id);
				resolve(res.jwt);
			}
		}, 1000);
	});
}
export function GetUser(apiurl: string, jwt: string) {
	return new Promise<User>(async (resolve, reject) => {
		var client: openiap = null as any;
		try {
			client = new openiap(apiurl, jwt);
			var user = await client.connect();
			if (user != null) {
				resolve(user);
			}
			reject(new Error("User not found"));
		} catch (error) {
			reject(error);
		}
		finally {
			if (client != null) {
				try {
					client.Close();
				} catch (error) {
				}
			}
		}
	});
}
export async function getGitAPI() {
	const gitExtension = vscode.extensions.getExtension('vscode.git');
	if (!gitExtension) {
		vscode.window.showErrorMessage('Git extension not found.');
		return;
	}

	// Activate the extension if it isn't already
	const git = gitExtension.isActive ? gitExtension.exports : await gitExtension.activate();
	const gitApi = git.getAPI(1); // version 1 of the API
	return gitApi;
}
export function UploadPackage(apiurl: string, filename: string, project: any, jwt: string) {
	return new Promise<string>(async (resolve, reject) => {
		var client = new openiap(apiurl, jwt);
		try {
			let localproject: any = {};
			if (fs.existsSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/package.json') == true) {
				var json = fs.readFileSync(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/package.json', 'utf8');
				localproject = JSON5.parse(json);
				if (localproject.name == null || localproject.name == "") {
					vscode.window.showErrorMessage('No name found in package.json');
					return "";
				}
				if (localproject.name.indexOf("\\") > 0) {
					vscode.window.showErrorMessage('Name in project.json cannot contain \\');
					return "";
				}
				if (localproject.main == null || localproject.main == "") {
					vscode.window.showErrorMessage('No main found in package.json');
					return "";
				}
				if (localproject.openiap == null) {
					vscode.window.showErrorMessage('No openiap section found in package.json');
					return "";
				}
				if (localproject.openiap.language == null || localproject.openiap.language == "") {
					vscode.window.showErrorMessage('No language found in openiap section of package.json');
					return "";
				}
			} else {
				vscode.window.showErrorMessage('No package.json found in workspace please run init openiap project first (initproject)');
				return "";
			}
			await client.connect();
			var projects = await client.Query<any>({ collectionname: "agents", query: { "_type": "package", "id": project.name } });
			var pro = {
				name: project.name.replace("/", "-").replace("@", " ").trim(),
				id: project.name,
				description: project.description,
				version: project.version,
				fileid: "",
				language: localproject.openiap.language,
				daemon: false,
				chrome: false,
				chromium: false,
				ports: [{ "port": 3000, "name": "web", "protocol": "TCP", "web": true }],
				author: project.author, main: project.main, _type: "package",
				openiap: project.openiap
			};
			// @ts-ignore
			delete pro.port;
			if (projects == null || projects.length == 0) {
				pro = await client.InsertOne({ collectionname: "agents", item: pro });
			} else {
				pro = projects[0];
			}
			if (pro != null) {
				if (outputChannel == null) outputChannel = vscode.window.createOutputChannel('openiap');
				outputChannel.append(JSON.stringify(project, null, 2));
				pro.id = project.name;
				pro.description = project.description;
				pro.version = project.version;
				pro.language = localproject.openiap.language;
				pro.main = project.main;
				pro.author = project.author;
				pro.openiap = project.openiap;
				if (project != null && project.openiap != null) {
					if (project.openiap.daemon == true || project.openiap.daemon == "true") {
						pro.daemon = true;
					} else if (project.openiap.daemon == false || project.openiap.daemon == "false") {
						pro.daemon = false;
					}
					if (project.openiap.chrome == true || project.openiap.chrome == "true") {
						pro.chrome = true;
					} else if (project.openiap.chrome == false || project.openiap.chrome == "false") {
						pro.chrome = false;
					}
					if (project.openiap.chromium == true || project.openiap.chromium == "true") {
						pro.chromium = true;
					} else if (project.openiap.chromium == false || project.openiap.chromium == "false") {
						pro.chromium = false;
					}
					if (project.openiap.ports != null && Array.isArray(project.openiap.ports)) {
						pro.ports = project.openiap.ports;
					}
				}
				var result = await client.UploadFile({ filename: filename })
				fs.unlinkSync(filename);
				pro.fileid = result.id;
				await client.UpdateOne({ collectionname: "agents", item: pro });
				// @ts-ignore
				return resolve(pro._id)
			}
			reject(new Error("Package not found"));
		} catch (error) {
			try {
				if (fs.existsSync(filename)) {
					fs.unlinkSync(filename);
				}
			} catch (error) {
			}
			try {
				if (client != null) {
					client.Close();
				}
			} catch (error) {

			}
			reject(error);
		}
	});
}
export function findNodePath() {
    return findInPath("node")
}
export function findNPMPath() {
    const child = (process.platform === 'win32' ? 'npm.cmd' : 'npm')
    return findInPath(child)
}
export function findInPath(exec: string): string | null {
    try {
        let command;
        switch (process.platform) {
            case 'linux':
            case 'darwin':
                command = 'which';
                break;
            case 'win32':
                command = 'where.exe';
                break;
            default:
                throw new Error(`Unsupported platform: ${process.platform}`);
        }
        const result: any = ctrossspawn.sync(command, [exec], { stdio: 'pipe' });
        if (result.status === 0) {
            const stdout = result.stdout.toString();
            const lines = stdout.split(/\r?\n/).filter((line: string) => line.trim() !== '')
                .filter((line: string) => line.toLowerCase().indexOf("windowsapps\\python3.exe") == -1)
                .filter((line: string) => line.toLowerCase().indexOf("windowsapps\\python.exe") == -1);
            if (lines.length > 0) return lines[0]
        } else {
            if (result.stderr != null) console.log(result.stderr.toString());
            if (result.stdout != null) console.log(result.stdout.toString());
        }
        return "";
    } catch (error) {
        return "";
        // throw error;
    }
}
interface Process {
	process: cp.ChildProcess;
	cmd: string;
}
const runningProcesses: Map<number, Process> = new Map();
let outputChannel: vscode.OutputChannel;
export function AppendToOutputWindow(message: string) {
	if (outputChannel == null) outputChannel = vscode.window.createOutputChannel('openiap');
	outputChannel.append(message);
}
export function AppendLineToOutputWindow(message: string) {
	if (outputChannel == null) outputChannel = vscode.window.createOutputChannel('openiap');
	outputChannel.append(message);
}
export function runCommandInOutputWindow(command: string, args: string[], cwd: string | undefined): Promise<void> {
	return new Promise((resolve, reject) => {
		if (outputChannel == null) outputChannel = vscode.window.createOutputChannel('openiap');

		// const cmd = getNpmBin() + ' ' + args.join(' ');
		if (!command.startsWith('"') && command.indexOf(" ") > 0) {
			command = '"' + command + '"';
		}
		const cmd = command + ' ' + args.join(' ');
		const p = cp.exec(cmd, { cwd: cwd, env: process.env });

		runningProcesses.set(p.pid as number, { process: p, cmd: cmd });
		if (p.stderr == null || p.stdout == null) return;
		p.stderr.on('data', (data: string) => {
			AppendToOutputWindow(data);
		});
		p.stdout.on('data', (data: string) => {
			AppendToOutputWindow(data);
		});
		p.on('exit', (_code: number, signal: string) => {
			runningProcesses.delete(p.pid as number);
			if (signal === 'SIGTERM') {
				AppendLineToOutputWindow('Successfully killed process');
				AppendLineToOutputWindow('-----------------------');
				AppendLineToOutputWindow('');
			} else {
				AppendLineToOutputWindow('-----------------------');
				AppendLineToOutputWindow('');
			}
			resolve();
		});
		outputChannel.show();
	});
}
function getNpmBin() {
	return vscode.workspace.getConfiguration('npm')['bin'] || 'npm';
}