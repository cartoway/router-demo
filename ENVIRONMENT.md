# Configuration des variables d'environnement

## Variables requises

### `VITE_ROUTER_API_KEY`
- **Description** : Clé API pour l'API Cartoway Router
- **Type** : String
- **Valeur par défaut** : `'demo'`
- **Exemple** : `VITE_ROUTER_API_KEY=your_actual_api_key_here`

## Configuration

1. Créez un fichier `.env` à la racine du projet
2. Ajoutez vos variables d'environnement :

```bash
# .env
VITE_ROUTER_API_KEY=your_actual_api_key_here
```

## Utilisation dans le code

La variable est automatiquement chargée dans `CartowayApiService` :

```typescript
// src/services/cartowayApi.ts
constructor(apiKey?: string) {
  this.apiKey = apiKey || import.meta.env.VITE_ROUTER_API_KEY || 'demo';
}
```

## Sécurité

- Le fichier `.env` est ignoré par Git (dans `.gitignore`)
- Ne committez jamais vos vraies clés API
- Utilisez `demo` pour les tests de développement

## Déploiement

Pour la production, configurez les variables d'environnement sur votre plateforme de déploiement :

- **Vercel** : Variables d'environnement dans les paramètres du projet
- **Netlify** : Variables d'environnement dans les paramètres du site
- **Docker** : Variables d'environnement dans le Dockerfile ou docker-compose.yml
