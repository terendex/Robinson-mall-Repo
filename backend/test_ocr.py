from api.ocr_utils import extract_text_from_image
import os

def test():
    # You can put a path to an image here to test
    image_path = "test_receipt.jpg" 
    
    if not os.path.exists(image_path):
        print(f"Please place an image named '{image_path}' in the backend folder to test.")
        return

    print(f"Processing {image_path}...")
    result = extract_text_from_image(image_path)
    
    if "error" in result:
        print(f"Error: {result['error']}")
    else:
        print("--- Extracted Text ---")
        print(result['text'])
        print("-----------------------")

if __name__ == "__main__":
    test()
