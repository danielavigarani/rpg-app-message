import { db, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, where, setDoc, getDocs, updateDoc, serverTimestamp } from "./firebase.js";

// --- CONFIGURAÇÃO ---
const CHARACTERS = {
    max: { name: "Max", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Max&hairColor=4a312c&clothing=graphicShirt", side: "right" },
    chloe: { name: "Chloe", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Chloe&hairColor=2c1b18&top=longHair", side: "left" },
    warren: { name: "Warren", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Warren", side: "left" },
    victoria: { name: "Victoria", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Victoria&hairColor=fdd835", side: "left" },
    wells: { name: "Diretor Wells", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Wells&facialHair=mustache", side: "left" }
};

// Elementos
const messageContainer = document.getElementById('message-container');
const charSelect = document.getElementById('char-select');
const currentCharAvatar = document.getElementById('current-char-avatar');
const msgInput = document.getElementById('msg-input');
const chatContent = document.getElementById('chat-content');
const emptyState = document.getElementById('empty-state');
const chatArea = document.getElementById('chat-area');
const sidebar = document.getElementById('sidebar');

let currentChatId = null;
let unsubscribeMessages = null;

// Inicialização
async function init() {
    setupTheme();
    setupAvatarSelector();
    
    // Listeners
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('back-btn').addEventListener('click', closeChatMobile);
    document.getElementById('send-btn').addEventListener('click', sendMessage);
    
    msgInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    await checkAndSeedChats();
    loadChatList();
}

// --- BANCO DE DADOS ---
async function checkAndSeedChats() {
    const q = query(collection(db, "chats"));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        const seeds = [
            { id: 'chloe', name: 'Chloe Price', avatar: CHARACTERS.chloe.avatar, lastMessage: 'Ei, Max!', lastTime: new Date() },
            { id: 'warren', name: 'Warren Graham', avatar: CHARACTERS.warren.avatar, lastMessage: '...', lastTime: new Date() }
        ];
        for (const seed of seeds) {
            const { id, ...data } = seed;
            await setDoc(doc(db, "chats", id), data);
        }
    }
}

function loadChatList() {
    const container = document.getElementById('chat-list-container');
    const q = query(collection(db, "chats"), orderBy("lastTime", "desc"));
    
    onSnapshot(q, (snapshot) => {
        container.innerHTML = '';
        snapshot.forEach(docSnap => {
            const chat = docSnap.data();
            const chatId = docSnap.id;
            
            const el = document.createElement('div');
            el.className = `chat-item flex items-center p-3 cursor-pointer border-b border-gray-500/10 transition-colors gap-3 ${currentChatId === chatId ? 'active' : ''}`;
            el.onclick = () => openChat(chatId, chat);
            
            let timeStr = '';
            if (chat.lastTime) {
                const date = chat.lastTime.toDate ? chat.lastTime.toDate() : new Date(chat.lastTime);
                timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            }

            el.innerHTML = `
                <img src="${chat.avatar}" class="w-12 h-12 rounded-full object-cover bg-gray-300">
                <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-baseline">
                        <h3 class="font-bold text-sm truncate" style="color: var(--text-primary)">${chat.name}</h3>
                        <span class="text-xs opacity-60 font-mono">${timeStr}</span>
                    </div>
                    <p class="text-xs opacity-80 truncate" style="color: var(--text-secondary)">${chat.lastMessage || '...'}</p>
                </div>
            `;
            container.appendChild(el);
        });
    });
}

function openChat(chatId, chatData) {
    currentChatId = chatId;
    document.getElementById('chat-header-name').textContent = chatData.name;
    document.getElementById('chat-header-avatar').src = chatData.avatar;
    
    // UI Transitions - CORREÇÃO AQUI
    emptyState.classList.add('hidden');
    chatContent.classList.remove('hidden');
    chatContent.classList.add('flex'); // Garante display: flex via Tailwind

    
    if (window.innerWidth < 768) {
        sidebar.classList.add('-translate-x-full');
        chatArea.classList.remove('translate-x-full');
    }

    loadMessages(chatId);
}

function closeChatMobile() {
    currentChatId = null;
    if (unsubscribeMessages) unsubscribeMessages();
    sidebar.classList.remove('-translate-x-full');
    chatArea.classList.add('translate-x-full');
    
    // Opcional: Voltar para empty state no desktop
    setTimeout(() => {
        chatContent.classList.add('hidden');
        chatContent.classList.remove('flex');
        emptyState.classList.remove('hidden');
    }, 300);
}

function loadMessages(chatId) {
    if (unsubscribeMessages) unsubscribeMessages();

    // Query para pegar as mensagens DO CHAT ATUAL
    const q = query(
        collection(db, "messages"), 
        where("chatId", "==", chatId), 
        orderBy("createdAt", "asc")
    );

    unsubscribeMessages = onSnapshot(q, (snapshot) => {
        messageContainer.innerHTML = '';
        
        if(snapshot.empty) {
            console.log("Nenhuma mensagem encontrada para este chat.");
            // Opcional: Mostrar aviso de "Comece a conversa"
        }

        snapshot.forEach(docSnap => {
            const msg = docSnap.data();
            messageContainer.appendChild(createMessageElement(msg, docSnap.id));
        });
        
        // Rola para o final
        messageContainer.scrollTop = messageContainer.scrollHeight;
    }, (error) => {
        console.error("Erro ao carregar mensagens:", error);
        if (error.code === 'failed-precondition') {
            alert("ERRO DE ÍNDICE FIREBASE: Abra o console do navegador (F12), procure pelo link de erro do Firebase e clique nele para criar o índice necessário.");
        }
    });
}

async function sendMessage() {
    const text = msgInput.value.trim();
    if (!text || !currentChatId) return;

    const charId = charSelect.value;
    
    // 1. Salva a mensagem
    await addDoc(collection(db, "messages"), {
        text, 
        characterId: charId, 
        chatId: currentChatId, 
        createdAt: serverTimestamp()
    });

    // 2. Atualiza o chat na lista lateral
    await updateDoc(doc(db, "chats", currentChatId), {
        lastMessage: text, 
        lastTime: serverTimestamp()
    });

    msgInput.value = '';
}

function createMessageElement(data, docId) {
    const charConfig = CHARACTERS[data.characterId] || CHARACTERS['chloe'];
    const isSelf = charConfig.side === 'right';
    
    let timeStr = '';
    if (data.createdAt) {
        const date = data.createdAt.toDate ? data.createdAt.toDate() : new Date();
        timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    const wrapper = document.createElement('div');
    // Flex direction column para alinhar corretamente
    wrapper.className = `flex w-full ${isSelf ? 'justify-end' : 'justify-start'} mb-1`;
    
    const bubbleClass = isSelf ? 'bubble-right' : 'bubble-left';
    
    const nameLabel = !isSelf ? `<div class="text-[10px] font-bold uppercase tracking-wide mb-0.5 opacity-80" style="color: var(--primary-accent)">${charConfig.name}</div>` : '';

    wrapper.innerHTML = `
        <div class="relative max-w-[85%] md:max-w-[65%] ${bubbleClass} px-3 py-2 text-sm shadow-sm group min-w-[80px]">
            ${nameLabel}
            <div class="leading-relaxed whitespace-pre-wrap">${data.text}</div>
            <div class="flex justify-end items-center gap-1 mt-0.5 select-none opacity-70">
                <span class="text-[10px] font-mono">${timeStr}</span>
                <button onclick="window.deleteMessage('${docId}')" class="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 ml-1 cursor-pointer" title="Apagar">
                    <span class="material-symbols-outlined text-[14px]">delete</span>
                </button>
            </div>
        </div>
    `;
    return wrapper;
}

window.deleteMessage = async (id) => {
    if(confirm("Apagar mensagem?")) await deleteDoc(doc(db, "messages", id));
};

function setupAvatarSelector() {
    charSelect.innerHTML = '';
    for (const [key, char] of Object.entries(CHARACTERS)) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = char.name;
        charSelect.appendChild(option);
    }
    charSelect.addEventListener('change', () => {
        const char = CHARACTERS[charSelect.value];
        currentCharAvatar.src = char.avatar;
    });
    // Set default
    charSelect.value = 'max';
    currentCharAvatar.src = CHARACTERS['max'].avatar;
}

function setupTheme() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
        document.body.classList.add('dark-theme');
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
}

init();