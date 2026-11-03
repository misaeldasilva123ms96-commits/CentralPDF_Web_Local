import { release } from "./catalog";
export function AppRelease({ detailed = false }: { detailed?: boolean }) {
  return <section className="panel app-release" aria-label="Versão do CentralPDF">
    <div className="panel-head"><h2>CentralPDF · atualização Office</h2><span className="pill neutral">Processamento local</span></div>
    <dl className="release-versions">
      <div><dt>Aplicativo</dt><dd>{release.applicationVersion}</dd></div>
      <div><dt>Painel administrativo</dt><dd>{release.adminVersion}</dd></div>
      <div><dt>Catálogo</dt><dd>{release.tools.length} ferramentas</dd></div>
      <div><dt>Pacote Office</dt><dd>WASM {release.officeEngineVersion}</dd></div>
    </dl>
    <p>Word, Excel e PowerPoint nos dois sentidos, com atalhos separados em Converter PDF. Office para PDF aceita ODS, ODT e ODP e renderiza o layout pelo LibreOffice no dispositivo.</p>
    {detailed && <>
      <ul className="release-details"><li>Carregamento automático do motor ao converter, sem instalação.</li><li>Cabeçalhos, imagens, tabelas e configuração de impressão renderizados pelo LibreOffice.</li><li>Word visual preserva páginas como imagens; os modos editáveis têm extração simplificada.</li><li>Fontes indisponíveis no motor podem ser substituídas.</li><li>Espaços e acentos mantidos nos nomes dos arquivos baixados.</li></ul>
      <p className="hint">Revisão de referência: <code>{release.applicationRevision}</code>. Abas offline podem usar uma revisão anterior. Este painel não verifica a versão de cada navegador nem recebe documentos.</p>
    </>}
    <a className="external-button" href="https://misaeldasilva123ms96-commits.github.io/CentralPDF_Web_Local/" target="_blank" rel="noopener noreferrer">Abrir CentralPDF ↗</a>
  </section>;
}
