import pytesseract
from PIL import Image
import os

# Set the path to the Tesseract engine (installed via winget)
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def extract_text_from_image(image_path):
    """
    Extracts text from an image file using Tesseract OCR.
    """
    try:
        if not os.path.exists(image_path):
            return {"error": "File not found"}
            
        image = Image.open(image_path)
        text = pytesseract.image_to_string(image)
        return {"text": text}
    except Exception as e:
        return {"error": str(e)}
