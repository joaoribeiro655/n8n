// ============================================================
//  Processo principal do Electron (app desktop para macOS)
// ------------------------------------------------------------
//  Sobe o servidor Express embutido (que guarda a chave e fala com a
//  Anthropic) numa porta livre do sistema e carrega a interface a partir
//  dele. A chave é persistida no diretório de dados do app (userData),
//  então você cola a chave uma vez e ela continua valendo nos próximos
//  usos — tudo no seu Mac, nada vai para o navegador.
// ============================================================
const { app, BrowserWindow, shell } = require('electron')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { initAutoUpdate } = require('./updater.cjs')

let serverPort = null
let mainWindow = null

async function bootServer() {
  // A chave fica persistida aqui (fora do asar, gravável).
  process.env.OPENS_KEY_FILE = path.join(app.getPath('userData'), 'anthropic.key')
  process.env.NODE_ENV = 'production'

  // O servidor é ESM; carregamos via dynamic import a partir deste arquivo CJS.
  const serverEntry = path.join(__dirname, '..', 'server', 'index.js')
  const { startServer } = await import(pathToFileURL(serverEntry).href)

  // Porta 0 = o SO escolhe uma porta livre (evita conflito com outros apps).
  const { port } = await startServer({ port: 0, host: '127.0.0.1' })
  serverPort = port
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 860,
    minWidth: 880,
    minHeight: 600,
    backgroundColor: '#0d0f14',
    title: 'Opens Talks',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.loadURL(`http://127.0.0.1:${serverPort}/`)

  // Links externos (ex.: console.anthropic.com) abrem no navegador padrão.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  try {
    await bootServer()
  } catch (err) {
    console.error('[Opens Talks] Falha ao subir o servidor embutido:', err)
  }
  createWindow()

  // Verifica atualizações ao abrir (só no app empacotado e assinado).
  initAutoUpdate({ app, getWindow: () => mainWindow })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  // No macOS é convenção manter o app vivo até Cmd+Q.
  if (process.platform !== 'darwin') app.quit()
})
