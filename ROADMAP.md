# 🦋 Life is Strange Messenger - Guia de Desenvolvimento

## 📌 Visão Geral
Aplicação de chat "Roleplay" com estética Life is Strange. Permite que Jogador e Mestre troquem mensagens em tempo real assumindo diferentes personas (Max, Chloe, NPCs).

## 🛠️ Stack Tecnológica
- **Frontend:** HTML5, Tailwind CSS, Vanilla JS (Modules).
- **Backend:** Firebase Firestore (NoSQL, Serverless).
- **Assets:** Google Fonts (Caveat, Permanent Marker), DiceBear API (Avatares).

---

## 📅 Status do Projeto

### ✅ Fase 1: Fundação (Concluído)
- [x] Estrutura HTML/CSS limpa (Mobile-first).
- [x] Estética "Scrapbook/Grunge" (Fontes, Cores, Texturas).
- [x] Layout responsivo.

### ✅ Fase 2: Conexão Real-Time (Concluído)
- [x] Configuração do Firebase Project.
- [x] Implementação do `firebase.js` (Conexão).
- [x] Lógica de Envio (`addDoc`) e Escuta (`onSnapshot`) no `script.js`.
- [x] Exclusão de mensagens.

### 🔄 Fase 3: Sistema de Personagens (EM ANDAMENTO)
- [x] **Dicionário de Personagens:** Criar objeto JS com configurações (Nome, Avatar, Lado da tela).
- [x] **Seletor de UI:** Substituir Radio Buttons por Dropdown (`<select>`).
- [ ] **Renderização Dinâmica:** O chat deve pintar o balão e o avatar baseando-se no ID do personagem, não apenas "Sent/Received".

Agora, substitua os arquivos. A grande mudança é que agora temos uma lista de personagens configurável.

#### `index.html` (Atualizado)
*Mudança principal:* Substituí os Radio Buttons (`input type="radio"`) por um `<select id="char-select">`.

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Life is Strange RPG Messenger</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Open+Sans:ital,wght@0,400;0,600;0,700;1,400&family=Permanent+Marker&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,1,0">
    <link rel="stylesheet" href="style.css">
