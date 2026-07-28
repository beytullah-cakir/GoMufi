from routers.ai import _clip_to_max_chars
text = "a" * 700
out = _clip_to_max_chars({"maxChars": 100}, text + " extra words here that go past the limit boundary for sure yes indeed")
print(len(out), out[:120])

# word-boundary check
text2 = "Bu cümle oldukça uzun ve limiti asiyor test icin yazildi devam ediyor devam ediyor devam ediyor"
out2 = _clip_to_max_chars({"maxChars": 40}, text2)
print(repr(out2), len(out2))
