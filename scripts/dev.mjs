import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

// Lance electron-vite en s'assurant qu'Electron démarre bien comme Electron.
// Si ELECTRON_RUN_AS_NODE est présent dans l'environnement (c'est le cas quand
// la commande est lancée depuis certains outils/IDE), Electron se comporte comme
// un Node standard : `require('electron')` renvoie alors une string au lieu de
// l'API, et le main process casse sur `electron.app.isPackaged` (undefined).
const __dirname = dirname(fileURLToPath(import.meta.url))

// Sur Windows il faut viser le .cmd : le fichier sans extension est un script sh
// que cmd.exe ne sait pas exécuter.
const isWin = process.platform === 'win32'
const bin = resolve(__dirname, '../node_modules/.bin/electron-vite' + (isWin ? '.cmd' : ''))

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

// Le chemin du projet peut contenir des espaces (ex: "C:\Users\HP ELITEBOOK\...").
// Avec shell:true la commande est passée telle quelle au shell, donc elle doit
// être quotée sinon le shell coupe au premier espace.
const p = spawn(`"${bin}"`, ['dev'], { stdio: 'inherit', env, shell: true })

p.on('exit', code => process.exit(code ?? 0))
