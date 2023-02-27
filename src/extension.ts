'use strict';
import { Console } from "console";
import * as path from "path";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { extensions, commands, Uri, RelativePattern, ExtensionContext, workspace } from 'vscode';
import { GitExtension } from './git';
const fs = require('fs');
import Timer from './Timer';

let timer: Timer;
let gitBranch: string | undefined;
let gitpath: string | undefined;
var data = JSON.parse("{}");

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  gitpath = path.join(workspace.rootPath!, ".git");
  gitBranch = getCurrentGitBranch(Uri.parse(gitpath));
  console.log(gitBranch);

  console.log('Congratulations, your extension "branch-timer" is now active!');
  timer = new Timer(gitBranch!);
  if (fs.existsSync(path.join(workspace.rootPath!, ".branchTimer"))) {
    var jsonFile: string = fs.readFileSync(path.join(workspace.rootPath!, ".branchTimer"), 'utf8');
    data = JSON.parse(jsonFile);
    timer.total = data[gitBranch!] ?? 0;
  }
  const pattern = new RelativePattern(gitpath, "HEAD");
  const watcher = workspace.createFileSystemWatcher(pattern, false, false);
  watcher.onDidCreate(e => {
    updateBranch();
    console.log(".git/HEAD create detected");
  });
  watcher.onDidChange(e => {
    updateBranch();
    console.log(".git/HEAD change detected");
  });
  workspace.onDidChangeConfiguration(e => {
    updateBranch();
    console.log("Configuration change detected");
  });

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with  registerCommand
  // The commandId parameter must match the command field in package.json
  let startTimer = commands.registerCommand('extension.startTimer', () => {
    timer.start();
  });

  let stopTimer = commands.registerCommand('extension.stopTimer', () => {
    timer.stop();
  });

  context.subscriptions.push(startTimer);
  context.subscriptions.push(stopTimer);
}
function updateBranch() {
  data[gitBranch!] = timer.total;
  gitBranch = getCurrentGitBranch(Uri.parse(gitpath!));
  timer.stop();
  timer.branchName = gitBranch;
  timer.total = data[gitBranch!] ?? 0;
  var jsonData = JSON.stringify(data);
  fs.writeFile(path.join(workspace.rootPath!, ".branchTimer"), jsonData, (error: any) => {
    if (error) {
      console.log('An error has occurred ', error);
      return;
    }
    console.log('Data written successfully to disk', gitBranch);
  });
  timer.start();
}
// this method is called when your extension is deactivated
export function deactivate() {
  updateBranch();
}

function getCurrentGitBranch(docUri: Uri): string | undefined {
  console.debug("Git branch requested for document", docUri);

  const extension = extensions.getExtension<GitExtension>("vscode.git");
  if (!extension) {
    console.warn("Git extension not available");
    return undefined;
  }
  if (!extension.isActive) {
    console.warn("Git extension not active");
    return undefined;
  }

  // "1" == "Get version 1 of the API". Version one seems to be the latest when I
  // type this.
  const git = extension.exports.getAPI(1);

  const repository = git.repositories[0];
  console.log(git.repositories);
  if (!repository) {
    console.warn("No Git repository for current document", docUri);
    return undefined;
  }

  const currentBranch = repository.state.HEAD;
  if (!currentBranch) {
    console.warn("No HEAD branch for current document", docUri);
    return undefined;
  }

  const branchName = currentBranch.name;
  if (!branchName) {
    console.warn("Current branch has no name", docUri, currentBranch);
    return undefined;
  }

  console.debug("Current branch name", branchName);
  return branchName;
}

