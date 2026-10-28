const stickerPromptTemplate = `SUJET
[DESCRIPTION]

STYLE GRAPHIQUE
[STYLE]

AMBIANCE
[douce, drôle, sombre, énergique, technique…]
Palette limitée à [3 À 4 COULEURS].
Lecture immédiate, même en petit format.

COMPOSITION
Sujet unique, centré, cadré en entier.
Vue [DE FACE / DE PROFIL / TROIS-QUARTS].
Marge visuelle régulière autour du sujet.

CONTRAINTES
- Dimensions maximales : 8 × 8 cm, bordure comprise.
- Bordure blanche uniforme de 15 mm.
- Fond 100 % transparent. Fichier PNG.
- Aucun élément coupé.
- Contours nets et fermés, découpe possible.
- Aucun texte, sauf [MOT ÉVENTUEL OU « aucun »].

À ÉVITER
- Arrière-plan ou décor.
- Ombre portée extérieure.
- Mélange avec d'autres styles.
- Dégradés complexes et effets photoréalistes.
- Détails trop fins, illisibles une fois imprimé.
- Plusieurs sujets ou variantes dans la même image`;

const stickerStyles = [
['Y2K - années 2000', 'Chrome, étoiles, formes brillantes, rose vif, bleu glacier et lettres arrondies.'],
['Cyber Y2K', 'Métal liquide, symboles numériques, typographie futuriste et contrastes marqués.'],
['Cyber-sigilisme', 'Motifs abstraits entre formes tribales, pointes et ramifications organiques.'],
['Grunge / photocopie', 'Grain brut, textures usées, noir et blanc, déchirures et imperfections.'],
['Zine / collage punk', 'Images découpées, lettres dépareillées, papier déchiré et composition expressive.'],
['Doodle / dessin spontané', 'Gribouillis, petits personnages, annotations et traits volontairement irréguliers.'],
['Weirdcore', 'Associations étranges, objets décalés et ambiance volontairement déroutante.'],
['Dreamcore', 'Univers onirique, couleurs douces, éléments flottants et scènes irréelles.'],
['Vaporwave', 'Rose et violet, références informatiques rétro, statues et effets numériques.'],
['Pixel art / jeu rétro', 'Pixels apparents, palette limitée et personnages inspirés des jeux anciens.'],
['Glitch art', 'Décalages de couleurs, fragments numériques et déformations contrôlées.'],
['Kawaii / mascotte', 'Personnages expressifs, formes simples, contours épais et couleurs douces.'],
['Coquette', 'Nœuds, rubans, dentelle dessinée et palette rose, crème ou bordeaux.'],
['Gothique contemporain', 'Lettrage gothique, roses, ornements pointus et contrastes noir, blanc ou rouge.'],
['Sport rétro / racing', 'Numéros imposants, lignes de vitesse, damiers et typographies inclinées.'],
['Manga noir et blanc', 'Traits dynamiques, ombres tramées et contrastes forts.'],
['Anime coloré', 'Personnage expressif, couleurs franches et éclairage stylisé.'],
['Comic / pop art', 'Contours noirs, aplats vifs et points de trame.'],
['Cartoon rétro', 'Personnages souples, gants, expressions exagérées et palette vintage.'],
['Graffiti / lettrage urbain', 'Lettres expressives, contours épais et effets de bombe de peinture.'],
['Tatouage traditionnel', 'Contours noirs épais, palette limitée et composition compacte.'],
['Gravure / linogravure', 'Hachures, marques de taille et contraste marqué.'],
['Psychédélique années 1970', 'Formes ondulantes, lettres déformées et couleurs vibrantes.'],
['Affiche de concert vintage', 'Illustration centrale, typographie forte et texture vieillie.'],
['Illustration technique', 'Vue éclatée, lignes précises et détails mécaniques.'],
['Minimaliste / line art', 'Quelques lignes nettes, silhouette claire et composition aérée.'],
['Flat design géométrique', 'Aplats de couleurs, formes simples et contours précis.'],
['Duotone tramé', 'Deux couleurs dominantes et ombres composées de points.'],
['3D jouet / art toy', 'Volumes arrondis, aspect vinyle et personnage de collection.'],
['Chrome / métal liquide', 'Reflets métalliques, volumes fluides et finition miroir.']
];

const promptDialog = document.getElementById('promptDialog');
const stylesDialog = document.getElementById('stylesDialog');
const promptField = document.getElementById('stickerPrompt');
const copyStatus = document.getElementById('copyStatus');
promptField.value = stickerPromptTemplate;

function openLab(dialog) {
  for (const other of [promptDialog, stylesDialog]) if (other.open) other.close();
  dialog.showModal();
  dialog.querySelector('[data-close]').focus();
}
document.getElementById('openPrompt').addEventListener('click', () => openLab(promptDialog));
document.getElementById('openStyles').addEventListener('click', () => openLab(stylesDialog));
document.getElementById('promptToStyles').addEventListener('click', () => openLab(stylesDialog));
for (const dialog of [promptDialog, stylesDialog]) {
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
}
promptField.addEventListener('input', () => { copyStatus.textContent = ''; });
document.getElementById('copyPrompt').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(promptField.value);
    copyStatus.textContent = 'Prompt copié ! Colle-le dans ton outil de génération d’images.';
  } catch {
    promptField.focus();
    promptField.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch { /* Manual selection remains available. */ }
    copyStatus.textContent = copied
      ? 'Prompt copié ! Colle-le dans ton outil de génération d’images.'
      : 'Copie automatique indisponible. Le prompt est sélectionné : utilise Ctrl+C ou ⌘C pour le copier.';
  }
});

function selectStickerStyle(name, description) {
  const styleText = name + ' — ' + description;
  const pattern = /(STYLE GRAPHIQUE\s*\n)[\s\S]*?(?=\n\s*\n|\nAMBIANCE|$)/;
  if (pattern.test(promptField.value)) promptField.value = promptField.value.replace(pattern, (_, heading) => heading + styleText);
  else promptField.value += '\n\nSTYLE GRAPHIQUE\n' + styleText;
  openLab(promptDialog);
  copyStatus.textContent = 'Style ajouté : ' + name + '. Personnalise les autres champs, puis copie ton prompt.';
}

stickerStyles.forEach(([name, description], index) => {
  const card = document.createElement('button');
  card.className = 'style-tile';
  card.type = 'button';
  card.setAttribute('aria-label', 'Utiliser le style ' + name);
  for (const [tag, className, text] of [
    ['span', 'style-number', String(index + 1).padStart(2, '0')],
    ['strong', '', name],
    ['span', 'style-description', description],
    ['span', 'style-use', 'Utiliser ce style ↗']
  ]) {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    card.append(element);
  }
  card.addEventListener('click', () => selectStickerStyle(name, description));
  document.getElementById(index < 15 ? 'universeStyles' : 'renderStyles').append(card);
});
const normalizeStyleText = text => text.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
document.getElementById('styleSearch').addEventListener('input', event => {
  const query = normalizeStyleText(event.target.value.trim());
  let count = 0;
  document.querySelectorAll('.style-tile').forEach((card, index) => {
    card.hidden = !normalizeStyleText(stickerStyles[index].join(' ')).includes(query);
    if (!card.hidden) count++;
  });
  for (const group of document.querySelectorAll('.style-group')) group.hidden = !group.querySelector('.style-tile:not([hidden])');
  document.getElementById('styleCount').textContent = count + (count > 1 ? ' styles à explorer' : ' style à explorer');
  document.getElementById('noStyles').hidden = count > 0;
});
