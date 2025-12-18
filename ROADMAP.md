---

## 🛡️ 4. Robustez e Feedback de Sistema (Prioridade Imediata)
**Problema:** O login e o envio de mensagens podem "congelar" a tela se a internet oscilar ou o Firebase demorar, sem dar feedback ao usuário.
**Solução:** Implementar estados de carregamento (Loading States) e tratamento de erros.

### A. Feedback Visual de Login
* **Tarefa:** Modificar a tela de login. Quando o usuário digitar o 4º dígito:
    1.  Trocar o campo de input por um ícone de "Spinner" (girando) ou o texto "Conectando...".
    2.  Bloquear a edição do input.
    3.  Se der erro, restaurar o input e vibrar (animação shake).

### B. Tratamento de Erros Global (Try/Catch)
* **Tarefa:** Envolver todas as chamadas assíncronas (`getDocs`, `addDoc`, `updateDoc`) em blocos `try...catch`.
* **Feedback:** Se uma mensagem falhar ao enviar, mostrar um ícone de exclamação vermelha ❗ ao lado dela com a opção de "Tentar novamente".

### C. Verificação de Conexão
* **Tarefa:** Usar a funcionalidade `.info/connected` do Firebase para detectar se o usuário caiu.
* **UI:** Mostrar uma barra discreta no topo "Você está offline" se a conexão cair.