# Cartografia Styles

Responsavel pelo CSS modular da Cartografia. `cartografia.css` e apenas indice
de imports; estilo novo entra no arquivo da regiao correta.

Arquivos ativos:

- `00-work.css`: variaveis e shell local.
- `01-viewport-world.css`: viewport, world e transform.
- `02-trails.css`: SVG trails e movimento.
- `03-regions.css`: lanes e regioes.
- `04-atoms.css`: atoms e estados de node.
- `05-scenes.css`: cenas semanticas.
- `06-floaters.css`: indice dos floaters.
- `06-floaters-core.css`: breadcrumb, minimap e floaters base.
- `07-floaters-controls.css`: busca, lentes e zoom.
- `08-inspector.css`: inspector e leitura canonica.
- `09-overlay-responsive.css`: overlay e responsividade.

CSS da Cartografia deve ficar sempre escopado por `.cartografia-surface` e nao
pode afetar a surface Code.

Limite canonico: 500 linhas por arquivo CSS. Se passar disso, dividir por
subregiao antes de adicionar feature.
