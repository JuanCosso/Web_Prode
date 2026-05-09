import fitz  # PyMuPDF
import numpy as np
from PIL import Image
import io

def limpiar_marca_agua_optimizada(input_path, output_path):
    doc = fitz.open(input_path)
    out_pdf = fitz.open()

    print("Procesando páginas... (esta vez sin crear un monstruo de 1.4 GB)")

    for i in range(len(doc)):
        pagina = doc[i]
        rect = pagina.rect 

        # Bajamos a 200 DPI: resolución perfecta para imprimir vectores sin pesar toneladas
        pix = pagina.get_pixmap(dpi=200)
        
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        arr = np.array(img)

        # Lógica de filtrado: lo claro se vuelve blanco puro
        mascara_clara = (arr[:, :, 0] > 160) | (arr[:, :, 1] > 160) | (arr[:, :, 2] > 160)
        arr[mascara_clara] = [255, 255, 255]

        # Convertimos la matriz resultante a ESCALA DE GRISES ('L'). 
        # Esto elimina los canales RGB inútiles y desploma el peso del archivo.
        img_procesada = Image.fromarray(arr).convert('L')
        
        img_bytes = io.BytesIO()
        # Guardamos comprimiendo el PNG
        img_procesada.save(img_bytes, format="PNG", optimize=True)

        # Volvemos a armar la hoja
        nueva_pagina = out_pdf.new_page(width=rect.width, height=rect.height)
        nueva_pagina.insert_image(rect, stream=img_bytes.getvalue())
        
        print(f"Página {i+1} procesada...")

    # Guardamos con máxima compresión de estructura PDF
    out_pdf.save(output_path, deflate=True, garbage=4)
    print(f"¡Listo! PDF liviano guardado en: {output_path}")

# Ejecución
limpiar_marca_agua_optimizada("chaleco.pdf", "chaleco_limpio_ligero.pdf")