</head>
<body class="bg-gray-800 h-screen w-screen flex items-center justify-center relative overflow-hidden">

    <div class="absolute inset-0 z-0">
        <img src="https://images.unsplash.com/photo-1517817748493-49ec54a32465?q=80&w=2070&auto=format&fit=crop" class="w-full h-full object-cover opacity-60" alt="Journal Background">
    </div>

    <div class="absolute top-4 left-10 z-10 hidden md:block rotate-[-2deg]">
        <div class="bg-white p-2 shadow-md transform rotate-2 inline-block">
            <h1 class="marker-font text-4xl text-blue-600">My RPG Log</h1>
        </div>
    </div>

    <div class="relative z-20 w-full max-w-4xl h-[90vh] md:h-[80vh] bg-black rounded-[2.5rem] p-3 shadow-2xl border-4 border-gray-900 flex flex-col transform md:-rotate-1 transition-transform duration-500">
        
        <div class="bg-white w-full h-full rounded-[2rem] overflow-hidden flex flex-col relative">
            
            <div class="bg-orange-500 h-16 flex items-center justify-between px-4 text-white shadow-md z-30 shrink-0">
                <div class="flex items-center space-x-2">
                    <span class="material-symbols-outlined text-3xl cursor-pointer hover:bg-orange-600 rounded-full p-1">arrow_back</span>
                    <span class="font-bold text-xl tracking-wide marker-font">Blackwell Academy</span>
                </div>
                <div class="flex items-center space-x-3">
                    <span class="material-symbols-outlined">wifi</span>
                    <span class="material-symbols-outlined">battery_full</span>
                </div>
            </div>

            <div id="message-container" class="flex-1 bg-white p-4 overflow-y-auto message-scroll space-y-6 pb-24">
                </div>

            <button onclick="toggleModal()" class="absolute bottom-6 right-6 bg-orange-600 hover:bg-orange-700 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 z-40 group">
                <span class="material-symbols-outlined text-3xl group-hover:rotate-90 transition-transform">add</span>
            </button>
        </div>
    </div>

    <div id="input-modal" class="fixed inset-0 bg-black/60 backdrop-blur-sm hidden z-50 flex items-center justify-center p-4">
        <div class="bg-[#fdfbf7] w-full max-w-md p-6 rounded shadow-2xl transform rotate-1 relative border border-gray-300 scrap-paper">
            
            <div class="absolute -top-3 left-1/2 transform -translate-x-1/2 w-32 h-8 bg-yellow-200/80 rotate-1 shadow-sm"></div>

            <h2 class="handwritten text-4xl text-gray-800 mb-6 text-center">Nova Mensagem</h2>
            
            <form id="message-form" class="space-y-4">
                
                <div>
                    <label class="block handwritten text-2xl text-gray-600 mb-1">Quem fala?</label>
                    <select id="char-select" class="w-full bg-transparent border-b-2 border-orange-500 focus:outline-none p-2 font-bold text-gray-800 cursor-pointer">
                        </select>
                </div>

                <textarea id="msg-text" required rows="3" class="w-full bg-transparent border-b-2 border-gray-300 focus:border-orange-500 outline-none p-2 font-sans resize-none text-lg" placeholder="Digite aqui..."></textarea>

                <div class="grid grid-cols-2 gap-4">
                    <input type="text" id="msg-date" class="bg-transparent border-b-2 border-gray-300 outline-none p-2 font-mono text-sm" placeholder="Data">
                    <input type="time" id="msg-time" class="bg-transparent border-b-2 border-gray-300 outline-none p-2 font-mono text-sm">
                </div>

                <div class="flex justify-between items-center mt-6">
                    <button type="button" onclick="toggleModal()" class="handwritten text-2xl text-gray-500 hover:text-red-500">Cancelar</button>
                    <button type="submit" class="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-6 rounded shadow-md transform hover:-translate-y-1 transition-transform">
                        Enviar
                    </button>
                </div>
            </form>
        </div>
    </div>

    <script type="module" src="script.js"></script>
</body>
</html>

script.js {import { db, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc } from "./firebase.js";

// --- CONFIGURAÇÃO DE PERSONAGENS (Fase 3) ---
// Adicione quantos quiser aqui!
const CHARACTERS = {
    max: { 
        name: "Max", 
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Max&hairColor=4a312c&clothing=graphicShirt", 
        side: "right" // Lado do "Jogador" (Balão Branco)
    },
    chloe: { 
        name: "Chloe", 
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Chloe&hairColor=2c1b18&top=longHair", 
        side: "left"  // Lado do "NPC" (Balão Laranja)
    },
    warren: { 
        name: "Warren", 
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Warren", 
        side: "left" 
    },
    victoria: { 
        name: "Victoria", 
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Victoria&hairColor=fdd835", 
        side: "left" 
    },
    wells: { 
        name: "Diretor Wells", 
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Wells&facialHair=mustache", 
        side: "left" 
    }
};

const container = document.getElementById('message-container');
const modal = document.getElementById('input-modal');
const form = document.getElementById('message-form');
const charSelect = document.getElementById('char-select');

// --- INICIALIZAÇÃO ---

// 1. Preencher o Dropdown de Personagens automaticamente
function populateCharacterSelect() {
    charSelect.innerHTML = '';
    for (const [key, char] of Object.entries(CHARACTERS)) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = char.name;
        charSelect.appendChild(option);
    }
}

// 2. Enviar Mensagem para o Firebase
async function sendMessageToCloud(text, date, time, characterId) {
    try {
        await addDoc(collection(db, "messages"), {
            text: text,
            date: date,
            time: time,
            characterId: characterId, // Salvamos QUEM falou
            createdAt: new Date()
        });
    } catch (e) {
        console.error("Erro envio:", e);
        alert("Erro ao enviar mensagem.");
    }
}

// 3. Escutar Mensagens
function listenToMessages() {
    const q = query(collection(db, "messages"), orderBy("createdAt"));

    onSnapshot(q, (snapshot) => {
        container.innerHTML = ''; 
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            // Passamos o ID do personagem para a função de criar elemento
            container.appendChild(createMessageElement(data.text, data.time, data.date, data.characterId, docSnap.id));
        });
        container.scrollTop = container.scrollHeight;
    });
}

