from playwright.sync_api import sync_playwright
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
html = (root / 'index.html').read_text(encoding='utf-8')
css = '\n'.join((root / name).read_text(encoding='utf-8') for name in ['assets/css/styles.css','assets/css/ux-redesign.css','assets/css/layout-controls.css'])
html = re.sub(r'\s*<link rel="stylesheet" href="[^"]+"\s*/?>', '', html)
html = html.replace('</head>', f'<style>{css}</style></head>')
html = re.sub(r'\s*<script src="[^"]+"></script>', '', html)

mock = r'''
<script>
(() => {
  function makePage(){ let angle=0; return { getSize:()=>({width:595,height:842}), getRotation:()=>({angle}), setRotation:r=>{angle=Number(r)||0;} }; }
  function inputDoc(){
    const pages = Array.from({length:50}, makePage);
    return {
      getPageCount:()=>pages.length,
      getPageIndices:()=>pages.map((_,i)=>i),
      getPage:i=>pages[i],
      getTitle:()=>'', getAuthor:()=>'', getSubject:()=>'', getKeywords:()=>[], getCreator:()=>'', getProducer:()=>''
    };
  }
  function outputDoc(){
    const pages=[];
    return {
      copyPages: async (src,indexes)=>indexes.map(()=>makePage()),
      addPage: pageOrSize => { const p=Array.isArray(pageOrSize)?makePage():pageOrSize; pages.push(p); return p; },
      getPageCount:()=>pages.length,
      save: async()=>new Uint8Array([37,80,68,70]),
      setTitle(){},setAuthor(){},setSubject(){},setKeywords(){},setCreator(){},setProducer(){},
      embedPng:async()=>({width:100,height:100}), embedJpg:async()=>({width:100,height:100})
    };
  }
  window.PDFLib = {
    PDFDocument: { load: async()=>inputDoc(), create: async()=>outputDoc() },
    degrees:v=>v, StandardFonts:{HelveticaBold:'HelveticaBold'}, rgb:()=>({})
  };
  window.fetch = async()=>({ok:true,text:async()=>''});
})();
</script>
'''
scripts='\n'.join((root/name).read_text(encoding='utf-8') for name in ['assets/js/split-planner.js','assets/js/advanced-planner.js','assets/js/organizer-planner.js','assets/js/pdf-editor.js','assets/js/ux-enhancements.js','assets/js/app.js','assets/js/layout-controls.js'])
html=html.replace('</body>',mock+f'<script>{scripts}</script></body>')

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
    page=browser.new_page(viewport={'width':1440,'height':900})
    errors=[]
    page.on('pageerror',lambda exc: errors.append(str(exc)))
    page.set_content(html,wait_until='domcontentloaded')
    page.locator('.tool-card[data-tool="merge"]').click()
    page.evaluate(r'''() => {
      const dt=new DataTransfer();
      for(let i=1;i<=12;i++) dt.items.add(new File([new Uint8Array([37,80,68,70])],`Lote_${i}.pdf`,{type:'application/pdf',lastModified:1000+i}));
      const target=document.querySelector('#dropzone');
      target.dispatchEvent(new DragEvent('dragenter',{dataTransfer:dt,bubbles:true,cancelable:true}));
      target.dispatchEvent(new DragEvent('dragover',{dataTransfer:dt,bubbles:true,cancelable:true}));
      target.dispatchEvent(new DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true}));
    }''')
    page.wait_for_function("document.querySelectorAll('#pageGrid .page-card').length === 600",timeout=30000)
    assert page.locator('#mergeLargeBatchNotice').is_visible()
    assert '600' in page.locator('#mergePlanCount').inner_text()
    page.locator('#processButton').click()
    page.wait_for_function("document.querySelector('#statusBox').classList.contains('success') && document.querySelector('#statusBox').textContent.includes('600 página')",timeout=60000)
    status=page.locator('#statusBox').inner_text()
    assert '600 página' in status, status
    assert 'origem da página' not in status.lower(), status
    assert not errors, errors
    print('large-merge: 600 pages passed')
    browser.close()
