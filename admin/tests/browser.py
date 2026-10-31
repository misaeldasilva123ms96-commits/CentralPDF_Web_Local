"""Browser/provider contract tests. No real account, email, or external service calls."""
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
from threading import Thread
from tempfile import TemporaryDirectory
from os import environ
import base64,json,time
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
TMP=TemporaryDirectory(prefix='centralpdf-admin-ui-')
OUT=Path(environ.get('CENTRALPDF_ADMIN_QA') or TMP.name);OUT.mkdir(parents=True,exist_ok=True)
PROJECT='https://alszupfnwerwtkyczzkw.supabase.co'
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  if self.path=='/favicon.ico':self.send_response(204);self.end_headers();return
  if not self.path.startswith('/assets/') and not self.path.startswith('/api/'):self.path='/index.html'
  super().do_GET()
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT/'dist')))
Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}'
def jwt(aal):
 encode=lambda value:base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')
 return encode({'alg':'HS256','typ':'JWT'})+'.'+encode({'sub':'80000000-0000-4000-8000-000000000001','aal':aal,'role':'authenticated','exp':int(time.time())+3600,'iat':int(time.time()),'session_id':'90000000-0000-4000-8000-000000000001','iss':PROJECT+'/auth/v1'})+'.fixture'
def session(aal):return {'access_token':jwt(aal),'token_type':'bearer','expires_in':3600,'expires_at':int(time.time())+3600,'refresh_token':'browser-fixture-not-a-real-refresh-token','user':{'id':'80000000-0000-4000-8000-000000000001','aud':'authenticated','role':'authenticated','email':'admin@example.invalid','app_metadata':{'provider':'email'},'user_metadata':{},'created_at':'2026-10-30T12:00:00Z','factors':[{'id':'70000000-0000-4000-8000-000000000001','factor_type':'totp','status':'verified','friendly_name':'Test authenticator'}]}}
def request_aal(req):
 payload=req.headers['authorization'].split('.')[1]
 return json.loads(base64.urlsafe_b64decode(payload+'='*(-len(payload)%4)))['aal']
