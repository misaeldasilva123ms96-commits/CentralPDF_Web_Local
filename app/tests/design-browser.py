"""Local built React app, responsive themes and a real synthetic merge/download."""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
import os,json,hashlib
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2];OUT=Path(os.environ.get('CENTRALPDF_REACT_QA','/tmp/centralpdf-react-design'));OUT.mkdir(parents=True,exist_ok=True)
class H(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
s=ThreadingHTTPServer(('127.0.0.1',0),partial(H,directory=str(ROOT/'app/dist')));Thread(target=s.serve_forever,daemon=True).start();rows=[]
try:
 with sync_playwright() as p:
  browser=p.chromium.launch()
  for width in [320,390,768,1440]:
   c=browser.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce');c.route('https://**/*',lambda r:r.abort());page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(f'http://127.0.0.1:{s.server_port}/')
   page.wait_for_function('document.querySelector(".app-brand-mark img")?.naturalWidth>0')
   contrasts={}
   for theme in ['light','dark']:
    toggle=page.get_by_role('switch',name='Tema escuro')
    if toggle.get_attribute('aria-checked')!=str(theme=='dark').lower():toggle.click()
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(width,theme)
    assert 'linear-gradient' in page.locator('h1').evaluate('e=>getComputedStyle(e).backgroundImage')
    contrast=page.locator('.cp-home__privacy').evaluate(r'''el=>{
     const lum=value=>{const c=value.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
     const ratio=(a,b)=>(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
     const text=getComputedStyle(el.querySelector('p')),icon=getComputedStyle(el.querySelector(':scope>span'));
     return {text:ratio(lum(text.color),lum(getComputedStyle(el).backgroundColor)),icon:ratio(lum(icon.color),lum(icon.backgroundColor))};
    }''')
    contrasts[theme]=contrast
    assert contrast['text']>=4.5 and contrast['icon']>=3,(width,theme,contrast)
    if width in [390,1440]:page.screenshot(path=str(OUT/f'react-home-{width}-{theme}.png'))
   page.get_by_role('button',name='OCR e PDF pesquisável',exact=True).click()
   assert 'linear-gradient' in page.locator('h1').evaluate('el=>getComputedStyle(el).backgroundImage')
   page.get_by_role('button',name='Voltar às ferramentas',exact=False).click()
   page.get_by_role('button',name='Juntar PDFs',exact=True).click()
   page.add_script_tag(path=str(ROOT/'app/node_modules/pdf-lib/dist/pdf-lib.min.js'))
   fixtures=page.evaluate("""async()=>{const result=[];for(const [name,count,base] of [['A.pdf',2,200],['B.pdf',3,300]]){const d=await PDFLib.PDFDocument.create();for(let i=1;i<=count;i++)d.addPage([base+i,400]).drawText(name+i);result.push({name,bytes:[...await d.save()]});}return result;}""")
   page.locator('input[type=file]').first.set_input_files([{'name':f['name'],'mimeType':'application/pdf','buffer':bytes(f['bytes'])} for f in fixtures])
   page.locator('.cp-tool-sidebar button').filter(has_text='Juntar PDFs').click()
   page.get_by_role('link',name='Baixar',exact=False).wait_for()
   assert 'linear-gradient' in page.get_by_role('link',name='Baixar',exact=False).evaluate('el=>getComputedStyle(el).backgroundImage')
   with page.expect_download() as e:page.get_by_role('link',name='Baixar',exact=False).click()
   data=Path(e.value.path()).read_bytes();sizes=page.evaluate('async b=>(await PDFLib.PDFDocument.load(new Uint8Array(b))).getPages().map(p=>p.getWidth())',list(data))
   assert sizes==[201,202,301,302,303],sizes
   assert not errors,errors
   if width in [390,1440]:page.screenshot(path=str(OUT/f'react-result-{width}-dark.png'),full_page=True)
   rows.append({'width':width,'contrast':contrasts,'themes':2,'pages':5,'widths':sizes,'sha256':hashlib.sha256(data).hexdigest()})
   c.close()
  browser.close()
finally:s.shutdown()
(OUT/'react-browser.json').write_text(json.dumps(rows,indent=2))
print('React design browser: four widths, both themes, real merge and downloaded PDF passed')
