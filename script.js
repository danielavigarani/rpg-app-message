import { db, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, where, setDoc, getDocs, updateDoc, serverTimestamp } from "./firebase.js";

// --- CONFIGURAÇÃO ---
const PLAYER_PROFILE = {
    id: 'max', // ID do jogador (mantido 'max' para compatibilidade)
    name: "Dani",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Max&hairColor=4a312c"
};

const CHARACTERS = {
    [PLAYER_PROFILE.id]: { name: PLAYER_PROFILE.name, avatar: PLAYER_PROFILE.avatar, side: "right" },
    chloe: { name: "Chloe", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Chloe&hairColor=2c1b18&top=longHair", side: "left" },
    warren: { name: "Warren", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Warren", side: "left" },
    victoria: { name: "Victoria", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Victoria&hairColor=fdd835", side: "left" },
    wells: { name: "Diretor Wells", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Wells&facialHair=mustache", side: "left" }
};

// Elementos
const messageContainer = document.getElementById('message-container');
const currentCharAvatar = document.getElementById('current-char-avatar');
const msgInput = document.getElementById('msg-input');
const chatContent = document.getElementById('chat-content');
const emptyState = document.getElementById('empty-state');
const chatArea = document.getElementById('chat-area');
const sidebar = document.getElementById('sidebar');
const profileScreen = document.getElementById('profile-selection-screen');
const logoutBtn = document.getElementById('logout-btn');

let currentUserType = 'player'; // 'player' | 'gm'
let currentChatId = null;
let currentSenderId = null;
let unsubscribeMessages = null;

// Inicialização
async function init() {
    setupTheme();
    
    // Listeners
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            profileScreen.classList.remove('fade-out');
            profileScreen.style.pointerEvents = 'auto';
            currentUserType = null;
        });
    }

    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('back-btn').addEventListener('click', closeChatMobile);
    document.getElementById('send-btn').addEventListener('click', sendMessage);
    
    msgInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    msgInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 100) + 'px';
    });

    // Expor função globalmente para o HTML chamar
    window.selectPersona = selectPersona;

    await checkAndSeedChats();
    loadChatList();
}

// --- SISTEMA DE PERSONA (Fase 5) ---
function selectPersona(type) {
    currentUserType = type;
    
    // Animação de saída
    profileScreen.classList.add('fade-out');
    profileScreen.style.pointerEvents = 'none';

    // Configurar Interface baseada no papel
    const sendBtn = document.getElementById('send-btn');

    if (type === 'player') {
        // Modo PLAYER
        // Visual
        sendBtn.style.backgroundColor = 'var(--primary-accent)'; // Laranja
        document.getElementById('current-char-avatar').style.cursor = 'default';
    } else {
        // Modo MESTRE
        // Visual
        sendBtn.style.backgroundColor = '#a855f7';
        document.getElementById('current-char-avatar').style.cursor = 'default';
    }
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
    chatContent.style.display = 'flex'; // Forçar display
    chatContent.classList.add('flex', 'flex-col'); // <--- CRUCIAL: flex-col

    
    if (window.innerWidth < 768) {
        sidebar.classList.add('-translate-x-full');
        chatArea.classList.remove('translate-x-full');
    }

    // Identidade Automática (Fase 7)
    if (currentUserType === 'gm') {
        currentSenderId = chatId;
        currentCharAvatar.src = chatData.avatar;
    } else {
        currentSenderId = PLAYER_PROFILE.id;
        currentCharAvatar.src = PLAYER_PROFILE.avatar;
    }

    loadChatList(); 
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
        chatContent.classList.remove('flex', 'flex-col');
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
        setTimeout(() => {
            messageContainer.scrollTo({ top: messageContainer.scrollHeight, behavior: 'smooth' });
        }, 100);
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

    // 1. Salva a mensagem
    await addDoc(collection(db, "messages"), {
        text, 
        characterId: currentSenderId, 
        chatId: currentChatId, 
        createdAt: serverTimestamp()
    });

    // 2. Atualiza o chat na lista lateral
    await updateDoc(doc(db, "chats", currentChatId), {
        lastMessage: text, 
        lastTime: serverTimestamp()
    });

    msgInput.value = '';
    msgInput.style.height = 'auto';
    msgInput.focus();
}

function createMessageElement(data, docId) {
    const charConfig = CHARACTERS[data.characterId] || CHARACTERS['chloe'];
    
    // REGRA DE OURO: Se o personagem for o Player, é Direita. Todos os outros são Esquerda.
    const isPlayer = data.characterId === PLAYER_PROFILE.id;
    
    let timeStr = '';
    if (data.createdAt) {
        const date = data.createdAt.toDate ? data.createdAt.toDate() : new Date();
        timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    const wrapper = document.createElement('div');
    // Flex direction column para alinhar corretamente
    wrapper.className = `flex w-full mb-2 ${isPlayer ? 'justify-end' : 'justify-start'}`;
    
    const bubbleClass = isPlayer ? 'bubble-right' : 'bubble-left';

    // REMOVER classes como 'text-gray-800' ou 'dark:text-gray-100' daqui!
    // Usar apenas cores herdadas do CSS.
    wrapper.innerHTML = `
        <div class="relative max-w-[85%] md:max-w-[65%] ${bubbleClass} px-3 py-2 text-sm shadow-sm group min-w-[80px]">
            <div class="leading-relaxed whitespace-pre-wrap select-text">${data.text}</div>
            <div class="flex justify-end items-center gap-1 mt-0.5 select-none opacity-70">
                <span class="text-[10px] font-mono inherit-color">${timeStr}</span>
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