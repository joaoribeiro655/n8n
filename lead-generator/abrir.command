#!/bin/bash
# Dê dois cliques aqui para ABRIR o Gerador de Leads.
# Ele se ATUALIZA sozinho (busca a versão mais nova) e depois abre a janela.
cd "$(dirname "$0")" || exit 1

echo "================================"
echo "   Gerador de Leads 🎯"
echo "================================"

# 1) Precisa do Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js não encontrado. Instale a versão LTS em https://nodejs.org e tente de novo."
  read -r -n 1 -p "Pressione qualquer tecla para fechar…"
  exit 1
fi

# 2) Auto-atualização (se for uma cópia baixada via git)
if command -v git >/dev/null 2>&1 && git rev-parse --git-dir >/dev/null 2>&1; then
  echo "🔄 Procurando atualizações…"
  BEFORE="$(git rev-parse HEAD 2>/dev/null)"
  if git pull --ff-only >/dev/null 2>&1; then
    AFTER="$(git rev-parse HEAD 2>/dev/null)"
    if [ "$BEFORE" != "$AFTER" ]; then
      echo "✅ Atualizado para a versão mais recente!"
      # Se as dependências mudaram, reinstala.
      if git diff --name-only "$BEFORE" "$AFTER" 2>/dev/null | grep -q "lead-generator/package.json"; then
        echo "📦 Atualizando componentes do app…"
        npm install
      fi
    else
      echo "✔️  Você já está na versão mais recente."
    fi
  else
    echo "⚠️  Não deu para atualizar agora (sem internet ou você tem mudanças locais)."
    echo "    Vou abrir a versão que já está aqui."
  fi
else
  echo "ℹ️  Esta cópia não veio do GitHub via git, então não se atualiza sozinha."
fi

# 3) Primeira execução: instala o app
if [ ! -d node_modules ]; then
  echo "📦 Primeira execução: instalando o app (pode levar alguns minutos)…"
  npm install || { echo "❌ Falha ao instalar."; read -r -n 1 -p "Tecla para fechar…"; exit 1; }
fi

# 3.5) Repara o Electron se o macOS (Gatekeeper) tiver apagado o binário/motor
#      e tira a "quarentena" ANTES de abrir, evitando o bloqueio de "malware".
ELECTRON_BIN="node_modules/electron/dist/Electron.app/Contents/MacOS/Electron"
ELECTRON_FW="node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework"
if [ ! -f "$ELECTRON_BIN" ] || [ ! -d "$ELECTRON_FW" ]; then
  echo "🔧 Reparando o Electron (instalação incompleta)…"
  rm -rf node_modules/electron
  npm install electron
fi
if [ -d node_modules/electron ]; then
  xattr -cr node_modules/electron 2>/dev/null
  # Reassina localmente (ad-hoc). Em Macs Apple Silicon o app precisa de
  # assinatura para rodar; se o Gatekeeper quebrou a original, isto conserta.
  if command -v codesign >/dev/null 2>&1; then
    codesign --force --deep --sign - "node_modules/electron/dist/Electron.app" >/dev/null 2>&1
  fi
fi

# 4) Abre a janela
echo "🚀 Abrindo o Gerador de Leads…"
npm start
