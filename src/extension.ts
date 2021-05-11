// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import FileService from "./services/fileService";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log("Open Related Documents is now active");

  const fileService = FileService.getInstance();
  fileService.init();

  const openRelatedDocumentDisposable = vscode.commands.registerCommand(
    "openRelatedDocuments.openRelatedDocument",
    (uri: vscode.Uri) => {
      console.log("Open Related Document command started");

      if (!uri) {
        // - Trying to get active text editor
        const activeTextEditor = vscode.window.activeTextEditor;
        if (!activeTextEditor) {
          vscode.window.showInformationMessage(
            "Open related documents activated, but no active text editor detected"
          );
          console.log("Open related documents activated, but no active text editor detected");
          return;
        }

        uri = activeTextEditor.document.uri;
      }

      fileService.openRelatedDocument(uri);
    }
  );
  context.subscriptions.push(openRelatedDocumentDisposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
