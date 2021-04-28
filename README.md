# Open Related Documents README

Open Related Documents is a vscode extension. Provides a quick way to open documents that related to current opened documents (E.g. accountModel.ts, accountService.ts, accountManager.ts, accountService.test.ts, accountServices.mock.ts)

## Features

### Quick open

Shortcuts: `Ctrl + ;`

Examples:

- example.component.ts, example.component.html, example.component.css
- example.service.ts, example.component.ts
- ExampleController.h, ExampleController.cpp
- ExampleController.cs, ExampleLogic.cs, ExampleRepository.cs
- IExample.cs, Example.cs

## Extension Settings

This extension contributes the following settings:

- `openRelatedDocuments.ignoredFileFilters`:
  - Description: Ignored path, glob pattern
  - Example: Value `**/.*` ignore all file/folder start with `. (dot)`. `**/__pycache__` ignore `__pycache__` folder

- `openRelatedDocuments.fileExtensionFilters`:
  - Description: Filter the file by extension, glob pattern. Remove first item to Enable this filter
  - Example: Value `py` only include file with `.py` file extension.

## Known Issues

None

## Release Notes

### v1.0.0 Initial release - 2020-04-28

#### New

- Quick open
- Pre-calculate all files in current workspace related files
- Keyboard shortcut for Quick open command

## Change Log

[CHANGELOG](https://github.com/SmarterTomato/open-related-documents/blob/main/CHANGELOG.md)
