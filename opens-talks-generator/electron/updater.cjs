// ============================================================
//  Auto-update do app desktop (electron-updater)
// ------------------------------------------------------------
//  Ao abrir, o app consulta o GitHub Releases. Se houver uma versão
//  maior que a instalada, baixa em segundo plano e oferece reiniciar
//  para aplicar. Suas configurações (chave) ficam intactas.
//
//  IMPORTANTE (macOS): o auto-update só funciona com o app ASSINADO
//  com um certificado "Developer ID Application" da Apple. Sem assinatura,
//  o macOS recusa a atualização. Veja o README (seção Auto-update).
// ============================================================
const { autoUpdater } = require('electron-updater')
const { dialog } = require('electron')

function initAutoUpdate({ app, getWindow }) {
  // Só faz sentido no app empacotado (em dev não há feed de updates).
  if (!app.isPackaged) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-downloaded', async (info) => {
    const win = typeof getWindow === 'function' ? getWindow() : null
    const { response } = await dialog.showMessageBox(win || undefined, {
      type: 'info',
      buttons: ['Reiniciar agora', 'Depois'],
      defaultId: 0,
      cancelId: 1,
      title: 'Atualização disponível',
      message: `Uma nova versão (${info?.version || ''}) do Opens Talks foi baixada.`,
      detail: 'Reinicie para aplicar. Sua chave e configurações são mantidas.',
    })
    if (response === 0) autoUpdater.quitAndInstall()
  })

  autoUpdater.on('error', (err) => {
    // Falha de update nunca deve derrubar o app — só registra.
    console.error('[Opens Talks] Auto-update:', err?.message || err)
  })

  // Verifica ao abrir e a cada 6 horas enquanto estiver aberto.
  autoUpdater.checkForUpdates().catch(() => {})
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 6 * 60 * 60 * 1000)
}

module.exports = { initAutoUpdate }
