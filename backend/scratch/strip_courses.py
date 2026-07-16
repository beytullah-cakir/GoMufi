with open("../routers/courses.py", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Slice up to line 864 (index 863)
lines_to_keep = lines[:864]

with open("../routers/courses.py", "w", encoding="utf-8") as f:
    f.writelines(lines_to_keep)

print("Courses.py successfully stripped!")
