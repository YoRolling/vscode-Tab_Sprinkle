// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode"

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand(
        "close-folder.closefiles",
        async (uri: vscode.Uri) => {
            const cfg = vscode.workspace.getConfiguration("closefiles")
            const closeAllTabGroup = cfg.get("closeAllTabGroup")
            const closeDeeply = cfg.get("closeDeeply")

            // The code you place here will be executed every time your command is executed
            // Display a message box to the user
            let dirname = ""
            const state = await vscode.workspace.fs.stat(uri)
            switch (state.type) {
                case vscode.FileType.File:
                    const parent = vscode.Uri.joinPath(uri, "..")
                    dirname = parent.path
                    break
                case vscode.FileType.Directory:
                    dirname = uri.path
                    break
            }
            let sourceGroup: vscode.Tab[] = []
            if (closeAllTabGroup) {
                sourceGroup = vscode.window.tabGroups.all.flatMap((group) => {
                    return group.tabs
                })
            } else {
                sourceGroup = vscode.window.tabGroups.activeTabGroup
                    .tabs as vscode.Tab[]
            }
            const docList: vscode.Tab[] = sourceGroup
                .filter((v) => {
                    const uri = v.input
                    return (
                        uri !== undefined &&
                        v.input instanceof vscode.TabInputText
                    )
                })
                .filter((v) => {
                    const uri = (v.input as vscode.TabInputText).uri
                    const tabPath = vscode.Uri.joinPath(uri, "..").path
                    return closeDeeply
                        ? tabPath.includes(dirname)
                        : tabPath === dirname
                })
            vscode.window.tabGroups.close(docList)
        }
    )

    context.subscriptions.push(disposable)
}

// This method is called when your extension is deactivated
export function deactivate(context: vscode.ExtensionContext) {
    context.subscriptions.forEach((sub) => {
        sub.dispose()
    })
}
function shouldMatchTab(tabPath: string) {}
