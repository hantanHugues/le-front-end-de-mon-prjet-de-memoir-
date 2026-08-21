import { app, BrowserWindow, ipcMain, Notification, safeStorage } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

const isDev      = !app.isPackaged
const USER_DATA  = app.getPath('userData')
const CONFIG_PATH = join(USER_DATA, 'config.json')
const TOKEN_PATH  = join(USER_DATA, 'token.bin')

// ── Config (JSON plat dans userData) ────────────────────────────────
function readConfig() {
  if (!existsSync(CONFIG_PATH)) return {}
  try { return JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) } catch { return {} }
}
function writeConfig(patch) {
  const merged = { ...readConfig(), ...patch }
  writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2), 'utf8')
}

// ── Token (chiffré par l'OS via safeStorage) ─────────────────────────
function readToken() {
  if (!existsSync(TOKEN_PATH)) return null
  if (!safeStorage.isEncryptionAvailable()) return null
  try { return safeStorage.decryptString(readFileSync(TOKEN_PATH)) } catch { return null }
}
function writeToken(token) {
  if (!safeStorage.isEncryptionAvailable()) {
    // Fallback : stockage en clair si chiffrement OS indisponible
    writeFileSync(TOKEN_PATH, token, 'utf8')
    return
  }
  writeFileSync(TOKEN_PATH, safeStorage.encryptString(token))
}
function clearToken() {
  if (existsSync(TOKEN_PATH)) writeFileSync(TOKEN_PATH, Buffer.alloc(0))
}

// ── Fenêtre principale ────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width:  1280,
    height: 800,
    minWidth:  900,
    minHeight: 600,
    backgroundColor: '#090B10',
    titleBarStyle: 'default',
    webPreferences: {
      preload:          join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      webSecurity:      false, // autorise le flux MJPEG HTTP depuis le LAN local
    },
  })

  win.setMenuBarVisibility(false)

  if (isDev) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ── IPC handlers ──────────────────────────────────────────────────────
ipcMain.handle('config:get', ()       => readConfig())
ipcMain.handle('config:set', (_, d)  => writeConfig(d))
ipcMain.handle('token:get',  ()       => readToken())
ipcMain.handle('token:set',  (_, tok) => writeToken(tok))
ipcMain.handle('token:clear', ()      => clearToken())

ipcMain.handle('notify', (_, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show()
  }
})
