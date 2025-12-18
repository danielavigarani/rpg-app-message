# 🟢 WhatsApp RPG - Guia de Privacidade & Modal v13.0

## 🎯 Objetivos
1.  **Privacidade de Dados:** Alterar a consulta do banco para carregar apenas os chats onde o usuário logado é participante. (O Mestre vê todos).
2.  **Modal "Novo Contato":** Criar uma janela sobreposta animada para escolher entre adicionar "Jogador Real" (via código) ou "NPC" (via nome).

---

## 🛠️ Especificações Técnicas

### 1. Banco de Dados (Firestore)
Para que cada um tenha seus contatos, precisamos saber quem participa de cada conversa.
**Alteração na Criação de Chat:**
Adicionar o campo `participants` (Array) em cada documento `chats`.
- Chat NPC: `participants: [ "codigo_do_jogador", "codigo_do_mestre" ]`
- Chat Jogador x Jogador: `participants: [ "codigo_jog_A", "codigo_jog_B", "codigo_do_mestre" ]` (Mestre sempre vê tudo).

**Alteração na Leitura (`loadChatList`):**
- Se `currentUserType == 'gm'`: Carrega **TUDO**.
- Se `currentUserType == 'player'`: Filtra `where("participants", "array-contains", myCode)`.

### 2. UI: Modal Animado (`index.html` e `style.css`)
Substituir o `prompt` nativo por um Modal Customizado.

**Estrutura HTML:**
```html
<div id="new-chat-modal" class="fixed inset-0 z-50 bg-black/80 flex items-center justify-center hidden opacity-0 transition-opacity duration-300">
    <div class="bg-[#202c33] p-6 rounded-2xl w-96 transform scale-90 transition-transform duration-300 shadow-2xl border border-[#00a884]/20">
        <h2 class="text-white text-xl font-bold mb-4 text-center">Novo Contato</h2>
        
        <div class="flex gap-2 mb-4 bg-[#111b21] p-1 rounded-lg">
            <button onclick="switchTab('npc')" class="flex-1 py-2 text-sm rounded-md bg-[#00a884] text-white transition">NPC</button>
            <button onclick="switchTab('player')" class="flex-1 py-2 text-sm rounded-md text-gray-400 hover:text-white transition">Outro Jogador</button>
        </div>

        <div id="input-npc">
            <input type="text" id="npc-name-input" placeholder="Nome do Personagem (ex: Nathan)" class="w-full bg-[#2a3942] text-white p-3 rounded-lg border-none outline-none focus:ring-1 focus:ring-[#00a884]">
        </div>
        <div id="input-player" class="hidden">
            <input type="text" id="player-code-input" placeholder="Código do Jogador (ex: 1234)" class="w-full bg-[#2a3942] text-white p-3 rounded-lg border-none outline-none focus:ring-1 focus:ring-[#00a884]">
        </div>

        <div class="flex justify-end gap-3 mt-6">
            <button id="cancel-modal-btn" class="text-[#00a884] hover:bg-[#2a3942] px-4 py-2 rounded-lg font-bold">Cancelar</button>
            <button id="confirm-add-btn" class="bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] px-6 py-2 rounded-lg font-bold shadow-lg shadow-[#00a884]/20">Adicionar</button>
        </div>
    </div>
</div>

3. Lógica Javascript (script.js)

Função openNewChatModal():

    Remove classe hidden.

    Adiciona classe opacity-100 (Fade In).

Função addNewContact():

    Modo NPC:

        Pega o nome digitado.

        Cria chat no banco com participants: [meuCodigo, codigoMestre].

        Avatar: DiceBear seed = nome.

    Modo Jogador:

        Pega o código digitado.

        Busca na coleção access_codes se esse código existe.

        Se existir: Cria chat com participants: [meuCodigo, codigoDele, codigoMestre].

        Nome do Chat: Nome do Jogador encontrado.

        