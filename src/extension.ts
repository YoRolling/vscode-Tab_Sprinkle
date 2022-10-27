// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode"

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand(
        "tab-sprinkle.sprinkletabs",
        async (uri: vscode.Uri) => {
            await handle(uri, false)
        }
    )

    const sprinkletabsall = vscode.commands.registerCommand(
        "tab-sprinkle.sprinkletabsdeeply",
        async (uri: vscode.Uri) => {
            try {
                await handle(uri, true)
            } catch (error) {
                vscode.window.showErrorMessage(
                    (error as Error).message || "E500内部错误"
                )
            }
        }
    )

    context.subscriptions.push(disposable)
    context.subscriptions.push(sprinkletabsall)
}

// This method is called when your extension is deactivated
export function deactivate(context: vscode.ExtensionContext) {
    context.subscriptions.forEach((sub) => {
        sub.dispose()
    })
}

async function handle(uri: vscode.Uri, deeply: boolean) {
    // The code you place here will be executed every time your command is executed
    // Display a message box to the user
    let activeUri = uri
    if (uri === undefined) {
        activeUri = vscode.window.activeTextEditor?.document?.uri as vscode.Uri
        if (activeUri === undefined) {
            return false
        }
    }
    if (activeUri.scheme === "untitled") {
        // todo handle untitled tab
        handleUnTitled(activeUri, deeply)
    } else {
        handleNormalTabs(activeUri, deeply)
    }
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

    if (subpath.indexOf(parent) === 0) {
        const [directItem] = subpath.replace(parent, "")?.split("/")
        const uri = vscode.Uri.parse(`${parent}/${directItem}`)
        try {
            const state = await vscode.workspace.fs.stat(uri)
            return state.type === vscode.FileType.Directory
        } catch (error) {
            return false
        }
    }
    return false
}

function getTabs() {
    const cfg = vscode.workspace.getConfiguration("closefiles")
    const closeAllTabGroup = cfg.get("closeAllTabGroup")
    let tabs: vscode.Tab[] = []
    if (closeAllTabGroup) {
        tabs = vscode.window.tabGroups.all.flatMap((v) => v.tabs)
    } else {
        tabs = vscode.window.tabGroups.activeTabGroup.tabs as vscode.Tab[]
    }
    tabs = tabs.filter((v: vscode.Tab) => {
        const uri = v.input
        return uri !== undefined && v.input instanceof vscode.TabInputText
    })
    return tabs
}
async function handleUnTitled(uri: vscode.Uri, deeply = false) {
    const matchedTabList = getTabs().filter((v) => {
        const uri = (v.input as vscode.TabInputText).uri
        if (deeply) {
            return uri.scheme === "untitled"
        }
        return uri.toString() === uri.toString()
    })
    closeTabs(matchedTabList)
}

function closeTabs(tab: vscode.Tab | vscode.Tab[]) {
    vscode.window.tabGroups.close(tab)
}
async function handleNormalTabs(uri: vscode.Uri, deeply: boolean = false) {
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

    const guardPromiseList = getTabs().map(async (v) => {
        const uri = (v.input as vscode.TabInputText).uri
        const tabPath = vscode.Uri.joinPath(uri, "..").path
        if (deeply) {
            const isSub = await isSubDir(dirname, tabPath)
            return Promise.resolve(isSub ? v : undefined)
        } else {
            return Promise.resolve(tabPath === dirname ? v : undefined)
        }
    })
    try {
        const docList = await Promise.all(guardPromiseList)
        const availableDocList: vscode.Tab[] = docList.filter(
            (v: vscode.Tab | undefined): v is vscode.Tab => {
                return v !== undefined
            }
        )
        closeTabs(availableDocList)
    } catch (error) {
        vscode.window.showErrorMessage(
            (error as Error).message || "E500,内部错误"
        )
    }
}
