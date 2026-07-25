"""
Oyunlaştırma çekirdeği — XP'den level ve lig (league) hesabı.

Tek kaynak: level eğrisi, lig kademeleri ve ilerleme yüzdesi burada tanımlıdır.
Saf fonksiyonlardır (DB/HTTP yok), bu yüzden kolay test edilir. XP zaten
`students.xp` kolonunda tutulur ve `POST /profile/student/stats` ile artar;
level/lig bu XP'den TÜRETİLİR — ayrı kolon gerekmez.
"""
from typing import Dict, Any, List, Tuple

# Level eğrisi: L→L+1 için gereken XP = LEVEL_BASE + (L-1)*LEVEL_STEP.
# Erken level'lar hızlı atlanır (çocuk motivasyonu), sonra kademeli zorlaşır.
LEVEL_BASE = 100
LEVEL_STEP = 25
# Sonsuz döngü koruması — pratikte ulaşılmaz bir tavan.
MAX_LEVEL = 200

# Lig kademeleri: (başlangıç_level, ad, emoji, renk). Level bu banda göre lige eşlenir.
LEAGUES: List[Tuple[int, str, str, str]] = [
    (1, "Bronz", "🥉", "#cd7f32"),
    (5, "Gümüş", "🥈", "#9ca3af"),
    (10, "Altın", "🥇", "#f59e0b"),
    (20, "Platin", "💠", "#22d3ee"),
    (35, "Elmas", "💎", "#60a5fa"),
    (55, "Efsane", "👑", "#a855f7"),
]


def xp_for_level(level: int) -> int:
    """Belirli bir level'a ULAŞMAK için gereken kümülatif XP. Level 1 = 0 XP."""
    if level <= 1:
        return 0
    n = level - 1  # tamamlanmış level sayısı
    # Σ_{k=1..n} (BASE + (k-1)*STEP) = BASE*n + STEP*n*(n-1)/2
    return LEVEL_BASE * n + LEVEL_STEP * n * (n - 1) // 2


def level_for_xp(xp: int) -> int:
    """Verilen XP'ye karşılık gelen level (1 tabanlı)."""
    xp = max(0, int(xp or 0))
    level = 1
    while level < MAX_LEVEL and xp_for_level(level + 1) <= xp:
        level += 1
    return level


def league_for_level(level: int) -> Dict[str, Any]:
    """Level'a karşılık gelen lig kademesi (en yüksek uyan bant)."""
    chosen = LEAGUES[0]
    for band in LEAGUES:
        if level >= band[0]:
            chosen = band
        else:
            break
    start_level, name, emoji, color = chosen
    return {"name": name, "emoji": emoji, "color": color, "tier_start_level": start_level}


def level_progress(xp: int) -> Dict[str, Any]:
    """
    XP'den tam ilerleme özeti: level, lig, mevcut level içindeki ilerleme.

    Frontend'in XP barı ve lig rozetini gerçek veriyle çizebilmesi için tek çağrı.
    """
    xp = max(0, int(xp or 0))
    level = level_for_xp(xp)
    current_floor = xp_for_level(level)
    next_floor = xp_for_level(level + 1)
    into_level = xp - current_floor
    span = next_floor - current_floor  # bu level'ı bitirmek için gereken toplam XP
    to_next = max(0, span - into_level)
    progress_pct = round(into_level / span * 100) if span > 0 else 100

    return {
        "total_xp": xp,
        "level": level,
        "xp_into_level": into_level,
        "xp_for_next_level": span,
        "xp_to_next_level": to_next,
        "progress_pct": progress_pct,
        "league": league_for_level(level),
    }
