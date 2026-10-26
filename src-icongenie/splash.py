"""Cuts src-icongenie/splash.png into every Android splash size (python3 src-icongenie/splash.py)."""
from pathlib import Path

from PIL import Image, ImageOps

root = Path(__file__).resolve().parent
source = Image.open(root / 'splash.png').convert('RGB')

for target in (root.parent / 'src-capacitor/android/app/src/main/res').glob('drawable*/splash.png'):
    size = Image.open(target).size
    ImageOps.fit(source, size, Image.LANCZOS).save(target)
