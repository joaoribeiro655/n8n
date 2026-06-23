#!/bin/bash
# Dê dois cliques neste arquivo no Finder para abrir o Gerador de Leads.
# (Na primeira vez ele instala as dependências; depois abre direto.)
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js não encontrado. Instale em https://nodejs.org (versão LTS) e tente de novo."
  read -r -n 1 -p "Pressione qualquer tecla para fechar…"
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "📦 Primeira execução: instalando o app (pode levar alguns minutos)…"
  npm install || { echo "❌ Falha ao instalar."; read -r -n 1 -p "Tecla para fechar…"; exit 1; }
fi

echo "🚀 Abrindo o Gerador de Leads…"
npm start
