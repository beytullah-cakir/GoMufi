import { strict as assert } from 'assert';
import { test } from 'node:test';
import { isSameOrInside, labFolderName, safeFolderName, slideFileName } from '../paths';
import { shellLine } from '../shell';

test('ders penceresi: kökün kendisi ve altı kabul, komşu klasör değil', () => {
    assert.equal(isSameOrInside('/home/ece/GoMufi', '/home/ece/GoMufi', 'linux'), true);
    assert.equal(isSameOrInside('/home/ece/GoMufi', '/home/ece/GoMufi/Python/Ders 1', 'linux'), true);
    assert.equal(isSameOrInside('/home/ece/GoMufi/', '/home/ece/GoMufi', 'linux'), true);
    // Aynı önekle başlayan başka klasör kökün içi SAYILMAZ.
    assert.equal(isSameOrInside('/home/ece/GoMufi', '/home/ece/GoMufi2', 'linux'), false);
    assert.equal(isSameOrInside('/home/ece/GoMufi', '/home/ece', 'linux'), false);
});

test('Windows ve macOS yolları büyük/küçük harf duyarsız', () => {
    assert.equal(isSameOrInside('C:\\Users\\Ece\\GoMufi', 'c:\\users\\ece\\gomufi\\Python', 'win32'), true);
    assert.equal(isSameOrInside('/Users/ece/GoMufi', '/users/ece/gomufi', 'darwin'), true);
    assert.equal(isSameOrInside('/home/ece/GoMufi', '/home/ece/gomufi', 'linux'), false);
});

test('güvenli klasör adı: yasak karakterler, sondaki nokta, ayrılmış adlar', () => {
    assert.equal(safeFolderName('Döngüler: ANLA / 1?'), 'Döngüler ANLA 1');
    assert.equal(safeFolderName('  çok   boşluk  '), 'çok boşluk');
    assert.equal(safeFolderName('bitiş...'), 'bitiş');
    assert.equal(safeFolderName('CON'), 'odev');
    assert.equal(safeFolderName(''), 'odev');
    assert.equal(safeFolderName('a'.repeat(100)).length, 60);
});

test('her slayt kendi dosyası; başlık yoksa ortak ad', () => {
    assert.equal(slideFileName('Değişken Nedir?', 'py'), 'slayt-değişken-nedir.py');
    assert.equal(slideFileName(undefined, 'js'), 'slayt.js');
    assert.equal(slideFileName('***', 'py'), 'slayt.py');
});

test('laboratuvar klasörü ad ve kimlik içerir', () => {
    assert.equal(labFolderName('Ece Kaya', '42'), 'Ece Kaya-42');
    assert.equal(labFolderName('', '7'), 'Ogrenci-7');
});

test('terminal satırı: boşluklu yorumlayıcı PowerShell\'de & ile çağrılır', () => {
    assert.equal(shellLine('python3', ['/tmp/a b.py'], '/bin/bash'), 'python3 "/tmp/a b.py"');
    assert.equal(shellLine('py', ['-3', 'C:\\x.py'], 'powershell.exe'), 'py "-3" "C:\\x.py"');
    assert.equal(
        shellLine('C:\\Program Files\\Python\\python.exe', ['C:\\x.py'], 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'),
        '& "C:\\Program Files\\Python\\python.exe" "C:\\x.py"',
    );
    assert.equal(
        shellLine('C:\\Program Files\\Python\\python.exe', ['C:\\x.py'], 'C:\\Windows\\System32\\cmd.exe'),
        '"C:\\Program Files\\Python\\python.exe" "C:\\x.py"',
    );
});
