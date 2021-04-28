import * as vscode from "vscode";
import { Uri, WorkspaceFolder } from "vscode";
import MatchResult from "./matchResult";
import * as path from "path";

export default class FileInfo {
  matchResults: MatchResult[] = [];
  relatedResults: MatchResult[] = [];

  constructor(public uri: Uri) {}

  getName(): string {
    return path.basename(this.uri.path);
  }

  getRelativePath(): string {
    return vscode.workspace.asRelativePath(this.uri);
  }

  hasUri(uri: Uri) {
    return this.uri.path === uri.path;
  }
}
