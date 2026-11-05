"""Rasterize the approved local SVG for PWA PNG fallbacks; never redraw the mark."""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
svg=(root/'assets/icons/centralpdf-logo.svg').read_text()
with sync_playwright() as p:
 browser=p.chromium.launch()
 for size in [192,512]:
  page=browser.new_page(viewport={'width':size,'height':size},device_scale_factor=1,color_scheme='light')
  markup=re.sub(r'width="512" height="512"',f'width="{size}" height="{size}"',svg,count=1)
  page.set_content('<style>html,body{margin:0;background:transparent}svg{display:block}</style>'+markup)
  page.screenshot(path=str(root/f'assets/icons/icon-{size}.png'),omit_background=True)
  page.close()
 browser.close()
