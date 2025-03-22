try:
    import pptx
    print('pptx OK')
except ImportError:
    print('pptx NOT FOUND')

try:
    import pdf2image
    print('pdf2image OK')
except ImportError:
    print('pdf2image NOT FOUND')

try:
    import PIL
    print('PIL OK')
except ImportError:
    print('PIL NOT FOUND') 