"""Isolated local preview; original app/engines stay unchanged."""
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
import argparse,webbrowser

class PreviewHandler(SimpleHTTPRequestHandler):
 extensions_map={**SimpleHTTPRequestHandler.extensions_map,
  '.mjs':'text/javascript','.wasm':'application/wasm',
  '.webmanifest':'application/manifest+json'}
 def end_headers(self):
  # All prepared engines use local files. Block production APIs/diagnostics.
  self.send_header('Content-Security-Policy',"connect-src 'self' blob: data:")
  self.send_header('Cache-Control','no-cache')
  self.send_header('Referrer-Policy','no-referrer')
  super().end_headers()
 def log_message(self,*args):pass

def create_server(root,port=0):
 return ThreadingHTTPServer(('127.0.0.1',port),partial(PreviewHandler,directory=str(root)))

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--no-browser',action='store_true');parser.add_argument('--port',type=int,default=0);args=parser.parse_args()
 server=create_server(Path(__file__).resolve().parent,args.port)
 url=f'http://127.0.0.1:{server.server_port}/PREVIA_INICIO.html'
 print('Prévia local: '+url,flush=True)
 if not args.no_browser:webbrowser.open(url)
 try:server.serve_forever()
 except KeyboardInterrupt:pass
 finally:server.server_close()
