import { strict as assert } from 'assert';
import { test } from 'node:test';
import './vscodeStub';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const env = require('../environment') as typeof import('../environment');

test('Python 3 bulunur ve terminal satırı aynı yorumlayıcıyı kullanır', async (t) => {
    const py = await env.resolvePython();
    if (!py) return t.skip('bu makinede Python yok');
    assert.match(py.version, /^3\./);
    const line = await env.pythonTerminalLine('/tmp/a b.py');
    assert.ok(line?.startsWith(py.cmd), line ?? '');
    assert.ok(line?.endsWith('"/tmp/a b.py"'));
});
