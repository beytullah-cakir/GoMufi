/**
 * Terminale yazılacak komut satırını kabuğa göre kurar — `vscode`'a dokunmaz,
 * birim testlerde doğrudan çalışır.
 *
 * NEDEN: yorumlayıcı yolu boşluk içerebilir ("C:\Program Files\Python312\
 * python.exe"). Tırnakla sarmak bash/cmd'de yeter ama PowerShell tırnaklı bir
 * yolu komut değil METİN sayar; başına çağrı işleci `&` gerekir.
 */
export function shellLine(cmd: string, args: string[], shellPath = ''): string {
    const quote = (s: string) => (/[\s"'&()]/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s);
    const line = [quote(cmd), ...args.map((a) => `"${a}"`)].join(' ');
    const isPowerShell = /(^|[\\/])(pwsh|powershell)(\.exe)?$/i.test(shellPath.trim());
    return isPowerShell && quote(cmd) !== cmd ? `& ${line}` : line;
}
