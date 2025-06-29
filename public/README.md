# Assets publics

Ce répertoire contient les fichiers statiques de l'application.

## Structure recommandée

```
public/
├── logo.png          # Logo principal (PNG recommandé)
├── logo.svg          # Logo vectoriel (optionnel)
├── favicon.png       # Favicon pour l'onglet
├── favicon.ico       # Favicon ICO (optionnel)
└── README.md         # Ce fichier
```

## Formats recommandés

### Logo principal
- **PNG** : Pour les logos avec transparence, taille recommandée 32x32px à 128x128px
- **SVG** : Pour les logos vectoriels (meilleure qualité à toutes les tailles)

### Favicon
- **PNG** : 32x32px ou 64x64px
- **ICO** : Format traditionnel pour les favicons

## Utilisation dans l'application

### Dans l'en-tête
```tsx
<img src="/logo.png" alt="Logo" className="h-8 w-8" />
```

### Dans les composants
```tsx
<img src="/logo.svg" alt="Logo" className="h-5 w-5" />
```

### Favicon
Le favicon est automatiquement utilisé par le navigateur depuis ce répertoire.
