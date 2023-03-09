import * as vscode from 'vscode';
import * as http from 'http';
import * as https from 'https';
import { openiap, User } from '@openiap/nodeapi';
import { Uri } from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export function get(url:string): Promise<string> {
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
  export function post(jwt:string | undefined, agent:any, url:string, body:string): Promise<string> {
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
  export function RequestUserToken(apiurl:string) {
	return new Promise<string>(async (resolve, reject) => {
		var tokenkey = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
		var u = new URL(apiurl);
		var addtokenurl = u.protocol + "//" + u.host + "/AddTokenRequest";
		var gettokenurl = u.protocol + "//" + u.host + "/GetTokenRequest?key=" + tokenkey;
		var signinurl = u.protocol + "//" + u.host + "/login?key=" + tokenkey;
		var result = await post(undefined, null, addtokenurl, JSON.stringify({key: tokenkey}));

		vscode.env.openExternal(Uri.parse(signinurl));

		const id = setInterval(async () => {
			var result = await get(gettokenurl);
			var res = JSON.parse(result)
			if(res.jwt != "" && res.jwt != null) {
				clearInterval(id);
				resolve(res.jwt	);
			}
		}, 1000);
	});
}
export function GetUser(apiurl:string, jwt:string) {
	return new Promise<User>(async (resolve, reject) => {
		try {
			var client = new openiap(apiurl, jwt);
			var user = await client.connect();
			if(user != null) {
				resolve(user);
			}
			reject(new Error("User not found"));
		} catch (error) {
			reject(error);
		}
	});
}
export function UploadPackage(apiurl:string, filename: string, project: any, jwt:string) {
	return new Promise<string>(async (resolve, reject) => {
		var client = new openiap(apiurl, jwt);
		try {
			await client.connect();
			var projects = await client.Query<any>({ collectionname: "agents", query: {"_type": "package", "id": project.name} });
			var pro = {
				name: project.name.replace("/", "-").replace("@", " "), 
				id: project.name, 
				description: project.description, 
				version: project.version, 
				fileid: "",
				language: "nodejs",
				daemon: false,
				author: project.author, main: project.main, _type: "package"};

			if(project.main != null) {
				if(project.main.endsWith(".js") || project.main.endsWith(".ts")) {
					pro.language = "nodejs";
				} else if(project.main.endsWith(".py")) {
					pro.language = "python";
				} else if(project.main.endsWith(".cs") || project.main.endsWith(".vb") || project.main.endsWith(".csproj") || project.main.endsWith(".vbproj")) {
					pro.language = "dotnet";
				}
		} else {
				// search vscode.workspace for csproj or vbproj file
				var files = await vscode.workspace.findFiles("**/*.csproj", "**/node_modules/**");
				if(files.length > 0) {
					pro.language = "dotnet";
				} else {
					files = await vscode.workspace.findFiles("**/*.vbproj", "**/node_modules/**");
					if(files.length > 0) {
						pro.language = "dotnet";
					}
				}
			}
			if(projects == null || projects.length == 0) {
				pro = await client.InsertOne({ collectionname: "agents", item: pro });
			} else {
				pro = projects[0];
			}
			if(pro != null) {
				pro.id = project.name;
				pro.description = project.description;
				pro.version = project.version;
				if(project != null && project.openiap != null) {
					if(project.openiap.daemon == true || project.openiap.daemon == "true") {
						pro.daemon = true;
					} else if(project.openiap.daemon == false || project.openiap.daemon == "false") {
						pro.daemon = true;
					}
				}
				var result = await client.UploadFile({filename: filename})
				fs.unlinkSync(filename);
				pro.fileid = result.id;
				await client.UpdateOne({ collectionname: "agents", item: pro });
				// @ts-ignore
				return resolve(pro._id)
			}
			reject(new Error("Package not found"));			
		} catch (error) {
			try {
				if(fs.existsSync(filename)) {
					fs.unlinkSync(filename);
				}
			} catch (error) {
			}
			try {
				if(client != null) {
					client.Close();
				}
			} catch (error) {
				
			}
			reject(error);
		}
	});
}
interface Process {
	process: cp.ChildProcess;
	cmd: string;
}
const runningProcesses: Map<number, Process> = new Map();
let outputChannel: vscode.OutputChannel;
export function runCommandInOutputWindow(args: string[], cwd: string | undefined): Promise<void> {
	return new Promise((resolve, reject) => {
		if(outputChannel == null) outputChannel = vscode.window.createOutputChannel('openiap');

		const cmd = getNpmBin() + ' ' + args.join(' ');
		const p = cp.exec(cmd, { cwd: cwd, env: process.env });
	
		runningProcesses.set(p.pid as number, { process: p, cmd: cmd });
		if(p.stderr == null || p.stdout == null) return;
		p.stderr.on('data', (data: string) => {
			outputChannel.append(data);
		});
		p.stdout.on('data', (data: string) => {
			outputChannel.append(data);
		});
		p.on('exit', (_code: number, signal: string) => {
			runningProcesses.delete(p.pid as number);
			if (signal === 'SIGTERM') {
				outputChannel.appendLine('Successfully killed process');
				outputChannel.appendLine('-----------------------');
				outputChannel.appendLine('');
			} else {
				outputChannel.appendLine('-----------------------');
				outputChannel.appendLine('');
			}
			resolve();
		});
		outputChannel.show();
	});
}
function getNpmBin() {
	return vscode.workspace.getConfiguration('npm')['bin'] || 'npm';
}