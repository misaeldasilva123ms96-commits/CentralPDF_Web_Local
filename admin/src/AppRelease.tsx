import { release } from "./catalog";
export function AppRelease({ detailed = false }: { detailed?: boolean }) {
  return <section className="panel app-release" aria-label="Versão do CentralPDF">
    <div className="panel-head"><h2>CentralPDF · versão e compatibilidade</h2><span className="pill neutral">Referência desta entrega</span></div>
    <dl className="release-versions">
      <div><dt>Aplicativo</dt><dd>{release.applicationVersion}</dd></div>
      <div><dt>Painel administrativo</dt><dd>{release.adminVersion}</dd></div>
      <div><dt>Catálogo</dt><dd>{release.shortcutCount} atalhos</dd></div>
      <div><dt>Pacote Office</dt><dd>WASM {release.officeEngineVersion}</dd></div>
    </dl>
    <p>Catálogo com atalhos individuais para Word, Excel e PowerPoint, giro de imagens antes de criar o PDF e interface adaptada ao computador e ao celular.</p>
    {detailed && <>
      <dl className="release-engines">
        <div><dt>PDF.js do site e pacote local</dt><dd>{release.sitePdfJsVersion}</dd></div>
        <div><dt>PDF.js da interface React</dt><dd>{release.reactPdfJsVersion}</dd></div>
        <div><dt>Famílias de indicadores</dt><dd>{release.tools.length} identificadores preservados</dd></div>
      </dl>
      <ul className="release-details"><li>Giro de 90° para os dois lados em cada miniatura de Imagens para PDF, preservado na exportação e nos projetos locais.</li><li>Ícones vetoriais locais nos 39 atalhos, com temas claro e escuro.</li><li>Configurações abaixo da área de trabalho no celular e tablet, com recolhimento e reabertura.</li><li>Office para PDF aceita ODS, ODT e ODP e renderiza o layout pelo LibreOffice no dispositivo; fontes ausentes podem ser substituídas.</li><li>Espaços e acentos mantidos nos nomes dos arquivos baixados.</li></ul>
    </>}
    <p className="hint">Revisão de referência: <code>{release.applicationRevision}</code>. Abas offline podem usar uma revisão anterior. Este painel não verifica a versão de cada navegador nem recebe documentos.</p>
    <a className="external-button" href="https://misaeldasilva123ms96-commits.github.io/CentralPDF_Web_Local/" target="_blank" rel="noopener noreferrer">Abrir CentralPDF ↗</a>
  </section>;
}
