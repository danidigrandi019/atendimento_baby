# Atendimento Baby · Vitrine

Aplicação web para organizar as fotos dos sapatos escolhidos por vários clientes ao mesmo tempo. Pensada para uso pelo celular, com clientes numerados automaticamente e sem formulários de cadastro.

Cada atendimento tem suas próprias fotos: o Cliente 1 pode ter cinco escolhas e o Cliente 2 pode ter dez, sem misturar os pedidos.

## Funcionalidades

- Criar clientes com número e cor de identificação.
- Fotografar pelo celular ou adicionar várias imagens da galeria.
- Alternar entre clientes e conferir a quantidade de fotos de cada um.
- Ampliar as fotos e navegar pelas escolhas do cliente.
- Finalizar, consultar e reabrir atendimentos.
- Excluir fotos ou atendimentos com confirmação.
- Salvar os dados no navegador usando IndexedDB.

Não há um limite fixo de fotos por cliente no código. O limite real depende do espaço disponível no navegador. As imagens são reduzidas para até 1600 pixels no lado maior, com miniaturas de até 480 pixels.

## Executar no computador

É necessário ter Node.js e npm instalados. O projeto não usa dependências externas.

```bash
git clone https://github.com/danidigrandi019/atendimento_baby.git
cd atendimento_baby
npm run check
npm start
```

Abra <http://127.0.0.1:4173> no navegador. Para encerrar o servidor, pressione `Ctrl+C` no terminal.

O comando `npm run check` verifica a sintaxe dos arquivos JavaScript; ele não substitui os testes de uso no navegador.

## Publicar na Vercel

1. Entre na [Vercel](https://vercel.com/new) e escolha **Add New → Project**.
2. Importe o repositório **danidigrandi019/atendimento_baby**.
3. Mantenha **Root Directory** na raiz do repositório (`.`).
4. O arquivo `vercel.json` já define as configurações abaixo.
5. Clique em **Deploy** e abra o endereço gerado no Safari do iPhone.

| Configuração | Valor |
| --- | --- |
| Framework Preset | Other |
| Root Directory | `.` |
| Build Command | `npm run check` |
| Output Directory | `dist` |
| Install Command | Vazio |
| Variáveis de ambiente | Nenhuma |

A pasta `dist` já contém os arquivos finais do site. O comando de build só confere a sintaxe; não há uma etapa de compilação. Depois de vincular o repositório à Vercel, novos commits na branch de produção podem gerar novas publicações automaticamente.

Referência: [configuração de projetos na Vercel](https://vercel.com/docs/project-configuration/vercel-json).

## Uso no iPhone

1. Abra o site publicado em uma aba normal do Safari.
2. Toque em **Começar atendimento**.
3. Use **Foto · Cliente XX** para fotografar as escolhas desse cliente.
4. Toque em **Novo cliente** para iniciar outro atendimento.
5. Alterne entre os cartões para consultar cada pedido.
6. Ao terminar, toque em **Finalizar**. As fotos ficam disponíveis em **Finalizados**.

### Armazenamento das fotos

As fotos ficam **no navegador e no aparelho utilizados**. Elas não são enviadas ao GitHub nem à Vercel, e não existe sincronização ou backup remoto.

- Recarregar a página mantém os registros salvos, enquanto os dados do site forem preservados pelo navegador.
- Limpar os dados do site, remover o navegador ou usar navegação privada pode causar perda dos registros.
- Outro aparelho, navegador ou endereço do site tem seu próprio armazenamento. Mudar o domínio não transfere as fotos do endereço anterior.
- O app depende de conexão para carregar a página; não há suporte completo para abertura offline.

## Estrutura do projeto

| Arquivo | Finalidade |
| --- | --- |
| `dist/index.html` | Estrutura das telas e controles |
| `dist/app.js` | Navegação, câmera, importação e visualização das fotos |
| `dist/storage.js` | Clientes, fotos e transações no IndexedDB |
| `dist/style.css` | Layout responsivo |
| `dist/brand.css` | Cores da interface |
| `dist/icon.svg` | Ícone do site |
| `preview.mjs` | Servidor para desenvolvimento local |
| `build-standalone.mjs` | Geração opcional de um HTML único |
| `vercel.json` | Configuração de publicação na Vercel |

Para gerar uma versão em arquivo único:

```bash
npm run build:standalone
```

O arquivo `vitrine.html` é gerado na raiz e ignorado pelo Git. A publicação na Vercel continua usando `dist`. O visualizador de arquivos do iPhone não substitui a abertura do site publicado.

## Validação antes de usar na loja

A captura pela câmera e a persistência no Safari de um iPhone real ainda precisam de validação. Faça este teste antes do primeiro atendimento:

- Crie um cliente com cinco fotos e outro com dez.
- Alterne entre eles e confirme que as imagens pertencem ao cliente correto.
- Recarregue a página, feche e abra o Safari e confira os registros.
- Abra uma imagem em tela cheia e navegue pelas fotos.
- Finalize um atendimento e reabra-o.
- Confira que cancelar uma exclusão mantém a foto.

A interface tem cores inspiradas na marca. A imagem original da logo ainda não está incorporada.
