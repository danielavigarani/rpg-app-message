import { db, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, where, setDoc, getDocs, updateDoc, serverTimestamp } from "./firebase.js";

// --- CONFIGURAÇÃO ---
const PLAYER_PROFILE = {
    id: 'max', // ID do jogador (mantido 'max' para compatibilidade)
    name: "Dani",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Max&hairColor=4a312c"
};

const CHARACTERS = {
    // --- COMO ADICIONAR NOVOS PERSONAGENS ---
    // 1. Copie uma linha abaixo (ex: a do Warren).
    // 2. Mude a chave (ex: 'nathan').
    // 3. Mude o nome e o link do avatar.
    // O sistema criará o chat automaticamente se ele não existir no banco.
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
const loginScreen = document.getElementById('login-screen');
const logoutBtn = document.getElementById('logout-btn');
const newChatModal = document.getElementById('new-chat-modal');

let currentUserType = 'player'; // 'player' | 'gm'
let currentChatId = null;
let currentSenderId = null;
let currentUserCode = null;
let unsubscribeMessages = null;
let unsubscribeChats = null;

// Inicialização
async function init() {
    await checkAndSeedAccessCodes();
    
    // Auto-Login (Persistência)
    const savedCode = localStorage.getItem('rpg_access_code');
    if (savedCode) {
        checkAccessCode(savedCode, true);
    } else {
        loginScreen.style.display = 'flex';
    }

    setupTheme();
    
    // Listeners
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            loginScreen.classList.remove('fade-out');
            loginScreen.style.display = 'flex';
            loginScreen.style.pointerEvents = 'auto';
            document.getElementById('access-code-input').value = '';
            currentUserCode = null;
            currentUserType = null;
            localStorage.removeItem('rpg_access_code'); // Limpar sessão
        });
    }

    const loginInput = document.getElementById('access-code-input');
    if(loginInput) {
        loginInput.focus();
        loginInput.addEventListener('input', (e) => {
            if (e.target.value.length === 4) checkAccessCode(e.target.value);
        });
    }

    // Funcionalidades da Sidebar
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    
    // Modal Listeners
    document.getElementById('new-chat-btn').addEventListener('click', openNewChatModal);
    document.getElementById('cancel-modal-btn').addEventListener('click', closeNewChatModal);
    document.getElementById('confirm-add-btn').addEventListener('click', addNewContact);
    
    // Expor switchTab globalmente
    window.switchTab = switchTab;

    document.getElementById('search-input').addEventListener('input', filterChats);

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
}

// --- SISTEMA DE LOGIN (Fase 11) ---
async function checkAccessCode(code, skipAnimation = false) {
    const q = query(collection(db, "access_codes"), where("code", "==", code));
    const snapshot = await getDocs(q);
    const errorMsg = document.getElementById('login-error');
    
    if (!snapshot.empty) {
        // Sucesso
        const data = snapshot.docs[0].data();
        currentUserCode = code; // Salva o código para usar nos participantes
        selectPersona(data.type);
        localStorage.setItem('rpg_access_code', code); // Salvar sessão
        
        if (skipAnimation) {
            loginScreen.style.display = 'none';
        } else {
            loginScreen.classList.add('fade-out');
            setTimeout(() => loginScreen.style.display = 'none', 500);
        }
        loadChatList();
    } else {
        // Erro
        const input = document.getElementById('access-code-input');
        input.classList.add('shake');
        setTimeout(() => input.classList.remove('shake'), 500);
        
        errorMsg.style.opacity = '1';
        input.value = '';
        setTimeout(() => errorMsg.style.opacity = '0', 2000);
    }
}

async function checkAndSeedAccessCodes() {
    const q = query(collection(db, "access_codes"));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        await addDoc(collection(db, "access_codes"), {
            code: '8579',
            type: 'player',
            name: PLAYER_PROFILE.name,
            avatar: PLAYER_PROFILE.avatar
        });
        await addDoc(collection(db, "access_codes"), {
            code: '0000',
            type: 'gm',
            name: 'Mestre'
        });
        await addDoc(collection(db, "access_codes"), {
            code: '1111',
            type: 'player',
            name: 'Ale',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ale'
        });
    }
}

