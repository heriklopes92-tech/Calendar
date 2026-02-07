# 📅 Calendário Colaborativo

Um calendário interativo onde qualquer pessoa pode preencher campos vazios com mensagens que ficam visíveis para todos os usuários.

## 🎯 Funcionalidades

- ✅ Calendário mensal interativo
- ✅ Campos de texto por dia
- ✅ Apenas campos vazios podem ser preenchidos
- ✅ Campos preenchidos ficam bloqueados
- ✅ Mensagens visíveis para todos os usuários
- ✅ Armazenamento persistente e compartilhado
- ✅ Interface responsiva (funciona em mobile)
- ✅ Navegação entre meses
- ✅ Atualização automática a cada 30 segundos

## 🚀 Como Publicar Gratuitamente

### Opção 1: GitHub Pages (Recomendado)

#### Passo 1: Criar conta no GitHub
1. Acesse [github.com](https://github.com)
2. Clique em "Sign up" (Cadastrar-se)
3. Preencha seus dados e confirme o email

#### Passo 2: Criar um novo repositório
1. Após fazer login, clique no botão "+" no canto superior direito
2. Selecione "New repository"
3. Configure:
   - **Repository name:** `calendario-colaborativo` (ou qualquer nome)
   - **Description:** "Calendário colaborativo interativo"
   - Marque "Public"
   - Marque "Add a README file"
4. Clique em "Create repository"

#### Passo 3: Fazer upload dos arquivos
1. Na página do repositório, clique em "Add file" → "Upload files"
2. Arraste os 3 arquivos do projeto:
   - `index.html`
   - `styles.css`
   - `script.js`
3. Escreva uma mensagem de commit (ex: "Adicionar calendário")
4. Clique em "Commit changes"

#### Passo 4: Ativar GitHub Pages
1. No repositório, clique em "Settings" (Configurações)
2. No menu lateral, clique em "Pages"
3. Em "Source", selecione "main" (branch principal)
4. Clique em "Save"
5. Aguarde 1-2 minutos

#### Passo 5: Acessar seu calendário
- Seu site estará disponível em: `https://SEU-USUARIO.github.io/calendario-colaborativo`
- Compartilhe este link com qualquer pessoa!

### Opção 2: Netlify Drop

#### Passo 1: Preparar os arquivos
1. Coloque os 3 arquivos (`index.html`, `styles.css`, `script.js`) em uma pasta

#### Passo 2: Fazer upload no Netlify
1. Acesse [app.netlify.com/drop](https://app.netlify.com/drop)
2. Arraste a pasta com os arquivos para a área indicada
3. Aguarde o upload completar

#### Passo 3: Acessar seu site
- O Netlify gerará um link automático (ex: `https://nome-aleatorio.netlify.app`)
- Você pode personalizar o nome nas configurações (opcional)

### Opção 3: Vercel

#### Passo 1: Criar conta
1. Acesse [vercel.com](https://vercel.com)
2. Cadastre-se (pode usar conta do GitHub)

#### Passo 2: Fazer deploy
1. Após login, clique em "Add New..." → "Project"
2. Importe o repositório do GitHub (se usou GitHub)
   OU
   Use "Deploy from Git" e faça upload dos arquivos
3. Clique em "Deploy"

#### Passo 3: Acessar
- Seu site estará em: `https://nome-do-projeto.vercel.app`

## 📂 Estrutura dos Arquivos

```
calendario-colaborativo/
│
├── index.html      # Estrutura HTML da página
├── styles.css      # Estilos e design responsivo
└── script.js       # Lógica do calendário e armazenamento
```

## 💾 Como Funciona o Armazenamento

O projeto usa a **API de Storage do Claude** que:
- Armazena dados de forma **permanente**
- **Compartilha** dados entre todos os usuários
- **Não requer servidor** próprio
- Funciona com hospedagem estática gratuita
- Atualiza automaticamente a cada 30 segundos

### Estrutura dos Dados

```javascript
{
  "2024-02-15": {
    "message": "Mensagem do usuário",
    "timestamp": "2024-02-15T10:30:00.000Z"
  },
  "2024-02-16": {
    "message": "Outra mensagem",
    "timestamp": "2024-02-16T14:20:00.000Z"
  }
}
```

## 🔧 Personalização

### Mudar cores principais
No arquivo `styles.css`, localize:
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```
Altere `#667eea` e `#764ba2` para suas cores preferidas.

### Mudar limite de caracteres
No arquivo `script.js`, localize:
```javascript
maxlength="200"
```
E também:
```javascript
if (message.length > 200) {
```
Altere `200` para o valor desejado.

### Mudar frequência de atualização
No arquivo `script.js`, localize:
```javascript
setInterval(async () => {
    await loadCalendarData();
    renderCalendar();
}, 30000); // 30000 = 30 segundos
```
Altere `30000` (valor em milissegundos).

## 🎨 Características do Design

- **Gradiente moderno** no fundo
- **Animações suaves** em botões e cards
- **Feedback visual** ao preencher campos
- **Modal centralizado** para adicionar mensagens
- **Contador de caracteres** em tempo real
- **Loading overlay** durante operações
- **Cores intuitivas:**
  - Verde = preenchido
  - Branco = disponível
  - Cinza = outro mês

## 📱 Responsividade

O calendário se adapta automaticamente a:
- 💻 Desktop (1200px+)
- 📱 Tablet (768px - 1199px)
- 📱 Mobile (até 767px)

## ⚙️ Tecnologias Utilizadas

- **HTML5** - Estrutura semântica
- **CSS3** - Estilização moderna com Grid e Flexbox
- **JavaScript (ES6+)** - Lógica e interatividade
- **Storage API** - Persistência de dados compartilhada

## 🔒 Segurança e Limitações

### Proteções implementadas:
- ✅ Campos preenchidos são bloqueados
- ✅ Validação dupla antes de salvar
- ✅ Limite de caracteres (200)
- ✅ Sanitização de entrada

### Limitações conhecidas:
- ⚠️ Não há autenticação de usuários
- ⚠️ Não é possível editar mensagens já salvas
- ⚠️ Não há moderação de conteúdo
- ⚠️ Limite de armazenamento (5MB por chave)

## 🤝 Uso Colaborativo

Este calendário é ideal para:
- 📝 Diários coletivos
- 🎉 Calendários de eventos comunitários
- 💡 Murais de ideias
- 📅 Agendas compartilhadas
- 🎨 Projetos criativos colaborativos

## 📞 Suporte

Se encontrar algum problema:
1. Verifique se todos os 3 arquivos estão no mesmo diretório
2. Abra o Console do navegador (F12) para ver erros
3. Certifique-se de que está usando HTTPS (não HTTP)
4. Limpe o cache do navegador

## 📄 Licença

Este projeto é de código aberto e pode ser usado livremente para qualquer propósito.

---

**Desenvolvido com ❤️ usando HTML, CSS e JavaScript puro**

*Nenhuma biblioteca externa, nenhuma dependência, 100% gratuito!*
