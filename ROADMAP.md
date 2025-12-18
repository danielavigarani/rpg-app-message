# 🦋 WhatsApp RPG - Guia de Correção de Fluxo v15.0

## 🚨 DIAGNÓSTICO: A Lista Invisível
**Problema:** Os chats existem no banco, mas não aparecem.
**Causa:** A função `loadChatList()` é chamada apenas no início (`init`), quando o usuário ainda é "ninguém". Ao fazer login, ela não é chamada de novo, então a tela continua mostrando o resultado vazio inicial.
**Solução:** Precisamos "reiniciar" a busca de chats sempre que o usuário fizer login ou trocar de conta.

---

## 🛠️ Instruções de Correção (`script.js`)

### 1. Declaração de Variáveis (Correção de Erro)
Adicionar `currentUserCode` e `unsubscribeChats` (para limpar a lista antiga antes de carregar a nova) no topo do arquivo.

```javascript
let currentUserCode = null; // <--- CRUCIAL
let unsubscribeChats = null; // <--- Para reiniciar a lista
// ... outras variáveis existentes

2. Persistência de Login (Manter-se logado)

No início da função init(), verificar se já existe um código salvo no navegador.

// Dentro de init(), antes de tudo:
const savedCode = localStorage.getItem('rpg_access_code');
if (savedCode) {
    // Se tem código salvo, loga direto
    checkAccessCode(savedCode, true); // true = sem animação
} else {
    // Se não, garante que a tela de login apareça
    loginScreen.style.display = 'flex';
}

3. Função checkAccessCode (O Gatilho)

Ao logar com sucesso:

    Salvar no localStorage.

    CHAMAR loadChatList(). (Isso é o que faltava!)

    4. Função loadChatList (Limpeza)

Antes de criar um novo onSnapshot, precisamos desligar o anterior para não acumular buscas.

function loadChatList() {
    // 1. Desligar ouvinte anterior se existir
    if (unsubscribeChats) {
        unsubscribeChats();
    }

    // 2. Definir Query
    // ... lógica de query existente ...

    // 3. Iniciar novo ouvinte e salvar na variável global
    unsubscribeChats = onSnapshot(q, (snapshot) => {
        // ... lógica de renderização existente ...
    }, (error) => {
        console.error("Erro na lista:", error);
        // ... alerta de índice ...
    });
}

### 💡 Dica Importante sobre o Firebase

Além dessa correção no código, lembre-se do **Índice**.
Se você logar e a lista continuar vazia, **abra o Console (F12)**. Se tiver um erro vermelho lá com um link, **clique nele**.
O Firebase exige isso quando usamos filtros complexos (`array-contains` + `orderBy`). Sem criar esse índice (clicando no link), o banco bloqueia a busca!