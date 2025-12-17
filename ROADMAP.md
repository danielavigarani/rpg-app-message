# 🦋 Life is Strange RPG Messenger - Guia de Correção v3.0

## 🚨 STATUS CRÍTICO: Correção de Layout e Renderização
**Problema Atual:** O aplicativo envia mensagens para o Firebase (elas aparecem na sidebar), mas a **área de chat principal não renderiza as mensagens**, ficando branca/vazia. Além disso, o layout flexbox está quebrando, empurrando o conteúdo para fora da visão.

---

## 🎯 Objetivo da Sessão
1.  Corrigir o CSS do container de mensagens para que ele ocupe a altura correta e permita rolagem.
2.  Garantir que a função `loadMessages()` filtre e exiba os dados na tela corretamente.
3.  Aplicar rigorosamente a paleta de cores "Life is Strange" definida abaixo.

---

## 🎨 1. Design System (CSS Variables)
**Instrução:** Substitua todas as variáveis de cor no `style.css` por estas. Não use cores padrão do Tailwind (como `bg-gray-900`) para elementos estruturais, use as variáveis.

### ☀️ Light Mode (Morning Arcadia)
```css
:root {
    --app-bg: #fbf5f1;              /* Fundo Geral */
    --sidebar-bg: #f3eae4;          /* Lateral levemente mais escura */
    --border-color: #e6dace;        /* Bordas */
    
    --text-primary: #0b0805;
    --text-secondary: #5d554f;

    /* Balões */
    --bubble-npc-bg: #ffffff;
    --bubble-npc-text: #0b0805;
    --bubble-player-bg: #f2b378;    /* Laranja LiS */
    --bubble-player-text: #0b0805;
    
    --primary-accent: #945d29;      /* Detalhes/Botões */
}
🌙 Dark Mode (Dark Room)
body.dark-theme {
    --app-bg: #0d0607;              /* Preto Avermelhado */
    --sidebar-bg: #140a0b;
    --border-color: #2b1517;

    --text-primary: #eae3e4;
    --text-secondary: #9f8c8e;

    /* Balões */
    --bubble-npc-bg: #1f1f1f;       
    --bubble-npc-text: #eae3e4;
    --bubble-player-bg: #951526;    /* Vermelho Escuro */
    --bubble-player-text: #eae3e4;
    
    --primary-accent: #ffb6c0;      /* Rosa/Vermelho Claro */
}
🛠️ 2. Estrutura de Layout (Correção CSS)

Instrução: O layout deve seguir estritamente o modelo Flexbox Vertical para evitar o bug de "tela branca".
Estrutura do #chat-area (Painel Direito)

    Pai (#chat-content):

        Deve ter display: flex.

        Deve ter flex-direction: column.

        Deve ter height: 100% e overflow: hidden (CRUCIAL).

    Filho Expansível (#message-container):

        Deve ter flex: 1 (para crescer).

        Deve ter overflow-y: auto (para rolar).

        Deve ter min-height: 0 (truque de CSS para flexbox aninhado funcionar).

        Deve ter display: flex com flex-direction: column.

🧠 3. Lógica Javascript (script.js)
Função openChat(chatId, chatData)

Ao clicar num chat da lista:

    Atualizar a variável global currentChatId.

    Desktop: Adicionar classe hidden ao #empty-state e remover hidden do #chat-content.

    Mobile: Adicionar classe -translate-x-full na sidebar e remover da chat-area.

    Chamar loadMessages(chatId) imediatamente.

Função loadMessages(chatId) (Onde o bug reside)

    Verificar se chatId é válido.

    Cancelar listener anterior (unsubscribeMessages).

    Criar Query: Coleção messages -> where('chatId', '==', chatId) -> orderBy('createdAt').

    No Snapshot:

        Limpar #message-container (innerHTML = '').

        Se snapshot estiver vazio, exibir um log ou aviso visual.

        Loopar documentos e inserir HTML via createMessageElement.

        Importante: Chamar scrollToBottom() após renderizar.

Função createMessageElement(data)

    Certificar que o HTML gerado usa as classes de cor variáveis (ex: bg-[var(--bubble-player-bg)]) e não classes estáticas do Tailwind.

    Garantir que o texto da mensagem não esteja com cor branca sobre fundo branco.

💾 4. Estrutura de Dados (Referência)

Coleção chats:

    Document ID: chloe

    Fields: name, avatar, lastMessage

Coleção messages:

    Fields: text, createdAt, characterId, chatId (Link para o chat pai).

    