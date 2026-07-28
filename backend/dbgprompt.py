import inspect, re
from routers import ai

print("PLATFORM_CONTEXT tanimli:", bool(ai.PLATFORM_CONTEXT))
print()
print(ai.PLATFORM_CONTEXT)
print("-" * 60)

# Prompt iceren tum fonksiyonlarin kaynagini tarayip {PLATFORM_CONTEXT}
# gercekten f-string icinde mi kontrol et (kacirilmis/kacan yer var mi).
src = inspect.getsource(ai)
blocks = re.findall(r'(prompt\w*)\s*=\s*(f?)"""\s*\n\{PLATFORM_CONTEXT\}', src)
print("f-string icinde enjekte edilen prompt sayisi:",
      sum(1 for _, isf in blocks if isf == "f"))
bad = [name for name, isf in blocks if isf != "f"]
print("f-string OLMAYAN (hatali) bloklar:", bad or "yok")

# Toplam prompt blogu sayisi ile karsilastir
total = len(re.findall(r'(prompt\w*)\s*=\s*f"""', src))
print("toplam prompt blogu:", total)