// 4. Deletar Mensagem
window.deleteMessage = async function(id) {
    if(confirm("Deseja rebobinar e apagar esta mensagem?")) {
        await deleteDoc(doc(db, "messages", id));
    }
}

// --- UI HELPERS ---

window.toggleModal = function() {
    modal.classList.toggle('hidden');
    if (!modal.classList.contains('hidden')) {
        const now = new Date();
        document.getElementById('msg-date').value = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}`;
        document.getElementById('msg-time').value = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        document.getElementById('msg-text').focus();
    }
}

function createMessageElement(text, time, date, characterId, docId) {
    // Busca a config do personagem ou usa Chloe como fallback se der erro
    const charConfig = CHARACTERS[characterId] || CHARACTERS['chloe'];
    const isSelf = charConfig.side === 'right'; // Define o lado baseado na config

    const wrapper = document.createElement('div');
    wrapper.className = `flex items-start w-full animate-pop ${isSelf ? 'justify-end' : ''}`;
    
    const timestamp = `${date} - ${time}`;

    // Botão de deletar
    const deleteBtn = `<button onclick="deleteMessage('${docId}')" class="absolute -top-2 ${!isSelf ? '-right-2' : '-left-2'} bg-red-500 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pb-0.5 z-50">×</button>`;

    // Define estilos baseados no lado
    let bubbleClass = '';
    if (!isSelf) {
        // NPC (Esquerda)
        bubbleClass = 'bg-orange-500 text-white bubble-left';
    } else {
        // Player/Max (Direita)
        bubbleClass = 'bg-white text-gray-800 border-2 border-orange-500 bubble-right';
    }

    // HTML do Conteúdo
    const content = `
        <div class="relative ${bubbleClass} p-4 rounded-lg shadow-sm max-w-[75%] group">
            <p class="text-xs font-bold mb-1 opacity-70 uppercase tracking-wider">${charConfig.name}</p>
            <p class="text-lg leading-snug whitespace-pre-wrap">${text}</p>
            <span class="block text-right text-xs mt-1 opacity-80 font-mono">${timestamp}</span>
            ${deleteBtn}
        </div>`;

    // Montagem Final
    if (!isSelf) {
        wrapper.innerHTML = `
            <div class="w-12 h-12 rounded-full border-2 border-white bg-gray-300 overflow-hidden mr-3 shadow-sm flex-shrink-0">
                 <img src="${charConfig.avatar}" class="w-full h-full object-cover" title="${charConfig.name}">
            </div>
            ${content}`;
    } else {
        wrapper.innerHTML = `
            ${content}
            <div class="w-12 h-12 rounded-full border-2 border-orange-500 bg-gray-100 overflow-hidden ml-3 shadow-sm flex-shrink-0">
                <img src="${charConfig.avatar}" class="w-full h-full object-cover" title="${charConfig.name}">
            </div>`;
    }
    return wrapper;
}

// --- EVENT LISTENER ---

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = document.getElementById('msg-text').value;
    const date = document.getElementById('msg-date').value;
    const time = document.getElementById('msg-time').value;
    const charId = document.getElementById('char-select').value; // Pega o valor do dropdown

    await sendMessageToCloud(text, date, time, charId);
    
    form.reset();
    toggleModal();
});

// Inicializa tudo
populateCharacterSelect();
listenToMessages();}

### ⏳ Fase 4: Polimento e Deploy (Futuro)
- [ ] Upload de imagens (Polaroids).
- [ ] Sons de notificação.
- [ ] Deploy no Vercel/GitHub Pages.

---

## 🧠 Lógica do Sistema de Personagens (Referência para IA)
O sistema não usa login de usuário. Ele usa um seletor de "Quem está falando?".
- **Estrutura de Dados no Firebase:**
  ```json
  {
    "text": "Olá",
    "characterId": "chloe", (Define quem falou)
    "date": "10/10",
    "createdAt": Timestamp
  }