/**
 * Birim testleri için küçük bir `vscode` taklidi: yalnızca workspace.ts ve
 * environment.ts'in dokunduğu yüzey. Gerçek dosya sistemi kullanılır (geçici
 * klasörde), pencere/komut çağrıları kaydedilir.
 */
import * as fs from 'fs';
import * as path from 'path';
import Module = require('module');

export const calls: { commands: Array<[string, unknown[]]>; messages: string[] } = { commands: [], messages: [] };
export const state: { settings: Record<string, unknown>; folders: string[] } = { settings: {}, folders: [] };

class Uri {
    constructor(readonly fsPath: string, readonly scheme = 'file') {}
    static file(p: string) { return new Uri(path.resolve(p)); }
    static joinPath(base: Uri, ...parts: string[]) { return new Uri(path.resolve(base.fsPath, ...parts)); }
    static parse(s: string) { return new Uri(s, 'https'); }
    get path() { return this.fsPath; }
    toString() { return this.fsPath; }
}

const vscode = {
    Uri,
    ConfigurationTarget: { Global: 1 },
    workspace: {
        getConfiguration: (section: string) => ({
            get: (key: string) => state.settings[`${section}.${key}`],
            update: async (key: string, value: unknown) => { state.settings[`${section}.${key}`] = value; },
        }),
        get workspaceFolders() {
            return state.folders.map((f) => ({ uri: Uri.file(f), name: path.basename(f) }));
        },
        updateWorkspaceFolders: () => { throw new Error('çalışma alanına klasör EKLENMEMELİ'); },
        fs: {
            stat: async (u: Uri) => fs.promises.stat(u.fsPath),
            createDirectory: async (u: Uri) => { await fs.promises.mkdir(u.fsPath, { recursive: true }); },
            writeFile: async (u: Uri, b: Uint8Array) => fs.promises.writeFile(u.fsPath, b),
            readFile: async (u: Uri) => new Uint8Array(await fs.promises.readFile(u.fsPath)),
        },
    },
    commands: {
        executeCommand: async (id: string, ...args: unknown[]) => { calls.commands.push([id, args]); },
    },
    window: {
        showInformationMessage: async (m: string) => { calls.messages.push(m); return undefined; },
        showWarningMessage: async (m: string) => { calls.messages.push(m); return undefined; },
    },
    extensions: { getExtension: () => undefined },
    env: { shell: '/bin/bash', openExternal: async () => true },
};

// `require('vscode')` bu taklide gitsin.
const original = (Module as any)._load;
(Module as any)._load = function (request: string, ...rest: unknown[]) {
    if (request === 'vscode') return vscode;
    return original.call(this, request, ...rest);
};
