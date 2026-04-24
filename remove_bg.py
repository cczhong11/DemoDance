from PIL import Image

def process():
    img = Image.open("/Users/tczhong/.gemini/antigravity/brain/360146d2-f5a3-4580-bba9-9bed6c498c5f/media__1777009909589.png").convert("RGBA")
    data = img.getdata()
    new_data = []
    
    # Let's count how many white pixels
    white_count = 0
    opaque_count = 0
    for item in data:
        r, g, b, a = item
        # If it's pure white
        if r > 240 and g > 240 and b > 240:
            new_data.append((255, 255, 255, 0))
            white_count += 1
        else:
            # Check if it has an existing alpha channel that is transparent
            if a == 0:
                pass
            else:
                opaque_count += 1
            new_data.append(item)
            
    print(f"White pixels removed: {white_count}")
    print(f"Opaque pixels kept: {opaque_count}")
            
    img.putdata(new_data)
    img.save("UI/demodance/public/logo.png", "PNG")

process()
print("Done processing media__1777009909589.png")
