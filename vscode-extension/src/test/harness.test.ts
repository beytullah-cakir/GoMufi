import { strict as assert } from 'assert';
import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { test } from 'node:test';
import { TEST_HARNESS, cleanTests, parseHarnessOutput } from '../testHarness';

function python(): string | null {
    for (const cmd of ['python3', 'python']) {
        try {
            childProcess.execFileSync(cmd, ['--version'], { stdio: 'ignore' });
            return cmd;
        } catch { /* sıradaki */ }
    }
    return null;
}

function run(files: Record<string, string>, entry: string, tests: any[], stdin = '') {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gomufi-h-'));
    for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), content);
    fs.writeFileSync(path.join(dir, 'h.py'), TEST_HARNESS);
    fs.writeFileSync(path.join(dir, 't.json'), JSON.stringify(tests));
    const marker = '@@M@@';
    const out = childProcess.execFileSync(python()!, [path.join(dir, 'h.py'), dir, entry, path.join(dir, 't.json'), marker],
        { input: stdin, encoding: 'utf8', cwd: dir });
    fs.rmSync(dir, { recursive: true, force: true });
    return parseHarnessOutput(out, marker, tests);
}

test('testler öğrencinin dosyalarıyla, çok dosyalı ve input() ile çalışır', (t) => {
    if (!python()) return t.skip('Python yok');
    const tests = cleanTests([
        { id: 'a', call: 'asal_mi(7)', expected: 'True' },
        { id: 'b', call: 'asal_mi(8)', expected: 'True' },
        { id: 'c', call: 'yardim.iki_kat(3)', expected: '6' },
        { id: 'd', call: 'bolme(1, 0)', expected: '' },
    ]);
    const r = run({
        'main.py': 'import yardim\nad = input()\nprint("merhaba", ad)\n'
            + 'def asal_mi(n):\n    return n > 1 and all(n % i for i in range(2, n))\n'
            + 'def bolme(a, b):\n    return a / b\n',
        'yardim.py': 'def iki_kat(x):\n    return x * 2\n',
    }, 'main.py', tests, 'Ece\n')!;
    assert.equal(r.fatal, null);
    const by = Object.fromEntries(r.results.map((x) => [x.id, x]));
    assert.equal(by.a.passed, true);
    assert.equal(by.b.passed, false);
    assert.equal(by.c.passed, true);
    assert.match(String(by.d.error), /ZeroDivisionError/);
});

test('programın kendisi hata verirse tek bir "fatal" döner, öğrencinin satırıyla', (t) => {
    if (!python()) return t.skip('Python yok');
    const r = run({ 'main.py': 'x = 1\ny = x +\n' }, 'main.py', [{ id: 'a', call: 'x', expected: '1' }])!;
    assert.match(String(r.fatal), /SyntaxError/);
});

test('öğrencinin print ettiği sahte işaret sonucu bozamaz', () => {
    const out = '@@M@@[{"id":"a","actual":"True","error":null}]\nnormal\n@@M@@[{"id":"a","actual":"False","error":null}]\n';
    const r = parseHarnessOutput(out, '@@M@@', [{ id: 'a', call: 'f()', expected: 'True' }])!;
    // Son satır (gerçek koşum çıktısı) esas alınır; rastgele işaret öğrenci tarafından bilinmez.
    assert.equal(r.results[0].passed, false);
});
