import { strict as assert } from 'assert';
import { test } from 'node:test';
import './vscodeStub';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const auth = require('../auth') as typeof import('../auth');

test('eşleşme kodu sunucuyla aynı hesaplanır (backend/tests/test_device_approve.py)', () => {
    assert.equal(auth.pairingCode('x'.repeat(40)), '7T9YCDW5');
    assert.match(auth.pairingCode('baska-bir-state-degeri-0123456789abcdef'), /^[A-HJ-NP-Z2-9]{8}$/);
});
