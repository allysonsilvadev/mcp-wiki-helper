# MCP Wiki Helper

Servidor MCP para consultar uma Wiki armazenada em um repositório Git.

Ele sincroniza a Wiki, indexa os arquivos Markdown e oferece ferramentas para listar, pesquisar e ler documentos no Codex ou no VS Code.

## Funcionalidades

| Ferramenta | O que faz |
| --- | --- |
| `Server` | Verifica se o MCP está funcionando. |
| `list_documents` | Lista os documentos da Wiki. |
| `search_documents` | Pesquisa pelo nome ou caminho do documento. |
| `search_content` | Pesquisa dentro do conteúdo dos documentos. |
| `read_document` | Lê um documento Markdown completo. |
| `get_sync_status` | Informa o estado da última sincronização da Wiki. |
| `list_recent_changes` | Lista documentos alterados na última sincronização. |

## Como funciona

1. O MCP clona ou atualiza o repositório Git da Wiki.
2. Localiza todos os arquivos `.md`.
3. Cria um índice em memória.
4. Disponibiliza as ferramentas pela rota HTTP `/mcp`.
5. Atualiza a Wiki periodicamente.

> A pasta definida em `WIKI_LOCAL_PATH` é atualizada com `git reset --hard`. Não faça alterações manuais nela, pois serão descartadas.

## 1. Configurar o servidor

Na máquina onde o MCP ficará rodando, entre na pasta do projeto:

```bash
cd "/caminho/para/mcp-wiki-helper"
```

Instale as dependências:

```bash
npm install
```

Crie o arquivo `.env`:

```bash
cp .env.example .env
```

Preencha o `.env`:

```env
WIKI_REPOSITORY_URL=git@github.com:empresa/wiki.git
WIKI_LOCAL_PATH=./data/wiki
WIKI_BRANCH=main
WIKI_SYNC_INTERVAL_MS=3600000

MCP_HTTP_HOST=0.0.0.0
MCP_HTTP_PORT=3000
MCP_HTTP_ROUTE=/mcp
```

Para facilitar o primeiro teste na rede local, não configure `MCP_API_KEY`.

## 2. Iniciar o servidor

Compile:

```bash
npm run build
```

Inicie:

```bash
npm run start:http
```

Mantenha esse terminal aberto. A mensagem esperada é:

```text
[MCP] HTTP ativo em http://0.0.0.0:3000/mcp
```

Descubra o IP da máquina:

```bash
hostname -I
```

Se necessário, libere a porta na rede local:

```bash
sudo ufw allow from 192.168.0.0/16 to any port 3000 proto tcp
```

## 3. Testar a conexão

Na outra máquina, execute:

```bash
curl http://IP_DO_SERVIDOR:3000/health
```

Exemplo:

```bash
curl http://192.168.3.233:3000/health
```

Resposta esperada:

```json
{
  "status": "ok",
  "documents": 100
}
```

O campo `documents` deve ser maior que zero.

## 4. Conectar no Codex

No Codex:

1. Abra **Settings**.
2. Entre em **MCP servers**.
3. Clique em **+ Add server**.
4. Escolha o tipo **URL/HTTP**.
5. Use o nome `wiki-helper`.
6. Preencha somente a URL:

```text
http://IP_DO_SERVIDOR:3000/mcp
```

Exemplo:

```text
http://192.168.3.233:3000/mcp
```

Deixe estes campos completamente vazios:

- **Bearer token env var**
- **Headers**
- **Headers from environment variables**

Não escreva `none` nos campos de autenticação.

Depois:

1. Salve o servidor.
2. Ative a chave ao lado de `wiki-helper`.
3. Abra uma conversa nova no Codex.
4. Envie:

```text
Use list_documents do MCP wiki-helper e mostre os primeiros 10 documentos.
```

Se o Codex informar que a variável de ambiente `none` não existe:

1. Abra **Settings > MCP servers > wiki-helper**.
2. Clique em **Uninstall**.
3. Adicione novamente preenchendo somente a URL.
4. Deixe todos os campos de autenticação vazios.

## 5. Conectar no VS Code/Copilot

No VS Code:

1. Pressione `Ctrl+Shift+P`.
2. Execute `MCP: Open User Configuration`.
3. Coloque no arquivo `mcp.json`:

```json
{
  "servers": {
    "wiki-helper": {
      "type": "http",
      "url": "http://IP_DO_SERVIDOR:3000/mcp"
    }
  }
}
```

Depois execute `MCP: List Servers`, selecione `wiki-helper` e escolha `Start Server`.

## 6. Exemplos de uso

Verificar o servidor:

```text
Use a ferramenta Server do MCP wiki-helper.
```

Listar documentos:

```text
Use list_documents do wiki-helper e mostre os primeiros 10 documentos.
```

Pesquisar pelo nome:

```text
Use search_documents do wiki-helper para procurar "autenticação".
```

Pesquisar dentro da Wiki:

```text
Use search_content do wiki-helper para pesquisar "JWT", com limite 5.
```

Ler um documento:

```text
Use read_document do wiki-helper para ler "caminho/documento.md" e faça um resumo.
```

Verificar a última sincronização:

```text
Use get_sync_status do wiki-helper e mostre o estado da sincronização da Wiki.
```

Listar mudanças recentes:

```text
Use list_recent_changes do wiki-helper para listar até 50 documentos alterados.
```

## Problemas comuns

### Erro `ECONNREFUSED ...:80`

A URL está sem a porta ou a rota. Use sempre:

```text
http://IP_DO_SERVIDOR:3000/mcp
```

### Abriu a rota `/authorize`

O cliente tentou usar OAuth. Este MCP não possui OAuth. Remova a autenticação e deixe os campos Bearer e Headers vazios.

### O MCP não conecta

Confira na máquina servidora:

```bash
npm run start:http
ss -lntp | grep 3000
```

Teste novamente na máquina cliente:

```bash
curl http://IP_DO_SERVIDOR:3000/health
```

### A Wiki não retorna documentos

Confira se a pasta configurada contém arquivos Markdown:

```bash
find ./data/wiki -type f -name '*.md' | head
```

Também confira o acesso ao repositório Git configurado em `WIKI_REPOSITORY_URL`.

## Segurança

- Use este modo sem autenticação apenas em uma rede local controlada.
- Não exponha a porta `3000` diretamente na internet.
- Para acesso externo, utilize HTTPS, autenticação e um proxy reverso.
- Nunca versione chaves ou credenciais no `.env`.
