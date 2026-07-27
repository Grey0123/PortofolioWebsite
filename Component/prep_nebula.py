"""
Prep the four hand-added nebula art files in Component/ into web assets under
public/images/nebula/.

Why this step exists at all: the three "component" pieces were exported as JPEG
on a flat off-white (247,247,247) matte. The nebula scene composites its layers
onto a near-black canvas with `screen` / `multiply` blending, so a white
rectangle would wash the whole frame out. We have to recover an alpha channel
before they're usable.

The maths: a matte export is `C = F*a + M*(1-a)` per channel, where M is the
matte grey and F the true foreground colour. Two unknowns, one equation — so we
assume the *darkest* channel of a genuinely-opaque pixel can reach 0, which
gives `a = (M - min(C)) / M`, then unpremultiply to recover F. That's the
standard white-matte key; it keeps soft wispy gas edges instead of hard-cutting
them like a threshold would.
"""

import numpy as np
from PIL import Image, ImageFilter

# Run from anywhere:  python Component/prep_nebula.py
# Requires: pip install pillow numpy
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "Component"
OUT = ROOT / "public" / "images" / "nebula"
MATTE = 247.0  # the off-white the source JPEGs were exported onto

os.makedirs(OUT, exist_ok=True)


def key_white_matte(path, alpha_gain=1.0, max_w=None):
    rgb = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)

    # alpha from the darkest channel (see module docstring)
    a = (MATTE - rgb.min(axis=2)) / MATTE
    # A bright, strongly-coloured pixel (the glowing core) has a high min
    # channel and so scores a low alpha, which would make the core wash out.
    # Chroma is the tell: it's ~0 on the matte but high in the core, so take
    # whichever estimate is stronger.
    chroma = (rgb.max(axis=2) - rgb.min(axis=2)) / MATTE
    a = np.maximum(a, np.clip(chroma * 2.2, 0, 1))
    a = np.clip(a * alpha_gain, 0, 1)

    # unpremultiply: recover F from the observed composite
    a3 = a[..., None]
    safe = np.maximum(a3, 1e-3)
    fg = (rgb - MATTE * (1 - a3)) / safe
    fg = np.clip(fg, 0, 255)
    # NOTE: unpremultiplying a blown-out core (near-white, so a is low) divides
    # by a small number and amplifies JPEG chroma error into visible colour
    # blotches. Fading back toward the observed colour fixes that but leaves a
    # grey haze on the soft gas edges, which is far more noticeable — so we
    # accept the core artifact. Only `crystal.webp` is badly affected, and it
    # ships disabled. The real fix is re-exporting that piece with a genuine
    # alpha channel (PNG/WebP) instead of a flat white matte.
    # below this alpha the recovered colour is numerical noise — let it go black
    fg = np.where(a3 < 0.02, 0.0, fg)

    out = np.dstack([fg, a * 255.0]).astype(np.uint8)
    im = Image.fromarray(out, "RGBA")

    # trim to the alpha bounding box so we aren't shipping transparent padding
    bbox = im.getchannel("A").point(lambda v: 255 if v > 3 else 0).getbbox()
    if bbox:
        im = im.crop(bbox)

    if max_w and im.width > max_w:
        im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)

    # 1px feather on alpha only — hides JPEG ringing left along the matte edge
    alpha = im.getchannel("A").filter(ImageFilter.GaussianBlur(0.8))
    im.putalpha(alpha)
    return im


# ---- 1. backdrop -----------------------------------------------------------
# The source has "CLICK ANYWHERE TO RETURN · ESC" baked into it around
# y=955..965 (it was rendered from a screenshot of the live easter egg). The
# real UI already draws that caption as DOM text, so crop the band off rather
# than shipping a duplicate that can't be restyled or translated.
bg = Image.open(SRC / "Nebula_Background.jpeg").convert("RGB")
bg = bg.crop((0, 0, bg.width, 950))
bg.save(OUT / "backdrop.jpg", quality=82, optimize=True, progressive=True)
print("backdrop.jpg", bg.size)

# ---- 2. keyed components ---------------------------------------------------
for name, src, gain, w in [
    ("core-glow", "Component_1.jpeg", 1.15, 1200),   # glowing gas eye -> nursery core
    ("ring", "Component_2.jpeg", 1.10, 1400),        # torus -> slow dust ring
    ("crystal", "Center_Nebula.jpeg", 1.0, 900),     # optional centrepiece
]:
    im = key_white_matte(SRC / src, alpha_gain=gain, max_w=w)
    im.save(OUT / f"{name}.webp", quality=82, method=6)
    print(f"{name}.webp", im.size)

# ---- 3. preview sheet over a dark ground so the keying can be eyeballed ----
# The keyed pieces are invisible against a white file browser, so this sheet
# shows them the way the canvas will (near-black ground) — edge haze or colour
# blotches from a bad key are obvious here and nowhere else.
prev = Image.new("RGB", (1400, 520), (4, 4, 14))
x = 20
for name in ["core-glow", "ring", "crystal"]:
    im = Image.open(OUT / f"{name}.webp").convert("RGBA")
    im.thumbnail((440, 440), Image.LANCZOS)
    prev.paste(im, (x, 40), im)
    x += 460
prev.save(SRC / "key_preview.png")
print("preview ->", SRC / "key_preview.png")
