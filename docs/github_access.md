# Accessibilite GitHub

Le depot a ete pousse vers :

```text
https://github.com/Yros-So/Projet_Data_Science.git
```

Un test non authentifie peut echouer avec :

```text
fatal: could not read Username for 'https://github.com': terminal prompts disabled
```

Cela indique que le depot n'est pas accessible publiquement ou que GitHub demande une authentification.

## A faire dans GitHub

Pour qu'un correcteur puisse ouvrir le lien sans compte autorise :

1. Ouvrir le depot sur GitHub.
2. Aller dans `Settings`.
3. Descendre dans `Danger Zone`.
4. Cliquer sur `Change repository visibility`.
5. Choisir `Public`.
6. Confirmer le nom du depot.

## Verification

Depuis un terminal sans authentification :

```bash
git -c credential.helper= ls-remote https://github.com/Yros-So/Projet_Data_Science.git
```

Si le depot est public, la commande doit retourner des references Git au lieu de demander un nom d'utilisateur.

