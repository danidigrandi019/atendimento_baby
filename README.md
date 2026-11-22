# Atendimento Baby

**Organização visual de atendimentos no varejo de calçados.**

Aplicação web que reúne as fotos dos produtos escolhidos em atendimentos independentes. Desenvolvida para uso no celular, permite acompanhar vários clientes ao mesmo tempo, mantendo as escolhas de cada um identificadas e acessíveis.

A interface utiliza numeração automática, identificação por cores e navegação entre atendimentos, sem exigir o cadastro de dados pessoais dos clientes.

## Funcionalidades

- **Atendimentos independentes:** múltiplas fotos vinculadas a cada cliente, com contagem individual.
- **Captura e importação:** acesso à câmera do dispositivo e seleção de imagens da galeria.
- **Consulta visual:** miniaturas, ampliação e navegação pelas fotos de um atendimento.
- **Gestão de atendimentos:** finalização, histórico e reabertura para novas escolhas.
- **Persistência local:** armazenamento dos registros e das imagens no navegador.
- **Exclusão controlada:** confirmação antes de remover fotos ou atendimentos.

## Arquitetura

O projeto é uma aplicação estática, construída com recursos nativos da plataforma web. A interface, o processamento das imagens e a persistência são executados no navegador, sem dependência de um servidor de aplicação.

| Camada | Implementação |
| --- | --- |
| Interface | HTML5 e CSS responsivo |
| Lógica da aplicação | JavaScript com módulos ES |
| Persistência | IndexedDB |
| Processamento de imagens | Canvas API |
| Ambiente de desenvolvimento | Node.js |
| Hospedagem | Arquivos estáticos, com configuração para Vercel |

Clientes e fotos são armazenados em estruturas distintas, relacionadas pelo identificador do atendimento. As operações de gravação utilizam transações, e cada importação mantém o vínculo com o cliente selecionado no início da captura.

As imagens são redimensionadas para até **1600 px** no lado maior, com miniaturas de até **480 px**, reduzindo o espaço necessário para armazenamento e visualização.

## Dados e privacidade

O aplicativo não exige nomes, telefones ou outros dados de identificação dos clientes. As imagens e os atendimentos permanecem no navegador utilizado; não são enviados ao GitHub, à Vercel ou a um serviço de armazenamento remoto.

A persistência está vinculada ao aparelho, ao navegador e à origem do site. A limpeza dos dados do navegador pode remover os registros. O projeto não oferece sincronização entre dispositivos, backup remoto ou suporte completo à abertura offline.

Não há limite fixo de fotos por atendimento. A capacidade disponível depende da cota de armazenamento do navegador e do espaço no dispositivo.

## Estrutura

| Arquivo | Responsabilidade |
| --- | --- |
| [`dist/index.html`](dist/index.html) | Estrutura da interface |
| [`dist/app.js`](dist/app.js) | Atendimentos, captura, importação e visualização |
| [`dist/storage.js`](dist/storage.js) | Acesso ao IndexedDB e transações |
| [`dist/style.css`](dist/style.css) | Layout e adaptação a diferentes telas |
| [`dist/brand.css`](dist/brand.css) | Identidade visual |
| [`dist/icon.svg`](dist/icon.svg) | Ícone da aplicação |
| [`preview.mjs`](preview.mjs) | Servidor de desenvolvimento |
| [`build-standalone.mjs`](build-standalone.mjs) | Geração de uma versão em HTML único |
| [`vercel.json`](vercel.json) | Configuração de publicação |

## Desenvolvimento

**Requisitos:** Node.js e npm. O projeto não possui dependências externas.

| Comando | Finalidade |
| --- | --- |
| `npm start` | Inicia o servidor local em `http://127.0.0.1:4173` |
| `npm run check` | Verifica a sintaxe dos arquivos JavaScript |
| `npm run build:standalone` | Gera `vitrine.html` na raiz do projeto |

O HTML único é um artefato opcional, ignorado pelo Git. Os arquivos de produção permanecem em `dist/`.

## Publicação

A configuração da Vercel está versionada em [`vercel.json`](vercel.json). O projeto utiliza a raiz do repositório, o preset **Other** e a pasta **`dist`** como diretório de saída. O comando `npm run check` valida a sintaxe antes da publicação.

Não são necessárias variáveis de ambiente, instalação de dependências ou compilação dos arquivos da aplicação.

## Validação

A verificação automatizada disponível cobre a sintaxe JavaScript. A captura pela câmera e a persistência no Safari de um iPhone real ainda requerem validação em dispositivo.
