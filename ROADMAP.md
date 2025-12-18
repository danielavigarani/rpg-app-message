# 🦋 WhatsApp RPG - Guia de Identidade Real v17.0
O foco é garantir que cada mensagem tenha o "DNA" (código) de quem enviou.
## 🚨 DIAGNÓSTICO: Tudo à Direita
**Problema:** Em conversas Jogador x Jogador, todas as mensagens aparecem no lado direito (enviadas), parecendo um monólogo.
**Causa:** O sistema usa um ID genérico (`PLAYER_PROFILE.id`) para enviar mensagens de jogadores, em vez de usar o `currentUserCode` único de cada um.

---

## 🛠️ Instruções de Correção (`script.js`)

### 1. Corrigir quem envia (`openChat`)
Quando um **Jogador** abre o chat, a variável `currentSenderId` deve receber o código dele, não o ID fixo da Max.

**Lógica Nova:**
```javascript
if (currentUserType === 'gm') {
    currentSenderId = chatId; // GM vira o NPC
    // ...
} else {
    // PLAYER: Usa seu próprio código único (ex: '8579')
    currentSenderId = currentUserCode; 
    // Avatar continua sendo o do perfil
    currentCharAvatar.src = PLAYER_PROFILE.avatar;
}

2. Corrigir quem lê (createMessageElement)

A função precisa comparar o ID da mensagem com o ID do usuário logado para decidir o lado.

Lógica Nova:

function createMessageElement(data, docId) {
    // LÓGICA DE ALINHAMENTO:
    let isMe = false;

    if (currentUserType === 'player') {
        // Sou Jogador: É minha se o ID da mensagem for igual ao meu Código
        isMe = (data.characterId === currentUserCode);
    } else {
        // Sou Mestre: É minha se eu estiver interpretando esse NPC agora
        // (Ou seja, se a mensagem veio do personagem dono deste chat)
        isMe = (data.characterId === currentChatId);
    }

    // Define classes baseado no isMe (True = Direita, False = Esquerda)
    const wrapperClass = `flex w-full mb-2 ${isMe ? 'justify-end' : 'justify-start'}`;
    const bubbleClass = isMe ? 'bubble-right' : 'bubble-left';
    
    // ... resto do código (avatar, nome, etc)
}
3. Ajuste de Avatar (Fallback)

Como os códigos '8579' e '1111' não estão na lista CHARACTERS fixa, o avatar pode quebrar. Adicionar lógica para usar um avatar padrão se o personagem não for encontrado na lista fixa.


### 🧪 Como testar a correção:

1.  Abra a aba da **Dani (8579)** e a aba do **Ale (1111)**.
2.  Na aba da Dani, mande: *"Oi Ale, sou eu a Dani!"*.
    * Na tela da Dani: Deve aparecer na **Direita** (Laranja/Verde).
3.  Olhe na aba do Ale.
    * A mensagem da Dani deve aparecer na **Esquerda** (Branco/Cinza).
4.  Responda com o Ale: *"Oi Dani!"*.
    * Na tela do Ale: **Direita**.
    * Na tela da Dani: **Esquerda**.