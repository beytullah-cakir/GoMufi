import React, { createContext, useContext } from 'react';

/**
 * "Şu an hangi slayttayız" — VS Code'a geçerken taşınan adres.
 *
 * NEDEN GEREKLİ: tarayıcıdaki bir kod bloğunda "VS Code'a Geç" denince iki şey
 * olmalı — kod oraya gitmeli VE öğrenci aynı yerde devam edebilmeli. İkincisi
 * için eklentinin hangi dersin hangi slaydını açacağını bilmesi gerekiyor.
 * Kod bloğu (CodeWidget) bunu kendi başına bilemez; slaydın kimliği oynatıcıda
 * (LessonSlide) durur. Araya prop zinciri döşemek yerine bağlam veriyoruz —
 * builder'da (sağlayıcısız) değeri null kalır ve bağlantı yalnızca paneli açar.
 */

export interface VSCodeTarget {
    courseId?: string;
    /** Modül/ders başlığı — eklenti panelinde bu başlıkla eşleştirilir. */
    module?: string;
    /** Slayt sırası (0 tabanlı). */
    slide?: number;
}

const TargetContext = createContext<VSCodeTarget | null>(null);

export const VSCodeTargetProvider: React.FC<{
    value: VSCodeTarget; children: React.ReactNode;
}> = ({ value, children }) => (
    <TargetContext.Provider value={value}>{children}</TargetContext.Provider>
);

export const useVSCodeTarget = (): VSCodeTarget | null => useContext(TargetContext);

/**
 * VS Code'a geçer: pencereyi öne getirir, ders panelini açar ve verilen slayda
 * gider.
 *
 * `vscode://` bağlantısı odağı taşımanın TEK yolu — yerel sunucu dosyayı açabilir
 * ama işletim sistemi penceresini öne getiremez (odak, isteği alan sürece değil,
 * tıklanan bağlantının sahibine verilir).
 */
export const switchToVSCode = (target?: VSCodeTarget | null): void => {
    const params = new URLSearchParams();
    if (target?.courseId) params.set('course', String(target.courseId));
    if (target?.module) params.set('module', target.module);
    if (typeof target?.slide === 'number') params.set('slide', String(target.slide));
    const query = params.toString();
    window.location.href = `vscode://gomufi.gomufi/lesson${query ? `?${query}` : ''}`;
};
