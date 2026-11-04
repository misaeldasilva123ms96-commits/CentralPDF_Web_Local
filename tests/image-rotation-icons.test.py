"""Real image rotation, export pixels, local project recovery, and SVG coverage."""
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from functools import partial
from threading import Thread
import os,json,subprocess,sys
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
subprocess.run([sys.executable,str(ROOT/'scripts/sync-tool-icons.py'),'--check'],check=True)
soup=BeautifulSoup((ROOT/'index.html').read_text(),'html.parser')
for entry in soup.select('.tool-card[data-tool],#workspaceToolNav .tool'):
 icon=entry.select_one('svg use');assert icon,entry.get('data-shortcut',entry.get('data-tool'))
 assert soup.find('symbol',id=icon['href'][1:]),icon
assert len({entry.select_one('use')['href'] for entry in soup.select('.tool-card')})==39
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT)));Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}'
RENDER='''async data=>{const pdf=await qaPdfJs.getDocument({data:new Uint8Array(data)}).promise;try{const out=[];for(let n=1;n<=pdf.numPages;n++){const p=await pdf.getPage(n),v=p.getViewport({scale:1}),c=document.createElement('canvas');c.width=v.width;c.height=v.height;const x=c.getContext('2d');await p.render({canvasContext:x,viewport:v}).promise;out.push({w:v.width,h:v.height,a:[...x.getImageData(10,10,1,1).data],b:[...x.getImageData(v.width-10,v.height-10,1,1).data]});}return out;}finally{await pdf.loadingTask.destroy();}}'''
with sync_playwright() as p:
 for name in ['chromium','firefox']:
  browser=getattr(p,name).launch()
  for width,height in [(1440,1000),(390,844)]:
   context=browser.new_context(viewport={'width':width,'height':height});context.route('https://**/*',lambda r:r.abort())
   page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto(base+'/index.html');page.wait_for_function('window.CentralPDFApp')
   page.add_script_tag(url=base+'/app/node_modules/pdf-lib/dist/pdf-lib.min.js')
   page.evaluate("async base=>{window.qaPdfJs=await import(base+'/app/node_modules/pdfjs-dist/build/pdf.mjs');qaPdfJs.GlobalWorkerOptions.workerSrc=base+'/app/node_modules/pdfjs-dist/build/pdf.worker.mjs';}",base)
   gallery=os.environ.get('CENTRALPDF_QA_SCREENSHOTS')
   if gallery and name=='chromium' and width==1440:
    Path(gallery).mkdir(parents=True,exist_ok=True)
    page.locator('#toolGrid').screenshot(path=str(Path(gallery)/'ferramentas-modernas-claro.png'))
    page.locator('#cp101SettingsButton').click()
    if page.locator('body').get_attribute('data-theme')!='dark':page.locator('#cp101ThemeToggle').click()
    page.keyboard.press('Escape')
    page.locator('#toolGrid').screenshot(path=str(Path(gallery)/'ferramentas-modernas-escuro.png'))
   page.locator('.tool-card[data-tool="imagesToPdf"]').click()
   page.evaluate('''async()=>{
    const make=async(w,h,name,vertical,first,second)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle=second;x.fillRect(0,0,w,h);x.fillStyle=first;x.fillRect(0,0,vertical?40:w,vertical?h:40);const blob=await new Promise(r=>c.toBlob(r,'image/png'));return new File([blob],name,{type:'image/png',lastModified:42});};
    window.qaImages=[await make(120,80,'Foto João.png',true,'#ff0000','#0000ff'),await make(80,120,'Foto Maria.png',false,'#00b400','#ffff00')];
    await CentralPDFApp.addFiles(qaImages);
   }''')
   page.wait_for_function('CentralPDFApp.getFiles().length===2')
   page.locator('.file-card').nth(0).locator('.image-rotate-right').click()
   page.locator('.file-card').nth(1).locator('.image-rotate-left').click()
   assert page.locator('.file-card output').all_text_contents()==['90°','270°'], (name,width,page.locator('.file-card output').all_text_contents())
   page.wait_for_function("document.querySelector('.file-card img')?.naturalWidth===80 && document.querySelector('.file-card img')?.naturalHeight===120")
   page.locator('.file-card').nth(0).locator('.move-down').click()
   assert page.locator('.file-card output').all_text_contents()==['270°','90°']
   await_restore=page.evaluate('''async()=>{const saved=await CentralPDFApp.exportProjectState();const files=new Map(saved.files.map(({id,file})=>[id,new File([file],file.name,{type:file.type,lastModified:file.lastModified})]));await CentralPDFApp.importProjectState(JSON.parse(JSON.stringify(saved.snapshot)),files);return saved.snapshot.imageRotations.map(i=>i.angle);}''')
   assert await_restore==[270,90]
   assert page.locator('.file-card output').all_text_contents()==['270°','90°']
   page.locator('#imageMargin').fill('0');page.locator('#outputFileName').fill('Imagens com rotação')
   directory=os.environ.get('CENTRALPDF_QA_SCREENSHOTS')
   if directory:
    Path(directory).mkdir(parents=True,exist_ok=True)
    page.screenshot(path=str(Path(directory)/f'image-rotation-{name}-{width}.png'),full_page=True)
   with page.expect_download() as download:page.locator('#processButton').click()
   assert download.value.suggested_filename=='Imagens com rotação.pdf'
   data=list(Path(download.value.path()).read_bytes())
   rendered=page.evaluate(RENDER,data)
   assert [(round(v['w']),round(v['h'])) for v in rendered]==[(120,80),(80,120)],rendered
   for actual,expected in [(rendered[0]['a'],[0,180,0]),(rendered[0]['b'],[255,255,0]),(rendered[1]['a'],[255,0,0]),(rendered[1]['b'],[0,0,255])]:assert all(abs(a-b)<5 for a,b in zip(actual,expected)),rendered
   page.locator('#continueEditingButton').click();page.locator('#imageOutputMode').select_option('separate')
   with page.expect_download() as download:page.locator('#processButton').click()
   import zipfile,io
   with zipfile.ZipFile(io.BytesIO(Path(download.value.path()).read_bytes())) as z:assert set(z.namelist())=={'Foto João.pdf','Foto Maria.pdf'}
   page.locator('#continueEditingButton').click()
   page.locator('.file-card').nth(1).locator('.file-card-remove').click()
   page.evaluate('CentralPDFApp.addFiles([qaImages[0]])');page.wait_for_function('CentralPDFApp.getFiles().length===2')
   assert page.locator('.file-card output').all_text_contents()==['270°','0°']
   page.locator('.file-card').nth(1).locator('.image-rotate-right').click()
   page.locator('.file-card').nth(1).locator('.image-rotate-right').click()
   assert page.locator('.file-card output').all_text_contents()==['270°','180°']
   page.locator('#imageOutputMode').select_option('combined')
   with page.expect_download() as download:page.locator('#processButton').click()
   halfturn=page.evaluate(RENDER,list(Path(download.value.path()).read_bytes()))[1]
   assert (round(halfturn['w']),round(halfturn['h']))==(120,80),halfturn
   assert halfturn['a'][2]>245 and halfturn['b'][0]>245,halfturn
   page.locator('#continueEditingButton').click()
   page.locator('.file-card').nth(1).locator('.image-rotate-right').click()
   page.locator('.file-card').nth(1).locator('.image-rotate-right').click()
   assert page.locator('.file-card output').all_text_contents()==['270°','0°']
   if width==1440:
    for orientation in [6,2]:
     page.evaluate('''async orientation=>{
      CentralPDFApp.selectTool('imagesToPdf');const c=document.createElement('canvas');c.width=120;c.height=80;const x=c.getContext('2d');x.fillStyle='#0000ff';x.fillRect(0,0,120,80);x.fillStyle='#ff0000';x.fillRect(0,0,40,80);
      const jpeg=new Uint8Array(await (await new Promise(r=>c.toBlob(r,'image/jpeg',1))).arrayBuffer());
      const exif=new Uint8Array([255,225,0,34,69,120,105,102,0,0,73,73,42,0,8,0,0,0,1,0,18,1,3,0,1,0,0,0,orientation,0,0,0,0,0,0,0]);
      await CentralPDFApp.addFiles([new File([jpeg.slice(0,2),exif,jpeg.slice(2)],'Foto celular.jpg',{type:'image/jpeg'})]);
     }''',orientation)
     page.wait_for_function('CentralPDFApp.getFiles().length===1');page.locator('#imageMargin').fill('0')
     with page.expect_download() as download:page.locator('#processButton').click()
     result=page.evaluate(RENDER,list(Path(download.value.path()).read_bytes()))[0]
     assert (round(result['w']),round(result['h']))==((80,120) if orientation==6 else (120,80)),result
     expected=([255,0,0],[0,0,255]) if orientation==6 else ([0,0,255],[255,0,0])
     for actual,wanted in zip([result['a'],result['b']],expected):assert all(abs(a-b)<6 for a,b in zip(actual,wanted)),result
     page.locator('#continueEditingButton').click()
     if orientation==6:
      page.locator('.image-rotate-left').click()
      with page.expect_download() as download:page.locator('#processButton').click()
      result=page.evaluate(RENDER,list(Path(download.value.path()).read_bytes()))[0]
      assert (round(result['w']),round(result['h']))==(120,80),result
      assert result['a'][0]>245 and result['b'][2]>245,result
      page.locator('#continueEditingButton').click()
   assert not errors,errors
   context.close()
  browser.close()
server.shutdown()
print('image-rotation-icons: passed Chromium/Firefox desktop/mobile, PDF pixels, project restore, separate output, reset and 39 SVG icons')
