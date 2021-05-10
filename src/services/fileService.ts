import * as vscode from "vscode";
import ConfigurationService from "./configurationService";
import Configuration from "../interfaces/configuration";
import FileInfo from "../models/fileInfo";
import FileMatchingService from "./fileMatchingService";
import { RelatedResultQuickPickItem } from "../models/relatedResultQuickPickItem";
import MatchResult from "../models/matchResult";
import Time from "../utilities/time";

export default class FileService {
  //#region Singleton

  private static instance?: FileService;

  static getInstance(): FileService {
    if (!this.instance) {
      const config = ConfigurationService.getInstance().getConfig();
      const fileMatchingService = FileMatchingService.getInstance();
      this.instance = new FileService(config, fileMatchingService);
    }

    return this.instance;
  }

  //#endregion

  private workspaceFiles: FileInfo[] = [];

  constructor(private config: Configuration, private fileMatchingService: FileMatchingService) {}

  /**
   * On init, file service should:
   * - Listen to the  workspace event change
   * - Pre-calculate all the files in current workspace
   */
  init() {
    this.listenToEvents();
    this.cachingWorkspaceFiles();
  }

  /**
   * Opens a quick open in vscode that contains a list of related document names
   * - User must be focused on an document in vscode
   * - Trying to find the file from the cache
   *   > If not found, maybe because caching still running on the background. Trying to calculate it right now
   * - Show vscode quick open
   */
  async quickOpen() {
    // - Trying to get active text editor
    const activeTextEditor = vscode.window.activeTextEditor;
    if (!activeTextEditor) {
      vscode.window.showInformationMessage(
        "Open related documents activated, but no active text editor detected"
      );
      console.log("Open related documents activated, but no active text editor detected");
      return;
    }

    console.log("Quick open with current active document: " + activeTextEditor.document.uri.path);

    let relatedResults: MatchResult[] = [];
    // - Trying to find the file from the pre-calculated result first
    const fileUri = activeTextEditor.document.uri;
    let activeFile = this.workspaceFiles.find((x) => x.hasUri(fileUri));
    if (activeFile) {
      relatedResults = activeFile.relatedResults;
      console.log("Found active file in the cached files");
    } else {
      // > Result not found, try to calculate right now
      const workspaceFiles = await this.getAllFilesInCurrentWorkspace();
      activeFile = this.getFileInfo(fileUri);

      relatedResults = this.findRelatedFiles(activeFile, workspaceFiles);
      activeFile.relatedResults = relatedResults;
    }

    console.log(`${activeFile.relatedResults.length} related file found for active document`);
    this.showQuickPick(activeFile);
  }

  /**
   * Get all the files in the current workspace without the pre-configured ignored files and extension filters
   * @returns
   */
  private async getAllFilesInCurrentWorkspace(): Promise<FileInfo[]> {
    const ignoredFileGlob = this.config.ignoredFileFilters.join(",");
    const fileExtensionFilters = this.config.fileExtensionFilters.join(",");

    console.log(
      `Get all files in current workspace with: ${this.config.ignoredFileFilters.length} ignored files, and ${this.config.fileExtensionFilters.length} extension filters`
    );

    const uris = await vscode.workspace.findFiles(
      `**/*.{${fileExtensionFilters}}`,
      `{${ignoredFileGlob}}`
    );

    let files: FileInfo[] = [];

    for (const uri of uris) {
      const file = this.getFileInfo(uri);
      files.push(file);
    }

    console.log(`Files found: ` + files.length);
    return files;
  }

  /**
   * - Listen to workspace folder changes
   * - Listen to file changes in workspace
   */
  private listenToEvents() {
    vscode.workspace.onDidChangeWorkspaceFolders(async () => {
      console.log("Workspace folder changed, re-calculate the cached files");

      this.cachingWorkspaceFiles();
    });

    vscode.workspace.onDidCreateFiles(async (event) => {
      for (const uri of event.files) {
        await this.onFileAdded(uri);
      }
    });

    vscode.workspace.onDidDeleteFiles(async (event) => {
      for (const uri of event.files) {
        this.removeFileFromCache(uri);
      }
    });

    vscode.workspace.onDidRenameFiles(async (event) => {
      for (const changedUri of event.files) {
        // - Removes the old file from the cache
        this.removeFileFromCache(changedUri.oldUri);

        await this.onFileAdded(changedUri.newUri);
      }
    });
  }