// --- SISTEMA DE PERSONA (Fase 5) ---
function selectPersona(type) {
    currentUserType = type;

    // Configurar Interface baseada no papel
    const sendBtn = document.getElementById('send-btn');

    if (type === 'player') {
        // Modo PLAYER
        sendBtn.style.color = 'var(--primary-accent)';
        document.getElementById('current-char-avatar').style.cursor = 'default';
    } else {
        // Modo MESTRE
        sendBtn.style.color = '#a855f7';
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
            { id: 'warren', name: 'Warren Graham', avatar: CHARACTERS.warren.avatar, lastMessage: '...', lastTime: new Date() },
            { id: 'victoria', name: 'Victoria Chase', avatar: CHARACTERS.victoria.avatar, lastMessage: '...', lastTime: new Date() }
        ];
        for (const seed of seeds) {
            const { id, ...data } = seed;
            // Adiciona participantes padrão (todos veem os seeds iniciais para teste, ou apenas GM)
            data.participants = ['8579', '0000']; 
            await setDoc(doc(db, "chats", id), data);
        }
    }
}

function loadChatList() {
    if (unsubscribeChats) unsubscribeChats();
    const container = document.getElementById('chat-list-container');
    
    let q;
    if (currentUserType === 'gm') {
        // Mestre vê tudo
        q = query(collection(db, "chats"), orderBy("lastTime", "desc"));
    } else {
        // Jogador vê apenas onde é participante
        // Nota: Isso requer um índice composto no Firebase (participants + lastTime)
        q = query(collection(db, "chats"), where("participants", "array-contains", currentUserCode), orderBy("lastTime", "desc"));
    }
    
    unsubscribeChats = onSnapshot(q, (snapshot) => {
        container.innerHTML = '';
        snapshot.forEach(docSnap => {
            const chat = docSnap.data();
            const chatId = docSnap.id;
            
            const el = document.createElement('div');
            el.className = `chat-item flex items-center p-3 cursor-pointer border-b border-[var(--border-color)] transition-colors gap-3 ${currentChatId === chatId ? 'bg-[var(--header-bg)]' : ''}`;
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
    }, (error) => {
        console.error("Erro ao carregar chats:", error);
        if (error.code === 'failed-precondition') {
            alert("⚠️ ATENÇÃO MESTRE/DEV: O Firebase precisa de um Índice para esta consulta.\n\nAbra o Console do Navegador (F12), procure o link vermelho de erro do Firebase e clique nele para criar o índice automaticamente.");
        }
    });
}

// --- MODAL & NOVO CONTATO ---
function openNewChatModal() {
    newChatModal.classList.remove('hidden');
    // Pequeno delay para permitir a transição de opacidade
    setTimeout(() => {
        newChatModal.classList.remove('opacity-0');
        newChatModal.firstElementChild.classList.remove('scale-90');
        newChatModal.firstElementChild.classList.add('scale-100');
    }, 10);
    document.getElementById('npc-name-input').focus();
}

function closeNewChatModal() {
    newChatModal.classList.add('opacity-0');
    newChatModal.firstElementChild.classList.remove('scale-100');
    newChatModal.firstElementChild.classList.add('scale-90');
    setTimeout(() => {
        newChatModal.classList.add('hidden');
    }, 300);
}

function switchTab(tab) {
    const btnNpc = document.getElementById('tab-npc');
    const btnPlayer = document.getElementById('tab-player');
    const inputNpc = document.getElementById('input-npc');
    const inputPlayer = document.getElementById('input-player');

    if (tab === 'npc') {
        btnNpc.style.backgroundColor = 'var(--primary-accent)';
        btnNpc.style.color = 'var(--app-bg)';
        btnPlayer.style.backgroundColor = 'transparent';
        btnPlayer.style.color = 'var(--text-secondary)';
        inputNpc.classList.remove('hidden');
        inputPlayer.classList.add('hidden');
    } else {
        btnPlayer.style.backgroundColor = 'var(--primary-accent)';
        btnPlayer.style.color = 'var(--app-bg)';
        btnNpc.style.backgroundColor = 'transparent';
        btnNpc.style.color = 'var(--text-secondary)';
        inputPlayer.classList.remove('hidden');
        inputNpc.classList.add('hidden');
    }
}

async function addNewContact() {
    const isNpc = !document.getElementById('input-npc').classList.contains('hidden');
    
    if (isNpc) {
        // MODO NPC
        const name = document.getElementById('npc-name-input').value.trim();
        if (!name) return;
        
        // Verificar duplicidade (Nome)
        const q = query(collection(db, "chats"), where("participants", "array-contains", currentUserCode));
        const snapshot = await getDocs(q);
        let existingChat = null;
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.name && data.name.toLowerCase() === name.toLowerCase()) {
                existingChat = { id: doc.id, ...data };
            }
        });

        if (existingChat) {
            openChat(existingChat.id, existingChat);
        } else {
            await addDoc(collection(db, "chats"), {
                name: name,
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
                lastMessage: "Novo contato adicionado",
                lastTime: serverTimestamp(),
                participants: [currentUserCode, '0000'] // Eu + Mestre
            });
        }
    } else {
        // MODO JOGADOR
        const code = document.getElementById('player-code-input').value.trim();
        if (!code) return;

        if (code === currentUserCode) {
            alert("Você não pode adicionar a si mesmo.");
            return;
        }

        // Verificar se código existe
        const q = query(collection(db, "access_codes"), where("code", "==", code));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const targetData = snapshot.docs[0].data();
            
            // Verificar duplicidade (Participantes)
            const qChats = query(collection(db, "chats"), where("participants", "array-contains", currentUserCode));
            const snapshotChats = await getDocs(qChats);
            let existingChat = null;

            snapshotChats.forEach(doc => {
                const data = doc.data();
                if (data.participants && data.participants.includes(code)) {
                    existingChat = { id: doc.id, ...data };
                }
            });

            if (existingChat) {
                openChat(existingChat.id, existingChat);
            } else {
                await addDoc(collection(db, "chats"), {
                    name: targetData.name, // Nome do outro jogador
                    avatar: targetData.avatar,
                    lastMessage: "Conexão estabelecida",
                    lastTime: serverTimestamp(),
                    participants: [currentUserCode, code, '0000'] // Eu + Ele + Mestre
                });
            }
        } else {
            alert("Código de jogador não encontrado!");
            return;
        }
    }
    
    // Limpar e fechar
    document.getElementById('npc-name-input').value = '';
    document.getElementById('player-code-input').value = '';
    closeNewChatModal();
}

