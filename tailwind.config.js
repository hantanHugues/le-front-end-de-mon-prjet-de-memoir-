/**
 * ⚠️ CE FICHIER N'EST PAS LU PAR TAILWIND.
 *
 * Le projet utilise Tailwind v4, qui ne charge un fichier de configuration
 * JS que si le CSS contient explicitement une directive `@config`. Ce n'est
 * pas le cas ici : tout le thème est déclaré en CSS dans
 * `src/renderer/src/styles/globals.css` (`@import "tailwindcss"` + bloc
 * `@theme inline` + variables `:root`).
 *
 * Ce fichier contenait auparavant une configuration v3 complète avec une
 * palette obsolète (fond #09090B, accent violet #8B5CF6) — c'est-à-dire
 * l'ancien design, en contradiction avec le thème Discord réellement actif
 * (#1E1F22 / #5865F2). Comme rien ne le chargeait, la contradiction était
 * invisible au build mais trompeuse à la lecture.
 *
 * 👉 Pour modifier les couleurs, les polices ou les rayons :
 *    éditer `src/renderer/src/styles/globals.css`, PAS ce fichier.
 *
 * Il est conservé vide plutôt que supprimé parce que certains outils
 * (extensions d'éditeur, IntelliSense Tailwind) cherchent sa présence.
 */
export default {
  content: ['./src/renderer/src/**/*.{js,jsx}'],
}
