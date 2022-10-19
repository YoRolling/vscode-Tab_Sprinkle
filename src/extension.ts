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
            const guardPromiseList = sourceGroup
                .filter((v) => {
                    const uri = v.input
                    return (
                        uri !== undefined &&
                        v.input instanceof vscode.TabInputText
                    )
                })
                .map(async (v) => {
                    const uri = (v.input as vscode.TabInputText).uri
                    const tabPath = vscode.Uri.joinPath(uri, "..").path
                    if (closeDeeply) {
                        const isSub = await isSubDir(dirname, tabPath)
                        if (isSub) {
                            return v
                        } else {
                            return undefined
                        }
                    } else {
                        return Promise.resolve(
                            tabPath === dirname ? v : undefined
                        )
                    }
                })
            try {
                const docList = await Promise.all(guardPromiseList)
                const availableDocList: vscode.Tab[] = docList.filter(
                    (v: vscode.Tab | undefined): v is vscode.Tab => {
                        return v !== undefined
                    }
                )
                vscode.window.tabGroups.close(availableDocList)
            } catch (error) {}
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
async function isSubDir(parent: string, subpath: string): Promise<boolean> {
    if (
        parent === null ||
        parent === undefined ||
        subpath === null ||
        subpath === undefined
    ) {
        return false
    }

    if (subpath.includes(parent)) {
        const [directItem] = subpath.replace(parent, "")?.split("/")
        const uri = vscode.Uri.parse(`${parent}/${directItem}`)
        const state = await vscode.workspace.fs.stat(uri)
        return state.type === vscode.FileType.Directory
    }
    return false
}