function filterChats(e) {
    const term = e.target.value.toLowerCase();
    const items = document.querySelectorAll('.chat-item');
    items.forEach(item => {
        const name = item.querySelector('h3').textContent.toLowerCase();
        item.style.display = name.includes(term) ? 'flex' : 'none';
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
        currentSenderId = currentUserCode;
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
        let lastDate = null;
        
        if(snapshot.empty) {
            console.log("Nenhuma mensagem encontrada para este chat.");
            // Opcional: Mostrar aviso de "Comece a conversa"
        }

        snapshot.forEach(docSnap => {
            const msg = docSnap.data();
            
            // Separadores de Data
            if (msg.createdAt) {
                const date = msg.createdAt.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt);
                const dateStr = date.toLocaleDateString();
                
                if (dateStr !== lastDate) {
                    const divider = document.createElement('div');
                    divider.className = 'date-divider';
                    
                    const today = new Date().toLocaleDateString();
                    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();
                    
                    if (dateStr === today) divider.textContent = "Hoje";
                    else if (dateStr === yesterday) divider.textContent = "Ontem";
                    else divider.textContent = dateStr;

                    messageContainer.appendChild(divider);
                    lastDate = dateStr;
                }
            }

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
    
    // LÓGICA DE ALINHAMENTO (v17.0):
    let isMe = false;

    if (currentUserType === 'player') {
        isMe = (data.characterId === currentUserCode);
    } else {
        isMe = (data.characterId === currentChatId);
    }
    
    let timeStr = '';
    if (data.createdAt) {
        const date = data.createdAt.toDate ? data.createdAt.toDate() : new Date();
        timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    const wrapper = document.createElement('div');
    // Flex direction column para alinhar corretamente
    wrapper.className = `flex w-full mb-2 ${isMe ? 'justify-end' : 'justify-start'}`;
    
    const bubbleClass = isMe ? 'bubble-right' : 'bubble-left';

    // Detecção de Imagem (Polaroid)
    const isImage = data.text.match(/^https?:\/\/.*\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i);
    
    let contentHtml;
    if (isImage) {
        contentHtml = `
        <div class="p-2 bg-white shadow-md rotate-1 transform transition hover:rotate-0 hover:scale-105 duration-300 w-fit max-w-full rounded-sm mt-1 mb-1">
            <img src="${data.text}" class="max-w-[200px] h-auto object-cover border border-gray-200 block" alt="Imagem">
        </div>`;
    } else {
        contentHtml = `<div class="leading-relaxed whitespace-pre-wrap select-text">${data.text}</div>`;
    }

    // REMOVER classes como 'text-gray-800' ou 'dark:text-gray-100' daqui!
    // Usar apenas cores herdadas do CSS.
    wrapper.innerHTML = `
        <div class="relative max-w-[85%] md:max-w-[65%] ${bubbleClass} px-3 py-2 text-sm shadow-sm group min-w-[80px]">
            ${contentHtml}
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