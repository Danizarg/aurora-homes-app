"""
Builds assets/earth/earth-flat-4096.png: a flat, bright, Duolingo-coloured
Earth for the intro globe, derived from NASA's public-domain Blue Marble
(blue-marble-2048.jpg, kept here as the source; it is not bundled).

Each pixel is classified as sea, land or ice, the masks are upscaled with
smoothing so coastlines are soft curves, and flat colours with a darker
inner outline are painted (Duolingo's thick-stroke look).

    python scripts/earth-texture/build.py

Needs Pillow, numpy and scipy.
"""
import os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "blue-marble-2048.jpg")
DST = os.path.join(HERE, "..", "..", "assets", "earth", "earth-flat-4096.png")

img = np.asarray(Image.open(SRC).convert("RGB")).astype(np.float32)
H, W = img.shape[:2]
r, g, b = img[..., 0], img[..., 1], img[..., 2]
bright = (r + g + b) / 3
lat = 90 - (np.arange(H) + 0.5) / H * 180  # per row
lat2 = lat[:, None]

sea = (b > r + 12) & (r < 95)
snowy = (bright > 165) & (np.abs(r - b) < 40) & (np.abs(r - g) < 40)
# Ice only where it belongs: polar regions. Salt flats and clouds elsewhere stay land.
ice = snowy & (np.abs(lat2) > 50) & ~sea
# Antarctica is ice through and through, whatever shade the photo gives it.
ice |= (lat2 < -63) & ~sea
land = ~(sea | ice)

def clean(m):
    m = ndimage.binary_opening(m, iterations=1)
    return ndimage.binary_closing(m, iterations=1)

land = clean(land)
ice = clean(ice) & ~land

def up(m):
    im = Image.fromarray((m * 255).astype(np.uint8)).resize((W * 2, H * 2), Image.BICUBIC)
    return np.asarray(im.filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32) / 255

landM = up(land) > 0.5
iceM = (up(ice) > 0.5) & ~landM

# Duolingo palette: macaw / whale for water, feather green for land, snow for ice.
SEA, SEA_DEEP = np.array([28, 176, 246]), np.array([24, 153, 214])
LAND, LAND_DARK = np.array([88, 204, 2]), np.array([70, 163, 2])
ICE, ICE_EDGE = np.array([255, 255, 255]), np.array([229, 229, 229])

out = np.zeros((H * 2, W * 2, 3), np.float32)
out[:] = SEA
dist_sea = ndimage.distance_transform_edt(~landM & ~iceM)
deep = np.clip((dist_sea - 18) / 60, 0, 1)[..., None]
out = out * (1 - deep) + SEA_DEEP * deep
out[landM] = LAND
out[iceM] = ICE
out[landM & ~ndimage.binary_erosion(landM, iterations=5)] = LAND_DARK
out[iceM & ~ndimage.binary_erosion(iceM, iterations=5)] = ICE_EDGE

res = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))
res = res.convert("P", palette=Image.ADAPTIVE, colors=48)
res.save(os.path.abspath(DST), optimize=True)
print("land %.1f%%  ice %.1f%%  %dx%d -> %s" % (landM.mean() * 100, iceM.mean() * 100, res.size[0], res.size[1], os.path.abspath(DST)))
