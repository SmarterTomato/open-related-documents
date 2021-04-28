import * as vscode from "vscode";
import Configuration from "../interfaces/configuration";
import MatchRule from "../interfaces/matchRule";

export default class ConfigurationService {
  //#region Singleton

  private static instance?: ConfigurationService;

  static getInstance(): ConfigurationService {
    if (!this.instance) {
      let workspaceConfig = vscode.workspace.getConfiguration();
      const ignoredFileFilters =
        workspaceConfig.get<string[]>("openRelatedDocuments.ignoredFileFilters") || [];
      const fileExtensionFilters =
        workspaceConfig.get<string[]>("openRelatedDocuments.fileExtensionFilters") || [];
      let matchRules = workspaceConfig.get<MatchRule[]>("openRelatedDocuments.matchRules") || [];
      matchRules = matchRules.sort((a, b) => a.priority - b.priority);

      let config: Configuration = {
        fileExtensionFilters,
        ignoredFileFilters,
        matchRules,
      };
      this.instance = new ConfigurationService(config);
    }

    return this.instance;
  }

  //#endregion

  constructor(private config: Configuration) {}

  getConfig(): Configuration {
    return this.config;
  }
}
