import { db, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, where, setDoc, getDocs, updateDoc, serverTimestamp, getDoc } from "./firebase.js";

// --- CONFIGURAÇÃO ---
const PLAYER_PROFILE = {
    id: 'max', // ID do jogador (mantido 'max' para compatibilidade)
    name: "Dani",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Max&hairColor=4a312c"
};

const characterCache = {}; // Cache local para evitar leituras repetidas no Firestore

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
let newCharType = 'npc'; // Controle do formulário de criação

// Inicialização
async function init() {
    await checkAndSeedAccessCodes();
    await checkAndSeedGlobalNPCs(); // Seed da Agenda Global
    
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
            // 1. Resetar Visual do Login (CRUCIAL)
            const input = document.getElementById('access-code-input');
            const spinner = document.getElementById('login-spinner');
            const loginTitle = document.querySelector('#login-screen h1');
            
            // Força o estado inicial
            if(input) {
                input.classList.remove('hidden');
                input.value = '';
            }
            if(spinner) spinner.classList.add('hidden');
            if(loginTitle) loginTitle.classList.remove('hidden');

            // 2. Mostrar a tela
            loginScreen.classList.remove('fade-out');
            loginScreen.style.display = 'flex';
            loginScreen.style.pointerEvents = 'auto';
            
            // 3. Limpar Sessão
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
    document.getElementById('close-modal-btn').addEventListener('click', closeNewChatModal);
    
    // NOVOS LISTENERS (Fase 5 - Híbrido)
    document.getElementById('btn-show-create').addEventListener('click', () => {
        document.getElementById('contacts-view').classList.add('hidden');
        document.getElementById('create-character-view').classList.remove('hidden');
        document.getElementById('modal-title').textContent = "Criar Personagem";
    });

    document.getElementById('btn-cancel-create').addEventListener('click', () => {
        document.getElementById('create-character-view').classList.add('hidden');
        document.getElementById('contacts-view').classList.remove('hidden');
        document.getElementById('modal-title').textContent = "Nova Conversa";
    });

    document.getElementById('type-npc').addEventListener('click', () => {
        newCharType = 'npc';
        updateTypeButtons();
    });

    document.getElementById('type-player').addEventListener('click', () => {
        newCharType = 'player';
        updateTypeButtons();
    });

    document.getElementById('btn-confirm-create').addEventListener('click', createNewCharacter);
    
    document.getElementById('contact-search').addEventListener('input', (e) => {
        renderContactList(e.target.value);
    });

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
    console.log("Tentando logar com código:", code); // Debug
    const errorMsg = document.getElementById('login-error');
    const input = document.getElementById('access-code-input');
    const spinner = document.getElementById('login-spinner');

    // UI Loading State
    input.classList.add('hidden');
    spinner.classList.remove('hidden');
    errorMsg.style.opacity = '0';
    
    try {
        // Consulta ao Firebase
        const q = query(collection(db, "access_codes"), where("code", "==", code));
        const snapshot = await getDocs(q);
        
        console.log("Resposta do Firebase recebida. Vazio?", snapshot.empty); // Debug

        if (!snapshot.empty) {
            // SUCESSO
            const data = snapshot.docs[0].data();
            currentUserCode = code;
            selectPersona(data.type);
            localStorage.setItem('rpg_access_code', code);
            
            if (skipAnimation) {
                loginScreen.style.display = 'none';
            } else {
                loginScreen.classList.add('fade-out');
                setTimeout(() => loginScreen.style.display = 'none', 500);
            }
            loadChatList();
        } else {
            // SENHA ERRADA
            console.warn("Código não encontrado no banco.");
            
            // Restore UI
            spinner.classList.add('hidden');
            input.classList.remove('hidden');
            input.focus();

            input.classList.add('shake');
            setTimeout(() => input.classList.remove('shake'), 500);
            
            errorMsg.style.opacity = '1';
            input.value = '';
            setTimeout(() => errorMsg.style.opacity = '0', 2000);
        }
    } catch (error) {
        // ERRO TÉCNICO (Internet, Permissão, Config)
        console.error("ERRO FATAL NO LOGIN:", error);
        spinner.classList.add('hidden');
        input.classList.remove('hidden');
        alert("Erro ao conectar no banco de dados. Verifique o console (F12) para detalhes.\nErro: " + error.message);
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

async function checkAndSeedGlobalNPCs() {
    const q = query(collection(db, "global_npcs"));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
        const initialNPCs = [
            { id: 'chloe', name: "Chloe Price", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Chloe&hairColor=2c1b18&top=longHair", type: 'npc' },
            { id: 'warren', name: "Warren Graham", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Warren", type: 'npc' },
            { id: 'victoria', name: "Victoria Chase", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Victoria&hairColor=fdd835", type: 'npc' },
            { id: 'wells', name: "Diretor Wells", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Wells&facialHair=mustache", type: 'npc' }
        ];

        for (const npc of initialNPCs) {
            await setDoc(doc(db, "global_npcs", npc.id), npc);
        }
    }
}

// --- HELPER: RESOLVER DADOS DE PERSONAGEM (Fase Refinamento) ---
async function resolveCharacterData(id) {
    // 1. Verifica Cache
    if (characterCache[id]) return characterCache[id];

    // 2. Verifica Global NPCs
    const npcDoc = await getDoc(doc(db, "global_npcs", id));
    if (npcDoc.exists()) {
        const data = npcDoc.data();
        characterCache[id] = data;
        return data;
    }

    // 3. Verifica Access Codes (Players)
    const q = query(collection(db, "access_codes"), where("code", "==", id));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        characterCache[id] = data;
        return data;
    }

    // 4. Fallback (Desconhecido)
    return { 
        name: "Desconhecido", 
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Unknown",
        type: 'unknown'
    };
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
            { id: 'chloe', name: 'Chloe Price', avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Chloe&hairColor=2c1b18&top=longHair", lastMessage: 'Ei, Max!', lastTime: new Date() },
            { id: 'warren', name: 'Warren Graham', avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Warren", lastMessage: '...', lastTime: new Date() },
            { id: 'victoria', name: 'Victoria Chase', avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Victoria&hairColor=fdd835", lastMessage: '...', lastTime: new Date() }
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
            
            // --- CORREÇÃO DE IDENTIDADE (Bug 1) ---
            let displayName = chat.name;
            if (currentUserType === 'player') {
                const otherParticipants = (chat.participants || []).filter(p => p !== currentUserCode && p !== '0000');
                if (otherParticipants.length === 0) {
                    displayName = 'Mestre';
                }
            }

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
                        <h3 class="font-bold text-sm truncate" style="color: var(--text-primary)">${displayName}</h3>
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
async function openNewChatModal() {
    newChatModal.classList.remove('hidden');
    // Reset View
    document.getElementById('contacts-view').classList.remove('hidden');
    document.getElementById('create-character-view').classList.add('hidden');
    document.getElementById('modal-title').textContent = "Nova Conversa";

    // Pequeno delay para permitir a transição de opacidade
    setTimeout(() => {
        newChatModal.classList.remove('opacity-0');
        newChatModal.firstElementChild.classList.remove('scale-90');
        newChatModal.firstElementChild.classList.add('scale-100');
    }, 10);
    
    await renderContactList();
}

function closeNewChatModal() {
    newChatModal.classList.add('opacity-0');
    newChatModal.firstElementChild.classList.remove('scale-100');
    newChatModal.firstElementChild.classList.add('scale-90');
    setTimeout(() => {
        newChatModal.classList.add('hidden');
    }, 300);
}

function updateTypeButtons() {
    const btnNpc = document.getElementById('type-npc');
    const btnPlayer = document.getElementById('type-player');
    const inputCode = document.getElementById('new-char-code');

    if (newCharType === 'npc') {
        btnNpc.style.backgroundColor = 'var(--primary-accent)';
        btnNpc.style.color = 'var(--app-bg)';
        btnPlayer.style.backgroundColor = 'transparent';
        btnPlayer.style.color = 'var(--text-secondary)';
        inputCode.classList.add('hidden');
    } else {
        btnPlayer.style.backgroundColor = 'var(--primary-accent)';
        btnPlayer.style.color = 'var(--app-bg)';
        btnNpc.style.backgroundColor = 'transparent';
        btnNpc.style.color = 'var(--text-secondary)';
        inputCode.classList.remove('hidden');
    }
}

async function createNewCharacter() {
    const name = document.getElementById('new-char-name').value.trim();
    const code = document.getElementById('new-char-code').value.trim();
    
    if (!name) return alert("Nome é obrigatório");
    if (newCharType === 'player' && (!code || code.length !== 4)) return alert("Código de 4 dígitos obrigatório para jogadores");

    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`;
    const btn = document.getElementById('btn-confirm-create');
    const originalText = btn.textContent;
    btn.textContent = "Criando...";
    btn.disabled = true;

    try {
        let newId;
        if (newCharType === 'npc') {
            const docRef = await addDoc(collection(db, "global_npcs"), {
                name,
                avatar,
                type: 'npc'
            });
            newId = docRef.id;
        } else {
            // Check if code exists
             const q = query(collection(db, "access_codes"), where("code", "==", code));
             const snap = await getDocs(q);
             if (!snap.empty) {
                 alert("Este código já está em uso!");
                 btn.textContent = originalText;
                 btn.disabled = false;
                 return;
             }

            await addDoc(collection(db, "access_codes"), {
                name,
                avatar,
                code,
                type: 'player'
            });
            newId = code;
        }

        const contactData = { id: newId, name, avatar, isPlayer: (newCharType === 'player') };
        allContactsCache.push(contactData); // Atualiza cache local
        await handleContactSelection(contactData); // Abre o chat
        
        // Limpa campos
        document.getElementById('new-char-name').value = '';
        document.getElementById('new-char-code').value = '';
        
    } catch (error) {
        console.error("Erro ao criar:", error);
        alert("Erro ao criar personagem: " + error.message);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

let allContactsCache = [];

async function renderContactList(filter = "") {
    const container = document.getElementById('contacts-list');
    
    // Se cache vazio, busca dados
    if (allContactsCache.length === 0) {
        const npcsSnap = await getDocs(collection(db, "global_npcs"));
        const playersSnap = await getDocs(collection(db, "access_codes"));
        
        npcsSnap.forEach(doc => allContactsCache.push({ ...doc.data(), id: doc.id, isPlayer: false }));
        playersSnap.forEach(doc => {
            const data = doc.data();
            if (data.type === 'player') {
                allContactsCache.push({ ...data, id: data.code, isPlayer: true });
            }
        });
    }

    container.innerHTML = '';
    
    const filtered = allContactsCache.filter(c => 
        c.name.toLowerCase().includes(filter.toLowerCase()) && 
        c.id !== currentUserCode // Não mostrar a si mesmo
    );

    filtered.forEach(contact => {
        const div = document.createElement('div');
        div.className = "flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-black/5 transition";
        div.onclick = () => handleContactSelection(contact);
        
        div.innerHTML = `
            <img src="${contact.avatar}" class="w-10 h-10 rounded-full object-cover bg-gray-300">
            <div class="flex-1">
                <h4 class="font-bold text-sm" style="color: var(--text-primary)">${contact.name}</h4>
                <span class="text-xs opacity-60" style="color: var(--text-secondary)">${contact.isPlayer ? 'Jogador' : 'NPC'}</span>
            </div>
        `;
        container.appendChild(div);
    });
}

async function handleContactSelection(contact) {
    // 1. Verificar se chat já existe
    const q = query(collection(db, "chats"), where("participants", "array-contains", currentUserCode));
    const snapshot = await getDocs(q);
    let existingChat = null;

    snapshot.forEach(doc => {
        const data = doc.data();
        // Se for NPC, verifica pelo nome (ou ID se tivéssemos migrado tudo para ID)
        // Se for Player, verifica se o código dele está nos participantes
        if (contact.isPlayer) {
            if (data.participants && data.participants.includes(contact.id)) {
                existingChat = { id: doc.id, ...data };
            }
        } else {
            // Para NPCs, a lógica ideal seria ID, mas mantendo compatibilidade com nomes antigos:
            if (data.name === contact.name) {
                existingChat = { id: doc.id, ...data };
            }
        }
    });

    if (existingChat) {
        openChat(existingChat.id, existingChat);
    } else {
        // 2. Criar novo chat
        const newChatData = {
            name: contact.name,
            avatar: contact.avatar,
            lastMessage: "Nova conversa iniciada",
            lastTime: serverTimestamp(),
            participants: [currentUserCode, '0000'] // Eu + Mestre
        };
        if (contact.isPlayer) newChatData.participants.push(contact.id); // Adiciona o outro jogador

        const docRef = await addDoc(collection(db, "chats"), newChatData);
        openChat(docRef.id, newChatData);
    }
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
        characterId: String(currentSenderId).trim(), // Garante string limpa (Bug 2)
        chatId: String(currentChatId).trim(),        // Garante string limpa (Bug 2)
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