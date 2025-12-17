import { db, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc } from "./firebase.js";

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
listenToMessages();
