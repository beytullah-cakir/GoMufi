import { GitMerge, Rocket, Target } from 'lucide-react';
import type React from 'react';
import type { TaskKind } from './types';

/**
 * Görev slaytlarının (UYGULA / BİRLEŞTİR / ÜRET) aşamaya özel kimliği.
 *
 * NEDEN TEK TABLO: üç slayt önceden üç ayrı ~800 satırlık kopyaydı ve
 * kopyalandıktan sonra ayrı ayrı değiştirildi — biri doğru teslim adresini
 * kullanırken ikisi var olmayan bir adrese gönderiyordu, birinin düzenleme
 * ekranı bozuktu. Artık iskelet tek (TaskSlideShell), aşamalar yalnızca
 * burada ayrışıyor: renk, metin ve varsayılanlar.
 *
 * Öğrencinin gördüğü yüzeyler (kart, yönerge, ipucu, gönder) aşamadan bağımsız
 * SADE: nötr kart, sarı ipucu, mor gönder. Aşama rengi yalnızca rozette ve
 * düzenleme alanlarında — eskiden her şey aşama rengine boyanıyordu.
 *
 * Sınıf adları TAM METİN olarak duruyor: Tailwind kaynak koddaki sınıfları
 * metin olarak tarar, `bg-${renk}-500` gibi birleştirilmiş adları göremez.
 */

export interface StageTheme {
    card: string;
    divider: string;
    badge: string;
    badgeIcon: string;
    xpPill: string;
    field: string;
    promptBox: string;
    panel: string;
    panelTitle: string;
    smallButton: string;
    chipOn: string;
    accentText: string;
    tabOn: string;
    tabIcon: string;
    tabEntry: string;
    addFile: string;
    fileName: string;
    entryOn: string;
    runButton: string;
    caret: string;
    hintBox: string;
    hintTitle: string;
    hintIcon: string;
    hintText: string;
    submit: string;
    submitDone: string;
    fileInput: string;
    focus: string;
}

export interface StageMeta {
    /** Aşama adı — oynatıcının üst barındaki ve teslim listesindeki ad. */
    stage: 'UYGULA' | 'BİRLEŞTİR' | 'ÜRET';
    /** Klasör adı öneki (ASCII; dosya sisteminde güvenli). */
    slug: string;
    badge: string;
    icon: React.ElementType;
    promptLabel: string;
    promptPlaceholder: string;
    hintEditLabel: string;
    hintViewLabel: string;
    hintPlaceholder: string;
    submitLabel: string;
    sentLabel: string;
    reviewTitle: string;
    emptyReview: string;
    starterComment: string;
    theme: StageTheme;
}

