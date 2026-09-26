import { createContext, useContext } from 'react';

/**
 * Ders oynatıcısının slayttaki soru/oyun bileşenlerine ilettiği adres.
 *
 * Çoktan seçmeli soru ve slayt oyunları cevabı öğrenme kaydına yazmak için
 * hangi kursta ve hangi slaytta olduklarını bilmeli; bunu oynatıcı (LessonSlide)
 * sağlar. Oluşturucuda ve öğretmen önizlemesinde sağlayıcı yoktur: kayıt yapılmaz.
 */
export interface SlideAnswerTarget {
    courseId?: string | number;
    slideId?: string | number | null;
}

export const SlideAnswerContext = createContext<SlideAnswerTarget | null>(null);

export const useSlideAnswerTarget = () => useContext(SlideAnswerContext);