  /**
   * Calculate related files for each file, this may takes a very long time for large project
   */
  private async cachingWorkspaceFiles() {
    console.log("Start caching workspace files...");

    this.workspaceFiles = [];

    let workspaceFiles = await this.getAllFilesInCurrentWorkspace();
    const count = workspaceFiles.length;

    let progress = 0;
    // - Go through all files in the workspace, calculate if any file relates to it
    for (let activeFile of workspaceFiles) {
      const relatedResults = this.findRelatedFiles(activeFile, workspaceFiles);
      activeFile.relatedResults = relatedResults;
      this.workspaceFiles.push(activeFile);

      // The cache may takes a very long time for large project
      // We add some delay to allow nodejs process other request first
      if (progress % 5 === 0) {
        await Time.delay(10);
        console.log(`Progress: ${progress}/${count}`);
      }
      progress++;
    }
  }

  private findRelatedFiles(activeFile: FileInfo, fileList: FileInfo[]): MatchResult[] {
    console.log("Finding related files for: " + activeFile.getName());

    let relatedResults: MatchResult[] = [];

    // - Go through all files in the workspace, calculate if any file relates to it
    for (const file of fileList) {
      // > Ignore the same file
      if (activeFile.hasUri(file.uri)) {
        continue;
      }

      const relatedResult = this.fileMatchingService.checkIfFilesMatch(activeFile, file);
      // > No result are match
      if (!relatedResult) {
        continue;
      }

      // At least one of the result are match, because the match is ordered by the priority, so we only need one
      relatedResults.push(relatedResult);
    }

    // - Sort by rule order and file name
    relatedResults = relatedResults.sort((a, b) => {
      if (a.rule.priority < b.rule.priority) {
        return -1;
      } else if (a.rule.priority === b.rule.priority && a.rule.priority > 10) {
        return a.fileInfo.getName() > b.fileInfo.getName() ? 1 : -1;
      } else if (
        a.rule.priority === b.rule.priority &&
        a.fileInfo.getName() > b.fileInfo.getName()
      ) {
        return -1;
      } else {
        return 1;
      }
    });

    console.log("Results found: " + relatedResults.length);
    return relatedResults;
  }

  private showQuickPick(activeFile: FileInfo) {
    // - Convert MatchResult to quick pick item
    let quickPickItems = new Array<RelatedResultQuickPickItem>();
    for (let result of activeFile.relatedResults) {
      quickPickItems.push(new RelatedResultQuickPickItem(result));
    }

    let placeHolder = `Related documents to ${activeFile.getName()}...`;
    if (quickPickItems.length === 0) {
      placeHolder = `No documents found related to ${activeFile.getName()}...`;
    }

    vscode.window.showQuickPick(quickPickItems, { placeHolder }).then((selected) => {
      // = Open selected document
      if (selected) {
        vscode.workspace.openTextDocument(selected.relatedResult.fileInfo.uri).then((document) => {
          vscode.window.showTextDocument(document);
        });
      }
    });
  }

  private removeFileFromCache(uri: vscode.Uri) {
    let found = this.workspaceFiles.find((x) => x.hasUri(uri));
    if (!found) {
      // For some reason the file is not in current workspace
      return;
    }

    // - Remove this file from the cache
    this.workspaceFiles = this.workspaceFiles.filter((x) => x.hasUri(uri) === false);

    // - If other file related to this file, technically that file should be in this file related list
    // - We can update to update it straight away
    for (let relatedResult of found.relatedResults) {
      relatedResult.fileInfo.relatedResults = relatedResult.fileInfo.relatedResults.filter(
        (x) => x.fileInfo.hasUri(uri) === false
      );
    }
  }

  private getFileInfo(uri: vscode.Uri): FileInfo {
    let file = new FileInfo(uri);
    file.matchResults = this.fileMatchingService.calculateMatchResults(file);
    return file;
  }

  private async onFileAdded(uri: vscode.Uri) {
    let workspaceFiles = await this.getAllFilesInCurrentWorkspace();

    // - Calculate this new file
    let file = this.getFileInfo(uri);
    const relatedResults = this.findRelatedFiles(file, workspaceFiles);
    file.relatedResults = relatedResults;

    // - Calculate related file result as well
    for (const item of file.relatedResults) {
      let relatedFile = item.fileInfo;

      const relatedResult = this.fileMatchingService.checkIfFilesMatch(relatedFile, file);
      // + This should not happen
      if (!relatedResult) {
        continue;
      }

      // + Replace existing file in cache
      relatedFile.relatedResults.push(relatedResult);
      this.workspaceFiles = this.workspaceFiles.filter(
        (x) => x.hasUri(item.fileInfo.uri) === false
      );
      this.workspaceFiles.push(relatedFile);
    }

    this.workspaceFiles.push(file);
  }
}
