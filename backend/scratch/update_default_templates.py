import json
import os

TEMPLATES_PATH = "../slide_templates.json"

if not os.path.exists(TEMPLATES_PATH):
    print("slide_templates.json not found!")
    exit(1)

with open(TEMPLATES_PATH, "r", encoding="utf-8") as f:
    templates = json.load(f)

updated_count = 0
for t in templates:
    for el in t.get("elements", []):
        el_type = el.get("type")
        if el_type in ["text", "sticky", "challenge"]:
            width = el.get("width") or 300
            height = el.get("height") or 150
            style = el.get("style") or {}
            font_size = style.get("fontSize") or 18
            
            # Calculate max characters that can fit
            max_chars = int((width * height) / (0.75 * (font_size ** 2)))
            
            # Constrain to reasonable bounds
            if el_type == "text" and font_size >= 32: # Title-like
                max_chars = max(30, min(120, max_chars))
            else:
                max_chars = max(50, min(1000, max_chars))
                
            el["maxChars"] = max_chars
            updated_count += 1

with open(TEMPLATES_PATH, "w", encoding="utf-8") as f:
    json.dump(templates, f, indent=2, ensure_ascii=False)

print(f"Successfully updated default templates! Added maxChars to {updated_count} elements.")
