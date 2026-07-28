from routers.ai import _format_list_breaks
text = "1. Python'ın resmi web sitesi olan python.org/downloads adresine gidin.2. İşletim sisteminize (Windows, macOS, Linux) uygun en son Python sürümünü indirin."
print(_format_list_breaks(text))
