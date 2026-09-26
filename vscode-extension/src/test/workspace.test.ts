import { strict as assert } from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { beforeEach, test } from 'node:test';
import { calls, state } from './vscodeStub';
// Taklit kurulduktan SONRA yüklenmeli.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ws = require('../workspace') as typeof import('../workspace');

let root = '';
beforeEach(() => {
    root = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gomufi-')), 'GoMufi');
    state.settings = { 'gomufi.workspaceRoot': root };
    state.folders = [];
    calls.commands = [];
    ws.setLabUser(null);
});

test('ilk kurulum: kök klasör SORULMADAN oluşur, açıklama dosyası yazılır', async () => {
    const first = await ws.ensureWorkspaceRoot();
    assert.equal(first.created, true);
    assert.equal(first.root.fsPath, root);
    assert.ok(fs.existsSync(path.join(root, 'BENİOKU.md')));
    const second = await ws.ensureWorkspaceRoot();
    assert.equal(second.created, false);
});

test('ders penceresi: yalnızca kök (ya da altı) tek klasör olarak açıkken', () => {
    assert.equal(ws.isLessonsWindow(), false);                 // boş pencere
    state.folders = [root];
    assert.equal(ws.isLessonsWindow(), true);
    state.folders = [path.join(root, 'Python')];
    assert.equal(ws.isLessonsWindow(), true);
    state.folders = [root, '/tmp/baska-proje'];                // çok köklü
    assert.equal(ws.isLessonsWindow(), false);
    state.folders = [root + '2'];
    assert.equal(ws.isLessonsWindow(), false);
});

test('modül klasörü kökün altında açılır, çalışma alanına EKLENMEZ', async () => {
    state.folders = [root];
    const folder = await ws.openLessonFolder('Python Atölyesi', 'Değişkenler · ANLA');
    assert.equal(folder.fsPath, path.join(root, 'Python Atölyesi', 'Değişkenler · ANLA'));
    assert.ok(fs.existsSync(folder.fsPath));
    assert.deepEqual(calls.commands.map((c) => c[0]), ['revealInExplorer']);
    // updateWorkspaceFolders çağrılsaydı taklit hata atardı.
});

test('laboratuvar modu: her öğrencinin kendi alt klasörü', async () => {
    state.settings['gomufi.labMode'] = true;
    ws.setLabUser({ displayName: 'Ece Kaya', userId: '42' });
    assert.equal(ws.workspaceRoot().fsPath, path.join(root, 'Ece Kaya-42'));
    state.folders = [path.join(root, 'Ece Kaya-42')];
    assert.equal(ws.isLessonsWindow(), true);
    // Başka öğrencinin klasörü bu öğrencinin ders penceresi değil.
    ws.setLabUser({ displayName: 'Can', userId: '7' });
    assert.equal(ws.isLessonsWindow(), false);
    // Lab modu kapalıyken kişi klasörü kullanılmaz.
    state.settings['gomufi.labMode'] = false;
    assert.equal(ws.workspaceRoot().fsPath, root);
});

test('ödevler de aynı kökün altında', () => {
    const f = ws.assignmentFolder({ courseTitle: 'Python', title: 'Ödev: 1' } as any);
    assert.equal(f.fsPath, path.join(root, 'Python', 'Ödev 1'));
});
