from PIL import Image, ImageDraw, ImageFont

W, H = 900, 560
img = Image.new('RGBA', (W, H), (0, 0, 0, 255))
d = ImageDraw.Draw(img)

cx, cy = 305, 205
r = 185

# Gold orbit curves
for box, start, end, width in [
    ((cx-r-30, cy-r-55, cx+r+30, cy+r+55), 20, 195, 15),
    ((cx-r-30, cy-r-55, cx+r+30, cy+r+55), 350, 75, 15),
]:
    d.arc(box, start=start, end=end, fill=(218, 176, 57, 255), width=width)

# Blue sphere
orb = Image.new('RGBA', (W, H), (0, 0, 0, 0))
od = ImageDraw.Draw(orb)
od.ellipse((cx-r+15, cy-r+20, cx+r-15, cy+r-20), fill=(0, 150, 220, 255))
for i in range(14):
    alpha = max(20, 120 - i * 7)
    overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    o = ImageDraw.Draw(overlay)
    o.ellipse((cx-r+25+i, cy-r+25+i, cx+r-25-i, cy+r-25-i), outline=(255, 255, 255, alpha), width=2)
    orb = Image.alpha_composite(orb, overlay)
img = Image.alpha_composite(img, orb)

# Gold outline around center disc
outline = Image.new('RGBA', (W, H), (0, 0, 0, 0))
od = ImageDraw.Draw(outline)
od.ellipse((cx-r+18, cy-r+18, cx+r-18, cy+r-18), outline=(218, 176, 57, 255), width=18)
img = Image.alpha_composite(img, outline)

# White central disc
pd = Image.new('RGBA', (W, H), (0, 0, 0, 0))
pod = ImageDraw.Draw(pd)
pod.ellipse((cx-r+58, cy-r+56, cx+r-58, cy+r-56), fill=(240, 242, 244, 255), outline=(24, 95, 175, 255), width=12)
img = Image.alpha_composite(img, pd)

# Book portion at bottom
book_x = 120
book_y = 330
book_w = 430
book_h = 160
book = Image.new('RGBA', (W, H), (0, 0, 0, 0))
bd = ImageDraw.Draw(book)
# white book body
bd.rounded_rectangle((book_x, book_y, book_x + book_w, book_y + book_h), radius=8, fill=(246, 246, 246, 255), outline=(15, 108, 42, 255), width=12)
# green lower book face
bd.polygon([(book_x, book_y), (book_x + book_w, book_y), (book_x + book_w - 52, book_y + book_h), (book_x + 52, book_y + book_h)], fill=(18, 127, 59, 255))
# blue panel with UIN
bd.rounded_rectangle((book_x + 28, book_y + 18, book_x + book_w - 28, book_y + book_h - 22), radius=10, fill=(16, 96, 175, 255))
img = Image.alpha_composite(img, book)

# Text "UIN"
font_path = 'C:/Windows/Fonts/arialbd.ttf'
font = ImageFont.truetype(font_path, 190)
text = 'UIN'
text_w = font.getbbox(text)[2]
text_x = book_x + (book_w - text_w) / 2 + 12
text_y = book_y + 36
d.text((text_x, text_y), text, font=font, fill=(248, 250, 250, 255))

# Gold ring highlight
for x in [160, 430]:
    d.line((x, 300, x + 60, 350), fill=(22, 118, 45, 255), width=8)

# Add a few decorative gold arcs at top and side to mimic the emblem more closely
extra = Image.new('RGBA', (W, H), (0, 0, 0, 0))
ex = ImageDraw.Draw(extra)
ex.arc((cx-r-85, cy-r-95, cx+r+85, cy+r+95), 130, 215, fill=(218, 176, 57, 255), width=12)
ex.arc((cx-r-85, cy-r-95, cx+r+85, cy+r+95), 325, 25, fill=(218, 176, 57, 255), width=12)
img = Image.alpha_composite(img, extra)

img.save('logo.png', format='PNG')
print('logo.png generated')