try:
 with sync_playwright() as p:
  for engine in ['chromium','firefox']:
   browser=getattr(p,engine).launch()
   for width,height in [(1440,1000),(390,844)]:
    context=browser.new_context(viewport={'width':width,'height':height},reduced_motion='reduce',accept_downloads=True)
    page=context.new_page();errors=[];outbound=[];state={'mfa':False,'notices':[],'history':[],'password':None,'recovery':0,'logout':0,'metrics':[],'enrolled':False}
    page.on('pageerror',lambda e:errors.append(str(e)))
    def intercept(route):
     req=route.request;url=req.url
     def respond(value,status=200):route.fulfill(status=status,content_type='application/json',body=json.dumps(value),headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info,x-supabase-api-version'})
     if url.startswith(origin+'/api/'):
      path=url.split('/api/',1)[1].split('?')[0]
      if path=='config':respond({'environment':'staging','authConfigured':True,'adminReady':True,'supabaseUrl':PROJECT,'publishableKey':'sb_publishable_browser_fixture'});return
      if not req.headers.get('authorization'):respond({'error':'authentication_required'},401);return
      if path=='session':respond({'administrator':True,'mfaRequired':request_aal(req)!='aal2'});return
      if path=='overview':respond({'metrics':state['metrics'],'activeSessions':None,'collectionEnabled':False});return
      if path=='history':respond(state['history']);return
      if path=='diagnostics':respond({'connected':False,'url':'https://omni-nt.sentry.io/issues/'});return
      if path=='notices':
       if req.method=='POST':
        n=req.post_data_json;old=next((x for x in state['notices'] if x['id']==n['id']),None)
        if old and old['revision']!=n['revision']:respond({'error':'revision_conflict'},409);return
        snapshot=old.get('published_value') if old else None
        n['id']=n['id'] or '60000000-0000-4000-8000-000000000001';n['revision']=(old['revision'] if old else 0)+1;n['updated_at']='2026-10-30T12:00:00Z'
        n['published_value']=dict(n) if n['state']=='published' else None if n['state']=='withdrawn' else snapshot
        state['notices']=[n]+[x for x in state['notices'] if x['id']!=n['id']];state['history'].append({'id':len(state['history'])+1,'action':'notice_'+n['state'],'object_id':n['id'],'revision':n['revision'],'changed_at':n['updated_at']});respond(n);return
       query=parse_qs(urlparse(url).query);index=int(query.get('page',['0'])[0]);rows=state['notices'][index*50:(index+1)*50]
       respond({'notices':rows,'page':index,'hasMore':len(state['notices'])>(index+1)*50});return
      respond({'error':'not_found'},404);return
     if url.startswith(PROJECT+'/auth/v1/'):
      path=url.split('/auth/v1/',1)[1].split('?')[0]
      if req.method=='OPTIONS':route.fulfill(status=204,headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET,POST,PUT','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info,x-supabase-api-version'});return
      if path=='token':
       state['mfa']=False;respond(session('aal1'));return
      if path=='user':
       if req.method=='PUT':
        if state['enrolled'] and request_aal(req)!='aal2':
         respond({'code':'insufficient_aal','message':'AAL2 required to update password when MFA is enabled'},401);return
        state['password']=req.post_data_json
       user=session('aal2' if state['mfa'] else 'aal1')['user']
       if not state['enrolled']:user['factors']=[]
       respond(user);return
      if path=='factors' and req.method=='POST':
       state['enrolled']=True
       respond({'id':'70000000-0000-4000-8000-000000000001','type':'totp','totp':{'qr_code':'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="black"/></svg>','secret':'fixture-not-real','uri':'otpauth://totp/fixture'}});return
      if path=='recover':state['recovery']+=1;respond({});return
      if path.endswith('/challenge'):respond({'id':'50000000-0000-4000-8000-000000000001','type':'totp','expires_at':int(time.time())+300});return
      if path.endswith('/verify'):state['mfa']=True;respond(session('aal2'));return
      if path=='logout':state['logout']+=1;route.fulfill(status=204,headers={'Access-Control-Allow-Origin':origin});return
      respond({'message':'Unexpected provider call in contract test'},400);return
     if url.startswith(origin+'/'):route.continue_();return
     outbound.append(url);route.abort()
    context.route('**/*',intercept)
    page.goto(origin);page.get_by_role('heading',name='Acesso do administrador').wait_for()
    page.get_by_role('button',name='Esqueci minha senha').click();page.locator('#email').fill('admin@example.invalid');page.get_by_role('button',name='Enviar instruções').click()
    try:page.get_by_text('Se houver uma conta habilitada',exact=False).wait_for(timeout=5000)
    except Exception:
     print('FAILURE',engine,width,state['recovery'],page.locator('body').inner_text(),errors,flush=True);page.screenshot(path=str(OUT/'failure.png'));raise
    assert state['recovery']==1
    page.get_by_role('button',name='Voltar ao acesso').click();page.locator('#email').fill('admin@example.invalid');page.locator('#password').fill('BrowserFixturePassword!2026');page.get_by_role('button',name='Entrar',exact=True).click()
    page.get_by_role('heading',name='Verificação em duas etapas').wait_for();page.get_by_role('button',name='Configurar ou confirmar segundo fator').click();page.get_by_role('img',name='QR code para cadastrar o CentralPDF no autenticador').wait_for();page.wait_for_function('document.querySelector(".mfa-qr img")?.naturalWidth>0');page.locator('#code').fill('654321');page.get_by_role('button',name='Confirmar código').click()
    page.get_by_role('heading',name='Visão geral',exact=True).wait_for();page.get_by_text('Sem dados de utilização neste período.',exact=False).wait_for();assert page.get_by_role('button',name='Exportar resumo').is_disabled()
    # SDK events cross tabs, but sessions deliberately live in sessionStorage.
    # Signing out another tab must not hide this tab's still-valid session.
    other=context.new_page();other.on('pageerror',lambda e:errors.append(str(e)))
    other.goto(origin);other.locator('#email').fill('admin@example.invalid');other.locator('#password').fill('BrowserFixturePassword!2026');other.get_by_role('button',name='Entrar',exact=True).click()
    other.get_by_role('heading',name='Verificação em duas etapas').wait_for();other.get_by_role('button',name='Configurar ou confirmar segundo fator').click();other.locator('#code').fill('654321');other.get_by_role('button',name='Confirmar código').click()
    other.get_by_role('heading',name='Visão geral',exact=True).wait_for()
    if width<800:other.get_by_role('button',name='Abrir menu').click()
    other.get_by_role('button',name='Sair da conta').click();other.get_by_role('heading',name='Acesso do administrador').wait_for()
    page.get_by_role('heading',name='Visão geral',exact=True).wait_for(timeout=5000)
    other.get_by_role('button',name='Esqueci minha senha').click();other.locator('#email').fill('admin@example.invalid');other.get_by_role('button',name='Enviar instruções').click();other.get_by_text('Se houver uma conta habilitada',exact=False).wait_for()
    other.goto(origin+'/auth/callback?code=fixture-recovery-code')
    other.get_by_role('heading',name='Verificação em duas etapas').wait_for()
    page.get_by_role('heading',name='Visão geral',exact=True).wait_for(timeout=5000)
    other.close();state['logout']=0
    def nav(key,label):
     if width<800:page.get_by_role('button',name='Abrir menu').click()
     page.locator(f'nav a[href="#{key}"]').click();page.get_by_role('heading',name=label,exact=True).wait_for()
     assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    page.screenshot(path=str(OUT/f'overview-{engine}-{width}.png'),full_page=True)
    state['metrics']=[{'day':'2026-10-30','tool':'merge','completed':5,'failed':1}]
    nav('tools','Ferramentas');page.get_by_role('combobox',name='Período').select_option('today')
    page.get_by_role('cell',name='Juntar PDFs',exact=True).wait_for()
    with page.expect_download() as download:page.get_by_role('button',name='Exportar resumo').click()
    assert download.value.suggested_filename=='CentralPDF — resumo de utilização.csv'
    assert '"Juntar PDFs";5;1' in Path(download.value.path()).read_text('utf-8-sig')
    nav('account','Conta e segurança')
    for dark in [False,True]:
     switch=page.get_by_role('switch',name='Tema escuro')
     if switch.get_attribute('aria-checked')!=str(dark).lower():switch.click()
     page.screenshot(path=str(OUT/f'account-{engine}-{width}-{"dark" if dark else "light"}.png'),full_page=True)
    page.get_by_role('button',name='Alterar senha',exact=True).click();page.locator('#current-password').fill('BrowserFixturePassword!2026');page.locator('#new-password').fill('UpdatedBrowserFixture!2026');page.locator('#confirm-password').fill('UpdatedBrowserFixture!2026');page.get_by_role('button',name='Salvar nova senha').click()
    page.get_by_text('Senha alterada. As outras sessões foram encerradas.',exact=False).wait_for();assert state['password']['current_password']=='BrowserFixturePassword!2026';assert state['logout']==1
    nav('announcements','Avisos');page.locator('#notice-title').fill('Orientação da homologação');page.locator('#notice-message').fill('Mensagem de teste sem documentos.');page.get_by_role('button',name='Salvar rascunho').click();page.get_by_text('Rascunho salvo. Ele permanece privado.',exact=False).wait_for()
    page.get_by_role('button',name='Publicar aviso',exact=True).click();page.get_by_role('button',name='Confirmar publicação').click();page.get_by_text('Aviso publicado somente no ambiente',exact=False).wait_for()
    page.locator('#notice-title').fill('Rascunho ainda privado');page.get_by_role('button',name='Salvar rascunho').click();page.get_by_text('Rascunho salvo. Ele permanece privado.',exact=False).wait_for();assert state['notices'][0]['published_value']['title']=='Orientação da homologação'
    nav('history','Histórico');assert page.locator('tbody tr').count()==3
    # An older publication must stay manageable beyond the first fifty rows.
    recent=state['notices'][0]
    state['notices']=[{**recent,'id':f'61000000-0000-4000-8000-{i:012d}','title':f'Rascunho recente {i}','state':'draft','published_value':None} for i in range(50)]
    oldest={**recent,'id':'62000000-0000-4000-8000-000000000001','title':'Aviso publicado mais antigo','state':'published','revision':1}
    oldest['published_value']={'title':oldest['title'],'message':oldest['message'],'level':'info','revision':1}
    state['notices'].append(oldest)
    nav('announcements','Avisos')
    assert page.get_by_role('button',name='Página anterior',exact=True).is_disabled()
    page.get_by_role('button',name='Próxima página',exact=True).click()
    page.get_by_role('cell',name=oldest['title'],exact=True).wait_for()
    assert page.get_by_role('button',name='Próxima página',exact=True).is_disabled()
    page.get_by_role('button',name='Editar',exact=True).click()
    page.screenshot(path=str(OUT/f'older-notice-{engine}-{width}.png'),full_page=True)
    page.get_by_role('button',name='Retirar aviso',exact=True).click()
    page.get_by_text('Aviso retirado da homologação.',exact=False).wait_for()
    assert state['notices'][0]['id']==oldest['id'] and state['notices'][0]['state']=='withdrawn'
    page.get_by_text('Página 1',exact=True).wait_for()
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    nav('diagnostics','Diagnósticos');page.get_by_text('Leitura não conectada',exact=True).wait_for()
    if width<800:page.get_by_role('button',name='Abrir menu').click()
    page.get_by_role('button',name='Sair da conta').click();page.get_by_role('heading',name='Acesso do administrador').wait_for()
    # Provider invitations do not initiate browser PKCE: test the fixed invite callback.
    state['enrolled']=False  # A newly invited identity has no verified factor yet.
    invite=origin+('/auth/invite' if width==1440 else '/')+'#access_token='+jwt('aal1')+'&refresh_token=fixture-refresh-token&expires_in=3600&token_type=bearer&type=invite'
    page.goto("about:blank")  # Email verification returns through a fresh document.
    page.goto(invite)
    try:page.get_by_role('heading',name='Definir nova senha').wait_for(timeout=10000)
    except Exception:
     print('INVITE FAILURE',engine,width,page.locator('body').inner_text(),errors,flush=True);raise
    assert 'access_token' not in page.url
    page.locator('#password').fill('InvitationFixturePassword!2026');page.locator('#confirm').fill('InvitationFixturePassword!2026')
    with page.expect_navigation():page.get_by_role('button',name='Salvar nova senha').click()
    page.get_by_role('heading',name='Acesso do administrador').wait_for()
    page.get_by_text('Senha atualizada. Entre novamente para continuar.',exact=True).wait_for()
    # Recovery begins in this browser and exchanges the stored PKCE verifier.
    state['enrolled']=True  # Existing administrators must confirm their existing TOTP.
    page.get_by_role('button',name='Esqueci minha senha').click();page.locator('#email').fill('admin@example.invalid');page.get_by_role('button',name='Enviar instruções').click();page.get_by_text('Se houver uma conta habilitada',exact=False).wait_for()
    state['password']=None
    page.goto(origin+'/auth/callback?code=fixture-recovery-code')
    page.get_by_role('heading',name='Verificação em duas etapas').wait_for(timeout=5000)
    assert not page.locator('#password').count()
    assert state['password'] is None
    page.get_by_role('button',name='Configurar ou confirmar segundo fator').click()
    assert not page.get_by_role('img',name='QR code para cadastrar o CentralPDF no autenticador').count()
    page.locator('#code').fill('654321');page.get_by_role('button',name='Confirmar código').click()
    page.get_by_role('heading',name='Definir nova senha').wait_for()
    assert 'code=' not in page.url
    page.locator('#password').fill('RecoveryFixturePassword!2026');page.locator('#confirm').fill('RecoveryFixturePassword!2026')
    with page.expect_navigation():page.get_by_role('button',name='Salvar nova senha').click()
    page.get_by_role('heading',name='Acesso do administrador').wait_for()
    page.get_by_text('Senha atualizada. Entre novamente para continuar.',exact=True).wait_for()
    page.goto(origin+'/auth/callback?code=used-or-expired-code')
    page.get_by_role('heading',name='Acesso não confirmado').wait_for()
    page.get_by_role('button',name='Voltar ao acesso').click();page.get_by_role('heading',name='Acesso do administrador').wait_for()
    assert not outbound,outbound;assert not errors,errors
    context.close()
   browser.close()
   print(f'PASS: {engine} desktop/mobile, including independent tab sign-out and recovery MFA',flush=True)
 print('PASS: Chromium/Firefox desktop/mobile, login→MFA gate, recovery, current-password change, session revocation, private drafts/publish, history, empty metrics, themes, no external requests')
finally:
 server.shutdown();TMP.cleanup()
