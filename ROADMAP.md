# 🦋 Life is Strange RPG Messenger - Guia de Correção v9.0 (Texto Invisível)

## 🚨 DIAGNÓSTICO FINAL
**Problema:** O texto das mensagens está invisível ou com baixo contraste.
**Causa:** Conflito entre as cores do Tailwind (`text-gray-800`) e as variáveis CSS do tema (`--bubble-npc-text`).

---

## 🛠️ Instruções de Correção

### 1. Limpeza Radical no CSS (`style.css`)
Vamos simplificar as cores para garantir contraste.

**Substitua o bloco `:root` e `.dark-theme` por:**
```css
:root {
    /* Light Mode */
    --app-bg: #fbf5f1;
    --sidebar-bg: #f3eae4;
    --border-color: #e6dace;
    --text-primary: #0b0805;
    
    /* Balões */
    --bubble-npc-bg: #ffffff;
    --bubble-npc-text: #000000; /* Preto absoluto para leitura */
    
    --bubble-player-bg: #f2b378;
    --bubble-player-text: #000000; /* Preto no Laranja */
    
    --primary-accent: #945d29;
}

body.dark-theme {
    /* Dark Mode */
    --app-bg: #0d0607;
    --sidebar-bg: #140a0b;
    --border-color: #2b1517;
    --text-primary: #eae3e4;

    /* Balões */
    --bubble-npc-bg: #1f1f1f;
    --bubble-npc-text: #ffffff; /* Branco no Cinza Escuro */
    
    --bubble-player-bg: #951526;
    --bubble-player-text: #ffffff; /* Branco no Vermelho */
    
    --primary-accent: #ffb6c0;
}

2. Correção no Javascript (script.js) - Função createMessageElement

O HTML gerado para a mensagem deve remover classes de cor do Tailwind que conflitam e usar apenas as variáveis CSS.

Código da Função Corrigida:

function createMessageElement(data, docId) {
    const isPlayer = data.characterId === PLAYER_PROFILE.id;
    
    // ... (lógica de hora e lado) ...

    const bubbleClass = isPlayer ? 'bubble-right' : 'bubble-left';

    // REMOVER classes como 'text-gray-800' ou 'dark:text-gray-100' daqui!
    // Usar apenas cores herdadas do CSS.
    wrapper.innerHTML = `
        <div class="relative max-w-[85%] md:max-w-[65%] ${bubbleClass} px-3 py-2 text-sm shadow-sm group min-w-[80px]">
            ${nameLabel}
            <div class="leading-relaxed whitespace-pre-wrap select-text">${data.text}</div>
            
            <div class="flex justify-end items-center gap-1 mt-0.5 select-none opacity-70">
                <span class="text-[10px] font-mono inherit-color">${timeStr}</span>
                </div>
        </div>
    `;
    return wrapper;
}

3. CSS de Reforço (style.css)

Adicionar regra para forçar a cor do texto dentro do balão.

.bubble-left, .bubble-right {
    color: var(--bubble-npc-text) !important; /* Força a cor NPC como base */
}

.bubble-right {
    color: var(--bubble-player-text) !important; /* Sobrescreve para Player */
}

### O que vai acontecer?
Ao remover as classes `text-gray-800` (cinza escuro) que o Tailwind coloca por padrão, o texto vai finalmente obedecer à cor que definimos no CSS:
* **NPC (Dark Mode):** Fundo Cinza -> Texto **Branco Pura**.
* **Player (Dark Mode):** Fundo Vermelho -> Texto **Branco Pura**.