export const STAGE_META: Record<TaskKind, StageMeta> = {
    challenge: {
        stage: 'UYGULA',
        slug: 'uygula',
        badge: 'UYGULA · KODLAMA GÖREVİ',
        icon: Target,
        promptLabel: 'Görev Yönergesi',
        promptPlaceholder: 'Öğrencinin yapması gereken kodlama görevi...',
        hintEditLabel: 'Görev İpucu (Düzenle)',
        hintViewLabel: 'İpucu & Yol Haritası',
        hintPlaceholder: 'Öğrenciye takıldığında yardımcı olacak ipucu...',
        submitLabel: 'Görevi Gönder',
        sentLabel: 'Görev Gönderildi',
        reviewTitle: 'Öğrenci Görev Teslimleri',
        emptyReview: 'Henüz öğrenci görev teslimi bulunmuyor.',
        starterComment: 'Kodunu buraya yaz',
        theme: {
            card: 'border-slate-200 border-b-slate-300',
            divider: 'border-slate-100',
            badge: 'bg-cyan-100 text-cyan-800 border-cyan-300',
            badgeIcon: 'text-cyan-600',
            xpPill: 'bg-amber-100 text-amber-700 border-b-2 border-amber-300',
            field: 'bg-cyan-50/50 border-cyan-200 focus:border-cyan-400',
            promptBox: 'bg-slate-50 border-slate-200',
            panel: 'bg-white border-slate-200',
            panelTitle: 'text-slate-700',
            smallButton: 'text-cyan-700 hover:text-cyan-800 bg-cyan-200/60 hover:bg-cyan-200',
            chipOn: 'bg-cyan-50 border-cyan-400 text-cyan-700',
            accentText: 'text-cyan-700',
            tabOn: 'bg-cyan-600 text-white border-cyan-700',
            tabIcon: 'text-cyan-600',
            tabEntry: 'bg-cyan-700 text-cyan-100',
            addFile: 'text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border-cyan-200',
            fileName: 'text-cyan-400',
            entryOn: 'bg-cyan-500 text-white',
            runButton: 'bg-cyan-500 hover:bg-cyan-400 text-cyan-950',
            caret: 'caret-cyan-400 selection:bg-cyan-500/30',
            hintBox: 'bg-amber-50 border-amber-200 border-b-4',
            hintTitle: 'text-amber-800',
            hintIcon: 'text-amber-500',
            hintText: 'text-slate-700',
            submit: 'bg-violet-500 hover:bg-violet-600 text-white border-violet-700',
            submitDone: 'bg-emerald-50 text-emerald-700 border-emerald-300',
            fileInput: 'file:bg-cyan-100 file:text-cyan-800 hover:file:bg-cyan-200',
            focus: 'focus:border-cyan-400',
        },
    },
    connect: {
        stage: 'BİRLEŞTİR',
        slug: 'birlestir',
        badge: 'BİRLEŞTİR · SENTEZ GÖREVİ',
        icon: GitMerge,
        promptLabel: 'Sentez Yönergesi',
        promptPlaceholder: 'Önceki ve şimdiki konuyu birleştiren görev yönergesi...',
        hintEditLabel: 'Birleştirme İpucu (Düzenle)',
        hintViewLabel: 'İpucu & Yol Haritası',
        hintPlaceholder: 'Öğrenciye konuları birleştirmesi için yol gösteren ipucu...',
        submitLabel: 'Görevi Gönder',
        sentLabel: 'Görev Gönderildi',
        reviewTitle: 'Öğrenci Görev Teslimleri',
        emptyReview: 'Henüz öğrenci görev teslimi bulunmuyor.',
        starterComment: 'Kodunu buraya yaz',
        theme: {
            card: 'border-slate-200 border-b-slate-300',
            divider: 'border-slate-100',
            badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
            badgeIcon: 'text-emerald-600',
            xpPill: 'bg-amber-100 text-amber-700 border-b-2 border-amber-300',
            field: 'bg-emerald-50/50 border-emerald-200 focus:border-emerald-400',
            promptBox: 'bg-slate-50 border-slate-200',
            panel: 'bg-white border-slate-200',
            panelTitle: 'text-slate-700',
            smallButton: 'text-emerald-700 hover:text-emerald-800 bg-emerald-200/60 hover:bg-emerald-200',
            chipOn: 'bg-emerald-50 border-emerald-400 text-emerald-700',
            accentText: 'text-emerald-700',
            tabOn: 'bg-emerald-600 text-white border-emerald-700',
            tabIcon: 'text-emerald-600',
            tabEntry: 'bg-emerald-700 text-emerald-100',
            addFile: 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200',
            fileName: 'text-emerald-400',
            entryOn: 'bg-emerald-500 text-white',
            runButton: 'bg-emerald-500 hover:bg-emerald-400 text-emerald-950',
            caret: 'caret-emerald-400 selection:bg-emerald-500/30',
            hintBox: 'bg-amber-50 border-amber-200 border-b-4',
            hintTitle: 'text-amber-800',
            hintIcon: 'text-amber-500',
            hintText: 'text-slate-700',
            submit: 'bg-violet-500 hover:bg-violet-600 text-white border-violet-700',
            submitDone: 'bg-emerald-50 text-emerald-700 border-emerald-300',
            fileInput: 'file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200',
            focus: 'focus:border-emerald-400',
        },
    },
    produce: {
        stage: 'ÜRET',
        slug: 'uret',
        badge: 'ÜRET · PROJE GÖREVİ',
        icon: Rocket,
        promptLabel: 'Proje Senaryosu & Yönerge',
        promptPlaceholder: 'Öğrencinin yapmasını istediğiniz projenin senaryosu...',
        hintEditLabel: 'Proje İpucu / Mimari Tavsiye (Düzenle)',
        hintViewLabel: 'İpucu & Mimari Tavsiye',
        hintPlaceholder: 'Öğrenciye yol gösterecek mimari ipucu...',
        submitLabel: 'Projeyi Gönder',
        sentLabel: 'Proje Gönderildi',
        reviewTitle: 'Öğrenci Proje Teslimleri',
        emptyReview: 'Henüz öğrenci proje teslimi bulunmuyor.',
        starterComment: 'Proje kodunu buraya yaz',
        theme: {
            card: 'border-slate-200 border-b-slate-300',
            divider: 'border-slate-100',
            badge: 'bg-amber-100 text-amber-800 border-amber-300',
            badgeIcon: 'text-amber-600',
            xpPill: 'bg-amber-100 text-amber-700 border-b-2 border-amber-300',
            field: 'bg-amber-50/50 border-amber-200 focus:border-amber-400',
            promptBox: 'bg-slate-50 border-slate-200',
            panel: 'bg-white border-slate-200',
            panelTitle: 'text-slate-700',
            smallButton: 'text-amber-700 hover:text-amber-800 bg-amber-200/60 hover:bg-amber-200',
            chipOn: 'bg-amber-50 border-amber-400 text-amber-700',
            accentText: 'text-amber-700',
            tabOn: 'bg-amber-600 text-white border-amber-700',
            tabIcon: 'text-amber-600',
            tabEntry: 'bg-amber-700 text-amber-100',
            addFile: 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200',
            fileName: 'text-amber-400',
            entryOn: 'bg-amber-500 text-white',
            runButton: 'bg-amber-500 hover:bg-amber-400 text-amber-950',
            caret: 'caret-amber-400 selection:bg-amber-500/30',
            hintBox: 'bg-amber-50 border-amber-200 border-b-4',
            hintTitle: 'text-amber-800',
            hintIcon: 'text-amber-500',
            hintText: 'text-slate-700',
            submit: 'bg-violet-500 hover:bg-violet-600 text-white border-violet-700',
            submitDone: 'bg-emerald-50 text-emerald-700 border-emerald-300',
            fileInput: 'file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200',
            focus: 'focus:border-amber-400',
        },
    },
};

/**
 * Görevin VS Code'daki klasörü: "birlestir-83749121".
 *
 * Aşama adı klasörde görünüyor ki öğrenci kendi bilgisayarında hangi klasörün
 * hangi göreve ait olduğunu anlayabilsin; slayt id'si de iki görevin
 * birbirinin dosyasını ezmesini engelliyor.
 */
export const taskFolder = (kind: TaskKind, slideId: string | number): string =>
    `${STAGE_META[kind].slug}-${String(slideId).replace(/[^A-Za-z0-9_-]/g, '')}`;
