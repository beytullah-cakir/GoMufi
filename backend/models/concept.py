from sqlalchemy import (
    Column, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint, func
)
from connect_db import Base


class Concept(Base):
    """
    Bir DİLİN kavram sözlüğündeki tek kayıt.

    Tablo kurs bazlı DEĞİLDİR: (language, concept_id) çifti tekildir ve
    platformdaki bütün kurslar aynı satırı paylaşır. Öğretmen bir kavramı
    düzeltince düzeltme herkese gider — sözlük kullanıldıkça iyileşir.
    """

    __tablename__ = "concepts"

    id = Column(Integer, primary_key=True)
    language = Column(String(40), nullable=False, index=True)
    concept_id = Column(String(80), nullable=False)
    label = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    # Aynı dilin sözlüğündeki diğer concept_id'ler.
    prerequisites = Column(JSON, default=[])
    # seed  = kodda yazılı tohum
    # ai    = model üretti, öğretmen onayladı
    # teacher = öğretmen elle ekledi
    source = Column(String(20), default="seed")
    created_by = Column(Integer, ForeignKey("teachers.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("language", "concept_id", name="uq_concept_language_id"),
    )


class UnmatchedConcept(Base):
    """
    Modelin sözlükte bulamadığı kavram önerisi.

    NEDEN LOG, NEDEN OTOMATİK EKLEME YOK: model bir konuya "asenkron_programlama"
    gibi sözlükte olmayan bir kavram uydurduğunda bunu sessizce sözlüğe almak,
    ölçüm birimini modelin hayal gücüne bırakmak demektir. Kayıt burada birikir;
    aynı öneri defalarca geliyorsa (hit_count) bu, sözlüğe gerçekten eksik bir
    kavramın işaretidir ve insan kararıyla eklenir.
    """

    __tablename__ = "unmatched_concepts"

    id = Column(Integer, primary_key=True)
    language = Column(String(40), nullable=False, index=True)
    raw_label = Column(String(200), nullable=False)
    topic_title = Column(String(300), nullable=True)
    course_topic = Column(String(300), nullable=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=True)
    hit_count = Column(Integer, default=1)
    created_at = Column(DateTime, server_default=func.now())
    last_seen_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("language", "raw_label", name="uq_unmatched_language_label"),
    )
