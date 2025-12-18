## 🧠 6. Inteligência de Exibição de Nomes (Correção Final)
**Problema:** Jogadores viam todos os contatos como "Mestre" porque o GM participa de todos os chats.
**Solução:** Refinar a lógica de exibição.

### A. Lógica "Quem é Quem"
* Criar função helper `getChatDisplayName(chat, myCode, myType)`:
    * Se `myType == 'gm'`: Retorna `chat.name`.
    * Se `myType == 'player'`:
        * Filtra os participantes removendo Eu (`myCode`) e o GM ('0000').
        * Se sobrar alguém (ex: 'chloe', 'ale'): Retorna `chat.name` (ou o nome desse terceiro).
        * Se não sobrar ninguém (array vazio): Significa que é o chat privado com o GM. Retorna "Mestre".