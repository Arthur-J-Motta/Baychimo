
/**
Bom, agora vamos começar a parte que realmente faz o Baychimo conversar,
porque até agora a gente tinha basicamente uma página bonita (ou pelo menos
funcional visualmente) que não fazia porra nenhuma quando alguém clicava
no botão de enviar.

Esse arquivo aqui vai ser responsável por pegar o texto que a pessoa digitou,
mandar pro nosso servidor e mostrar a resposta que o modelo local devolver.

E só pra deixar claro: esse código roda no navegador. Quem conversa com o
Ollama de verdade é o server.js, porque eu não quero deixar o navegador
tentando acessar tudo diretamente sem necessidade.

Ass: Arthur, tentando fazer um psicólogo web sem falir no processo.
*/

const messages = document.getElementById("messages");
const promptInput = document.getElementById("prompt");
const sendButton = document.getElementById("send");

/**
Aqui eu pego os elementos do HTML pelos IDs deles.

Se alguém mudar esses IDs no index.html e esquecer de mudar aqui também,
o programa provavelmente vai dar erro. Então fica o aviso pra eu mesmo
não esquecer disso daqui a três semanas e ficar me perguntando por que
essa porcaria parou de funcionar.
*/

/**
Agora o Baychimo também vai ter uma foto de perfil a pedido do Victor.

O caminho abaixo aponta pra imagem da logo que deixamos na pasta do projeto.
Se alguém resolver guardar a imagem em outra pasta no futuro, precisa atualizar
esse caminho também.
*/

const assistantAvatar = "baychimo.png";
let isProcessing = false;

function addMessage(text, author) {
    const message = document.createElement("div");

    message.className = "message " + author;
    message.textContent = text;

    /**
    A imagem fica à esquerda e o balão de texto fica à direita.
    Assim, a conversa começa a ter aquela aparência de chat de verdade,
    em vez de parecer um monte de caixas de texto soltas na página.
    */

    if (author === "assistant") {
        const container = document.createElement("div");
        container.className = "assistant-message";

        const avatar = document.createElement("img");
        avatar.src = assistantAvatar;
        avatar.alt = "Logo do Baychimo";
        avatar.className = "assistant-avatar";

        /**
        Caso a imagem não seja encontrada, esconde somente o avatar.

        Assim, uma logo com caminho errado não deixa um ícone quebrado
        aparecendo na conversa nem impede o texto de ser exibido.
        */

        avatar.addEventListener("error", function () {
            avatar.hidden = true;
        }, { once: true });

        container.appendChild(avatar);
        container.appendChild(message);

        messages.appendChild(container);
    } else {
        messages.appendChild(message);
    }

    messages.scrollTop = messages.scrollHeight;
}

/**
Essa função cria uma mensagem nova na conversa.

O parâmetro text é o texto da mensagem e author indica quem falou.

Eu uso textContent em vez de jogar o texto direto como HTML porque não
quero que uma mensagem digitada pela pessoa seja interpretada como código.
É uma precaução simples, mas importante, principalmente numa aplicação
que recebe texto de usuários.

Também faço a conversa rolar até o final automaticamente, porque ninguém
merece ter que ficar procurando a resposta lá em cima igual antes.
*/

async function sendMessage() {
    if (isProcessing) {
        return;
    }

    const message = promptInput.value.trim();

    if (message === "") {
        return;
    }

    isProcessing = true;

    /**
    Primeiro eu verifico se a pessoa realmente escreveu alguma coisa.

    O trim() tira os espaços inúteis do começo e do final.
    Se estiver vazio, a função termina aqui e não manda uma requisição
    desnecessária pro servidor.
    */

    addMessage(message, "user");

    promptInput.value = "";
    sendButton.disabled = true;
    sendButton.textContent = "Pensando...";

    /**
    Agora a mensagem aparece na tela e eu limpo a caixa de texto.

    Também desativo o botão enquanto o modelo responde, porque não quero
    que alguém clique vinte vezes e mande vinte requisições ao mesmo tempo.

    O texto do botão muda temporariamente pra pessoa saber que o sistema
    está trabalhando. Não é exatamente uma inteligência artificial
    instantânea, infelizmente faltou verba.
    */

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: message
            })
        });

        /**
        Aqui eu mando a mensagem pro endpoint /api/chat do server.js.

        O fetch faz a requisição HTTP, o método POST indica que estou
        enviando dados e o JSON.stringify transforma o objeto JavaScript
        em texto JSON, que é o formato esperado pelo servidor.

        Repara que uso um caminho relativo (/api/chat). Assim, o navegador
        conversa com o servidor que entregou a própria página, sem precisar
        colocar o endereço completo aqui.
        */

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "O servidor respondeu com um erro.");
        }

        /**
        Transformo a resposta do servidor de JSON pra objeto JavaScript.

        Se o servidor indicar que alguma coisa deu errado, eu lanço um erro
        pra cair no catch ali embaixo.
        */

        addMessage(data.reply, "assistant");

    } catch (error) {
        console.error("Erro ao enviar mensagem:", error);

        addMessage(
            "Não consegui obter uma resposta agora. Confere se o Baychimo, o servidor e o Ollama estão funcionando e tenta de novo.",
            "assistant"
        );
        const avatar = document.createElement("img");

        avatar.src = "baychimo.png";
        avatar.alt = "";
        avatar.className = "assistant-avatar";
        avatar.setAttribute("aria-hidden", "true");

    avatar.addEventListener("error", function () {
    avatar.hidden = true;
    }, { once: true });

        /**
        Se o servidor estiver desligado, o Ollama não responder ou ocorrer
        algum outro problema de comunicação, a página não deve simplesmente
        morrer e deixar a pessoa olhando pra tela igual uma porta.

        O console recebe o erro técnico pra ajudar na investigação, enquanto
        a interface mostra uma mensagem mais simples.

        Essa mensagem é genérica de propósito: não vou despejar detalhes
        internos do servidor na interface do usuário.

        E como a mensagem de erro também passa pela addMessage(), ela ganha
        a foto de perfil do Baychimo automaticamente.
        */

    } finally {
    isProcessing = false;
    sendButton.disabled = false;
    sendButton.textContent = "Enviar";
    promptInput.focus();
}

    /**
    O finally roda tanto se deu certo quanto se deu errado.

    Então reativa o botão, restaura o texto original e devolve o foco
    pra caixa de mensagem. Pelo menos assim a pessoa pode continuar
    conversando sem ter que clicar em tudo de novo.
    */
}

sendButton.addEventListener("click", sendMessage);

/**
Quando clicarem no botão, a função sendMessage vai ser executada.

Só isso já resolve o clique, mas também quero permitir enviar com Enter,
porque ficar indo com o mouse até o botão toda hora é meio incomoda alguns.
*/

promptInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
});

/**
Enter envia a mensagem. Shift + Enter fica disponível pra quem quiser
quebrar a linha e escrever um texto maior.

O preventDefault evita que o Enter faça o comportamento padrão da caixa
de texto quando eu quero usá-lo pra enviar a mensagem.
*/