#!/bin/bash
# Instalador para Mac — abra com 2 cliques (ou rode no Terminal).
# Ele instala as dependências, cria o banco, popula o exemplo e sobe o app.

set -e
cd "$(dirname "$0")/.."   # vai para a pasta do projeto (calendario-conteudo)

echo "============================================"
echo "  Calendário de Conteúdo — instalação (Mac)"
echo "============================================"
echo "📁 Pasta: $(pwd)"
echo ""

# 1) Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js não encontrado."
  echo "   → Baixe a versão LTS em https://nodejs.org, instale e rode este arquivo de novo."
  read -r -p "Pressione Enter para fechar..."; exit 1
fi
echo "✓ Node.js $(node -v)"

# 2) PostgreSQL (banco de dados)
if ! command -v createdb >/dev/null 2>&1 || ! command -v psql >/dev/null 2>&1; then
  echo "❌ PostgreSQL não encontrado."
  echo ""
  echo "   Jeito mais fácil (com interface):"
  echo "     1. Baixe o Postgres.app em https://postgresapp.com"
  echo "     2. Arraste para Aplicativos, abra e clique em 'Initialize'"
  echo "     3. No menu do Postgres.app, clique em 'Configure your \$PATH'"
  echo ""
  echo "   Ou via Homebrew:"
  echo "     brew install postgresql@16 && brew services start postgresql@16"
  echo ""
  echo "   Depois rode este arquivo de novo."
  read -r -p "Pressione Enter para fechar..."; exit 1
fi
echo "✓ PostgreSQL encontrado"

# 3) Banco 'calendario'
if createdb calendario 2>/dev/null; then
  echo "✓ Banco 'calendario' criado"
else
  echo "✓ Banco 'calendario' já existe (ok)"
fi

# 4) Arquivo .env
if [ ! -f .env ]; then
  SECRET=$(openssl rand -hex 32)
  cat > .env <<EOF
# Banco local (Postgres.app / Homebrew)
DATABASE_URL="postgresql://localhost:5432/calendario"

# Segredo de login (gerado automaticamente)
AUTH_SECRET="$SECRET"

# Cole aqui sua chave da Claude para a geração de arte funcionar.
# Pegue em https://console.anthropic.com  → Settings → API Keys
ANTHROPIC_API_KEY=""
EOF
  echo "✓ .env criado (lembre de colar a ANTHROPIC_API_KEY depois, no arquivo .env)"
else
  echo "✓ .env já existe (mantido como está)"
fi

# 5) Dependências
echo ""
echo "📦 Instalando dependências (pode levar alguns minutos)..."
npm install

# 6) Tabelas + dados de exemplo
echo ""
echo "🗄  Criando as tabelas no banco..."
npm run db:push
echo "🌱 Criando o cliente de exemplo (Copa)..."
npm run db:seed || true

# 7) Subir
echo ""
echo "============================================"
echo "  Tudo pronto! 🚀"
echo "  Abra no navegador:  http://localhost:3000"
echo "  Login de exemplo:   admin@copa.com / mudar123"
echo "  Para parar o app:   aperte Ctrl + C aqui"
echo "============================================"
echo ""
npm run dev
