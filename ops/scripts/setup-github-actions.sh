#!/bin/bash
# Script de Configuration Automatique GitHub Actions
# Ce script configure les permissions et settings nécessaires

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Configuration GitHub Actions - ParkShare         ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo ""

# Vérifier si gh CLI est installé
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) n'est pas installé${NC}"
    echo ""
    echo -e "${YELLOW}Installation automatique...${NC}"

    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        echo "Détection de macOS..."
        if command -v brew &> /dev/null; then
            brew install gh
        else
            echo -e "${RED}Homebrew n'est pas installé. Installez-le depuis: https://brew.sh${NC}"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        echo "Détection de Linux..."
        curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
        sudo apt update
        sudo apt install gh -y
    else
        echo -e "${RED}OS non supporté. Installez GitHub CLI manuellement: https://cli.github.com/${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ GitHub CLI est installé${NC}"
echo ""

# Authentification
echo -e "${YELLOW}🔐 Authentification GitHub...${NC}"
if ! gh auth status &> /dev/null; then
    echo "Vous allez être redirigé vers GitHub pour l'authentification..."
    gh auth login
else
    echo -e "${GREEN}✅ Déjà authentifié${NC}"
fi
echo ""

# Définir le repo
REPO="YousOuazizi/parkshare"
echo -e "${BLUE}📦 Repository: ${REPO}${NC}"
echo ""

# 1. Activer les permissions GHCR
echo -e "${YELLOW}⚙️  Configuration des permissions GHCR...${NC}"
echo "Note: Cette étape nécessite des permissions admin sur le repo."
echo ""
echo "Je vais ouvrir la page des settings dans votre navigateur."
echo "Suivez ces étapes:"
echo "  1. Allez dans 'Actions' → 'General'"
echo "  2. Descendez à 'Workflow permissions'"
echo "  3. Sélectionnez 'Read and write permissions'"
echo "  4. Cochez 'Allow GitHub Actions to create and approve pull requests'"
echo "  5. Cliquez 'Save'"
echo ""
read -p "Appuyez sur Entrée pour ouvrir la page..."
gh repo view $REPO --web -s settings/actions
echo ""
read -p "Une fois terminé, appuyez sur Entrée pour continuer..."
echo -e "${GREEN}✅ Permissions configurées${NC}"
echo ""

# 2. Configurer les secrets (optionnels)
echo -e "${YELLOW}🔒 Configuration des secrets GitHub...${NC}"
echo ""
echo "Je vais vous demander quelques secrets optionnels."
echo "Vous pouvez appuyer sur Entrée pour passer ceux que vous n'avez pas."
echo ""

# CODECOV_TOKEN
read -p "CODECOV_TOKEN (pour coverage reports) [Entrée pour passer]: " CODECOV_TOKEN
if [ ! -z "$CODECOV_TOKEN" ]; then
    echo "$CODECOV_TOKEN" | gh secret set CODECOV_TOKEN --repo $REPO
    echo -e "${GREEN}✅ CODECOV_TOKEN configuré${NC}"
fi

# SNYK_TOKEN
read -p "SNYK_TOKEN (pour security scanning) [Entrée pour passer]: " SNYK_TOKEN
if [ ! -z "$SNYK_TOKEN" ]; then
    echo "$SNYK_TOKEN" | gh secret set SNYK_TOKEN --repo $REPO
    echo -e "${GREEN}✅ SNYK_TOKEN configuré${NC}"
fi

# SLACK_WEBHOOK_URL
read -p "SLACK_WEBHOOK_URL (pour notifications) [Entrée pour passer]: " SLACK_WEBHOOK_URL
if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
    echo "$SLACK_WEBHOOK_URL" | gh secret set SLACK_WEBHOOK_URL --repo $REPO
    echo -e "${GREEN}✅ SLACK_WEBHOOK_URL configuré${NC}"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✨ Configuration terminée !${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""
echo "🎯 Prochaines étapes:"
echo ""
echo "1. Voir les workflows en action:"
echo "   ${BLUE}https://github.com/$REPO/actions${NC}"
echo ""
echo "2. Pour déclencher un workflow manuellement:"
echo "   ${YELLOW}gh workflow run deploy.yml --repo $REPO${NC}"
echo ""
echo "3. Voir les secrets configurés:"
echo "   ${YELLOW}gh secret list --repo $REPO${NC}"
echo ""
echo "4. Lire la documentation complète:"
echo "   ${YELLOW}cat docs/GITHUB_ACTIONS_GUIDE.md${NC}"
echo ""
echo -e "${GREEN}Bon développement ! 🚀${NC}"
