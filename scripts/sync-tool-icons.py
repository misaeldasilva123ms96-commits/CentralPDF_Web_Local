#!/usr/bin/env python3
"""Generate the inline, offline SVG tool sprite and entry-point references."""
from pathlib import Path
import argparse,json,re,html
ROOT=Path(__file__).resolve().parents[1]
def generate():
 entries=json.loads((ROOT/'scripts/data/tool-icons.json').read_text())
 ids={key:'t-'+str(index) for index,key in enumerate(entries)}
 # Rotation controls use stable action IDs, independent of catalogue ordering.
 ids['action:rotate-cw']='i-rotate-cw';ids['action:rotate-ccw']='i-rotate-ccw'
 source=(ROOT/'index.html').read_text()
 symbols='\n'.join(f'    <symbol id="{ids[key]}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">{value["body"]}</symbol>' for key,value in entries.items())
 block='    <!-- TOOL_ICONS_START -->\n'+symbols+'\n    <!-- TOOL_ICONS_END -->'
 if '<!-- TOOL_ICONS_START -->' in source:
  source=re.sub(r'    <!-- TOOL_ICONS_START -->.*?    <!-- TOOL_ICONS_END -->',lambda _:block,source,flags=re.S)
 else:
  position=source.index('  </svg>');source=source[:position]+block+'\n'+source[position:]
 def replace(match):
  tag=match.group();tool=re.search(r'data-tool="([^"]+)"',tag)
  if not tool:return tag
  shortcut=re.search(r'data-shortcut="([^"]+)"',tag);key=html.unescape(shortcut.group(1)) if shortcut else tool.group(1)
  if key not in entries:raise ValueError('Missing icon: '+key)
  tag=re.sub(r' data-icon-tone="[^"]+"','',tag)
  tag=tag.replace(' data-tool=',f' data-icon-tone="{entries[key]["tone"]}" data-tool=',1)
  svg=f'<svg aria-hidden="true" viewBox="0 0 24 24"><use href="#{ids[key]}"/></svg>'
  if 'tool-card-icon' in tag:tag=re.sub(r'(<span class="tool-card-icon[^>]*>).*?(</span>)',lambda m:m.group(1)+svg+m.group(2),tag,count=1,flags=re.S)
  else:tag=re.sub(r'<svg\b.*?</svg>',lambda _:svg,tag,count=1,flags=re.S)
  return tag
 source=re.sub(r'<button\b(?=[^>]*class="(?:tool-card\b|tool"))[^>]*>.*?</button>',replace,source,flags=re.S)
 return source
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args();result=generate();p=ROOT/'index.html'
 if args.check:
  if p.read_text()!=result:raise SystemExit('Tool icons are stale; run python scripts/sync-tool-icons.py')
 else:p.write_text(result)
 print('Tool icons: inline SVG references verified')
