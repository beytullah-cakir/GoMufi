/** Sunucudan gelen ve eklentinin kullandığı veri şekilleri. */

export type Role = 'student' | 'teacher' | 'admin';

export interface DeviceToken {
    access_token: string;
    token_type: string;
    role: Role;
    user_id: string;
    display_name: string;
    expires_in: number;
}

/** `/my-content` yanıtından eklentinin ihtiyaç duyduğu alanlar. */
export interface Course {
    id: number;
    title: string;
    /** Yol haritası düğümleri; ödev düğümleri buradan bulunur. */
    curriculum?: any[];
    /** Slayt desteleri; ödev yapılandırması (homeworkConfig) burada. */
    notes?: any[];
}

/** Bir kurstaki tek bir ödev — curriculum + notes birleştirilerek türetilir. */
export interface Assignment {
    courseId: number;
    courseTitle: string;
    /** Teslim anahtarı: slaytın id'si (tarayıcı tarafıyla AYNI olmalı). */
    nodeId: string;
    title: string;
    instructions: string;
    submissionType: 'text' | 'code' | 'image' | 'file';
    points: number;
    starterCode?: string;
}

/** Öğrencinin kendi teslimi + öğretmen değerlendirmesi. */
export interface MySubmission {
    id: number;
    file_name: string;
    submitted_at: string | null;
    grade: number | null;
    feedback: string | null;
    /** Değerlendirilmiş mi sorusunun TEK kaynağı — 0 geçerli bir nottur. */
    graded_at: string | null;
}

/** Öğretmen görünümündeki teslim. */
export interface Submission {
    id: number;
    node_id: string;
    node_title: string;
    student_id: number;
    student_name: string;
    student_email: string;
    file_name: string;
    file_mime: string | null;
    file_data: string | null;
    student_note: string | null;
    submitted_at: string | null;
    grade: number | null;
    feedback: string | null;
    graded_at: string | null;
    graded_source: string | null;
}

/** Ödev klasörüne bırakılan işaret dosyası — klasörü sunucudaki ödeve bağlar. */
export interface AssignmentMarker {
    courseId: number;
    nodeId: string;
    title: string;
    submissionType: Assignment['submissionType'];
    /** Teslim edilecek dosyanın klasör içindeki göreli yolu. */
    answerFile: string;
}
