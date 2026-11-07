/*
Só pra deixar explicado o que essa porcaria faz antes que alguém venha
me perguntar por que o navegador não tá conversando com o Ollama, beleza?
Esse arquivo é o servidor do Baychimo, ou seja, é a ponte entre a página
HTML e o modelo de IA que tá rodando localmente no computador.
A ideia é deixar a interface no navegador sem precisar colocar a lógica
de comunicação com o Ollama inteira no JavaScript da página. O navegador
manda uma mensagem pro servidor, o servidor manda pro Ollama, recebe a
resposta e devolve pro navegador mostrar na tela. Simples na teoria,
porque na prática sempre tem alguma coisa que resolve não funcionar.
Outra coisa: isso aqui é um protótipo local, não um servidor pronto pra
receber conexão da internet inteira. Não compartilhem esse servidor na rede
nem coloquem isso online sem revisar autenticação, limites de uso e segurança.
Ass: Arthur "Roger" Joaquim Motta
*/

const http = require("node:http");

const fs = require("node:fs");

const path = require("node:path");

/*
Essas constantes guardam as configurações básicas do servidor.
O HOST tá como 127.0.0.1, que significa que o servidor só aceita conexões
vindas do próprio computador. Não é pra sair colocando 0.0.0.0 aqui só
porque alguém viu isso num tutorial aleatório, porque aí o servidor pode
ficar acessível por outros dispositivos da rede.
A PORT é a porta onde o Baychimo vai abrir, e a OLLAMA_URL é o endereço
da API local do Ollama. O MODEL define qual modelo vai responder, nesse
caso o Gemma 4 E2B, porque o E4B já deu problema de memória nessa máquina.
O HTML_FILE pega o caminho do index.html e o JS_FILE pega o caminho do
app.js. Os dois usam __dirname, que representa a pasta onde este arquivo
server.js está localizado. Assim não precisamos escrever o caminho inteiro
dos arquivos na mão nem ficar rezando pra eles serem encontrados.
*/

const HOST = "127.0.0.1";

const PORT = 3000;

const OLLAMA_URL = "http://127.0.0.1:11434";

const MODEL = "gemma4:e2b";

const HTML_FILE = path.join(__dirname, "index.html");

const JS_FILE = path.join(__dirname, "app.js");

const AVATAR_FILE = path.join(__dirname, "baychimo.png");

/*
A partir daqui começa a memória temporária do Baychimo.
A ideia é guardar as mensagens da conversa numa lista, porque até agora
o Gemma só recebia a última mensagem e precisava fingir que conhecia
todo o contexto anterior. Spoiler: ele não conhecia porcaria nenhuma.
Cada conversa vai ter as mensagens do usuário e as respostas do modelo.
Por enquanto, essa memória fica só na RAM e desaparece quando o servidor
é desligado. Também vamos limitar o histórico mais adiante pra não
consumir memória demais nem ultrapassar o contexto que o modelo suporta.
Ass: Arthur "Roger" Joaquim Motta
*/

const conversationHistory = [];

const MAX_HISTORY_MESSAGES = 20;

/*
Aqui começa o servidor HTTP propriamente dito.
Toda vez que o navegador fizer uma requisição, esse callback vai verificar
o que ele está pedindo e decidir o que fazer. O req guarda as informações
da requisição, enquanto o res é o que usamos pra responder ao navegador.
O async permite usar await dentro da função, porque a comunicação com o
Ollama demora um pouco e a gente precisa esperar a resposta antes de
devolver o resultado. Não é pra congelar o servidor inteiro enquanto
o modelo pensa, então usamos operações assíncronas onde faz sentido.
*/

const server = http.createServer(async (req, res) => {

    /*
    Esse cabeçalho manda o navegador evitar tentar adivinhar o tipo de
    conteúdo recebido. Não resolve todos os problemas de segurança do
    mundo, mas é uma proteção simples que custa praticamente nada.
    */

    res.setHeader("X-Content-Type-Options", "nosniff");

    /*
    Se alguém abrir o endereço principal do Baychimo, o servidor vai
    entregar o index.html.
    O método GET é usado aqui porque o navegador está pedindo uma página,
    não enviando uma mensagem pro modelo. O readFileSync lê o arquivo
    HTML do disco; como é um arquivo pequeno, deixei assim por enquanto
    pra manter o exemplo simples.
    */

    if (req.method === "GET" && req.url === "/") {

        try {

            const html = fs.readFileSync(HTML_FILE);

            res.writeHead(200, {

                "Content-Type": "text/html; charset=utf-8"

            });

            return res.end(html);

        } catch (error) {

            /*
            Se o index.html não estiver na pasta, ou se o servidor não
            conseguir ler o arquivo, mostramos um erro em vez de deixar
            o navegador esperando uma página que nunca vai chegar.
            */

            res.writeHead(500, {

                "Content-Type": "text/plain; charset=utf-8"

            });

            return res.end("Não foi possível abrir index.html.");

        }

    }

    /*
    Esta rota entrega o app.js ao navegador.
    Antes, o servidor só sabia entregar a página HTML e receber mensagens
    pra IA. Agora a gente também precisa entregar o JavaScript que controla
    o botão Enviar, exibe as mensagens e faz as requisições pra /api/chat.
    Se essa rota não existisse, o navegador tentaria carregar o app.js,
    receberia um 404 e a interface continuaria sem funcionar. Ou seja,
    o código estaria salvo bonitinho no disco, mas não seria executado.
    */

    if (req.method === "GET" && req.url === "/app.js") {

        try {

            const javascript = fs.readFileSync(JS_FILE);

            res.writeHead(200, {

                "Content-Type": "text/javascript; charset=utf-8"

            });

            return res.end(javascript);

        } catch (error) {

            /*
            Se o arquivo app.js não existir ou não puder ser lido,
            devolvemos um erro específico pra ficar mais fácil descobrir
            qual arquivo está faltando, em vez de culpar o Ollama por tudo.
            */

            res.writeHead(500, {

                "Content-Type": "text/plain; charset=utf-8"

            });

            return res.end("Não foi possível abrir app.js.");

        }

    }

    /*
    Essa é a rota que faz o Baychimo conversar com a IA.
    O navegador vai mandar uma requisição POST para /api/chat contendo
    a mensagem escrita pelo usuário. O servidor recebe esse texto,
    verifica se ele é válido e encaminha a mensagem pro Ollama.
    O POST é usado porque estamos enviando dados, e não apenas pedindo
    que o servidor entregue um arquivo. Cada rota tem sua função pra
    não transformar tudo numa bagunça impossível de manter depois.
    */

if (req.method === "GET" && req.url === "/baychimo.png") {
        try {
            const avatar = fs.readFileSync(AVATAR_FILE);

            res.writeHead(200, {
                "Content-Type": "image/png"
            });

            return res.end(avatar);
        } catch (error) {
            res.writeHead(500, {
                "Content-Type": "text/plain; charset=utf-8"
            });

            return res.end("Não foi possível abrir baychimo.png.");
        }
    }

    if (req.method === "POST" && req.url === "/api/chat") {

        try {

            /*
            Aqui juntamos os pedaços do corpo da requisição.
            O navegador pode mandar os dados em vários pedaços, então
            não dá pra presumir que tudo vai chegar de uma vez só.
            Também existe um limite de tamanho pra evitar que alguém
            mande um corpo gigantesco e consuma memória à toa.
            */

            let body = "";

            for await (const chunk of req) {

                body += chunk;

                if (body.length > 100_000) {

                    res.writeHead(413, {

                        "Content-Type": "application/json; charset=utf-8"

                    });

                    return res.end(JSON.stringify({

                        error: "Mensagem muito grande."

                    }));

                }

            }

            /*
            O corpo chega como texto JSON, então usamos JSON.parse pra
            transformar isso num objeto JavaScript que dê pra acessar.
            Depois conferimos se a mensagem realmente existe e se é uma
            string. Isso evita mandar valores vazios ou dados de outro
            tipo pro modelo e ficar tentando descobrir depois por que
            ele respondeu uma coisa esquisita.
            */

            const data = JSON.parse(body);

            if (

                typeof data.message !== "string" ||

                !data.message.trim()

            ) {

                res.writeHead(400, {

                    "Content-Type": "application/json; charset=utf-8"

                });

                return res.end(JSON.stringify({

                    error: "Escreva uma mensagem primeiro."

                }));

            }

            /*
            Agora vem a comunicação com o Ollama.
            O fetch manda uma requisição pra API local, informando qual
            modelo deve responder e qual é a mensagem do usuário.
            O stream fica como false porque, por enquanto, queremos
            receber a resposta inteira de uma vez, sem implementar
            aquele efeito de texto aparecendo aos poucos.
            A mensagem system define algumas orientações gerais de
            comportamento do Baychimo. Isso não transforma o Gemma num
            psicólogo nem garante que ele sempre vai responder certo;
            é apenas uma instrução inicial pro modelo.
            Como a ideia do projeto é oferecer um espaço de conversa e
            apoio emocional, deixamos explícito que ele não deve afirmar
            que é profissional de saúde nem substituir acompanhamento
            profissional. Isso ainda precisa ser complementado com
            proteções e testes específicos antes de qualquer uso real.
            */

            const response = await fetch(`${OLLAMA_URL}/api/chat`, {

                method: "POST",

                headers: {

                    "Content-Type": "application/json"

                },

                body: JSON.stringify({

                    model: MODEL,

                    messages: [

    {

        role: "system",

        content:
    "Você é Baychimo, um assistente virtual que conversa em " +
    "português brasileiro. Seu foco é oferecer escuta acolhedora, " +
    "apoio emocional e informações úteis sobre autocuidado. " +
    "Converse como uma pessoa natural conversaria: preste atenção " +
    "no que foi dito, compreenda o contexto e responda de maneira " +
    "direta, espontânea e específica. " +
    " " +
    "SUA PRIORIDADE É CONVERSAR BEM. " +
    " " +
    "Não se limite a reconhecer ou resumir o que o usuário " +
    "disse. Sempre que combinar com a conversa, acrescente " +
    "uma reação própria, um comentário específico, uma " +
    "observação inesperada ou uma continuação criativa. " +
    "Em conversas humorísticas, acompanhe a lógica da " +
    "brincadeira e aproveite os detalhes das mensagens " +
    "anteriores para construir sobre ela. Não precisa fazer " +
    "uma pergunta no final de cada resposta. Às vezes, uma " +
    "reação curta e engraçada é suficiente. Evite elogios " +
    "automáticos, exclamações genéricas e comentários que " + 
    "poderiam servir para qualquer situação."+
    "Em brincadeiras, piadas e histórias absurdas, " +
    "procure participar ativamente da conversa, em vez " +
    "de apenas entrevistar o usuário sobre o que aconteceu. " +
    "Quando houver espaço para humor, acrescente um " +
    "acontecimento novo, uma consequência inesperada, " +
    "uma reação engraçada ou uma continuação coerente " +
    "com a situação. Aproveite os detalhes já mencionados " +
    "para desenvolver a brincadeira por conta própria, " +
    "sem tomar completamente o controle da história. " +
    "Prefira contribuir com algo interessante a perguntar " +
    "automaticamente o que acontece em seguida. Não termine " +
    "todas as respostas com perguntas. Evite atribuir " +
    "sentimentos, traumas ou reações emocionais a pessoas " +
    "e personagens sem necessidade ou sem contexto. " +
    "Uma resposta curta, espontânea e específica pode ser " +
    "melhor do que um parágrafo inteiro de comentários " +
    "genéricos. Não force humor quando o assunto for sério."+
    " "+
    "Responda primeiro ao conteúdo real da mensagem. Comente " +
    "os acontecimentos, ideias, dúvidas ou detalhes mencionados " +
    "pelo usuário, em vez de recorrer a frases prontas. Use um " +
    "tom compatível com a conversa, podendo ser descontraído " +
    "quando a situação permitir. Não imite artificialmente " +
    "o jeito de falar do usuário. " +
    " " +
    "Não interprete tudo como um problema emocional. Se alguém " +
    "contar uma história engraçada, absurda, cotidiana ou banal, " +
    "reaja à história em si. Não transforme automaticamente " +
    "o relato em uma análise psicológica. Não atribua sentimentos " +
    "que a pessoa não expressou, não exagere a gravidade dos " +
    "acontecimentos e não invente significados ocultos. " +
    " " +
    "Exemplo de comportamento: se alguém contar uma história " +
    "caótica de maneira humorística, você pode reagir com humor " +
    "e comentar algum detalhe inesperado. Não responda dizendo " +
    "que a pessoa está traumatizada, humilhada ou emocionalmente " +
    "abalada sem evidências. Se ela disser explicitamente que " +
    "está sofrendo, leve isso a sério. " +
    " " +
    "Evite respostas genéricas como 'imagino como deve ser " +
    "difícil', 'estou aqui para te ouvir' ou 'o que mais está " +
    "pesando emocionalmente?' quando não combinarem com a " +
    "situação. Não repita a mensagem do usuário em outras " +
    "palavras apenas para demonstrar empatia. Não transforme " +
    "toda resposta em uma pergunta, conselho ou oferta de ajuda. " +
    "Respostas curtas são perfeitamente aceitáveis quando " +
    "são suficientes. " +
    " " +
    "Quando alguém quiser desabafar, escute e responda ao " +
    "que realmente foi compartilhado. Não ofereça soluções " +
    "automaticamente. Se não estiver claro se a pessoa quer " +
    "conselhos ou apenas conversar, pergunte de forma simples. " +
    "Reconheça sentimentos expressos sem presumir que conhece " +
    "completamente a experiência da pessoa. Não ridicularize " +
    "nem julgue quem estiver buscando apoio. " +
    " " +
    "Seu foco é apoio emocional e autocuidado, mas você pode " +
    "responder normalmente a assuntos gerais quando souber " +
    "a resposta. Não redirecione perguntas comuns para emoções " +
    "sem motivo. Se não souber algo, diga isso com honestidade. " +
    "Separe fatos de opiniões e deixe claras as incertezas. " +
    " " +
    "Você não é psicólogo, médico nem substituto de profissionais " +
    "de saúde. Não faça diagnósticos, não prescreva tratamentos, " +
    "não prometa resultados e não incentive o abandono de " +
    "tratamentos ou de ajuda profissional. Sugira apoio " +
    "profissional quando isso for pertinente, sem transformar " +
    "toda dificuldade cotidiana em uma emergência. " +
    "Se houver indícios de perigo imediato ou risco de alguém " +
    "se machucar, priorize a segurança, incentive o contato " +
    "com uma pessoa de confiança e recomende ajuda profissional " +
    "ou serviços de emergência locais quando necessário. " +
    " " +
    "PRIORIDADE EM SITUAÇÕES DE RISCO: quando uma " +
    "mensagem indicar consumo excessivo de álcool ou " +
    "outras substâncias, não responda apenas com empatia, " +
    "metáforas ou sugestões para desabafar. Aborde " +
    "explicitamente o comportamento de risco e indique " +
    "uma ação segura e imediata. Se a pessoa já bebeu " +
    "bastante e pensa em continuar, recomende que não " +
    "beba mais, que procure alguém de confiança para " +
    "ficar com ela e que não dirija. Pergunte brevemente " +
    "se está sozinha ou se apresenta sintomas físicos " +
    "preocupantes, conforme o contexto. Se houver sinais " +
    "de intoxicação grave, oriente a buscar atendimento " +
    "de emergência imediatamente. Seja direto e humano, " +
    "sem sermões, exageros ou frases de efeito. " +
    " " +
    "Se alguém relatar consumo excessivo de álcool, drogas " +
    "ou outras substâncias, especialmente quando estiver " +
    "tentando lidar com sofrimento emocional, não trate " +
    "esse consumo como uma solução inofensiva. Reconheça " +
    "o motivo que a pessoa apresentou sem incentivar o " +
    "consumo. Se ela disser que pretende consumir mais " +
    "apesar de já estar passando mal ou ter consumido " +
    "muito, recomende que interrompa o consumo e priorize " +
    "a segurança imediata. Sugira medidas práticas e " +
    "adequadas à situação, como procurar alguém de " +
    "confiança para ficar por perto e evitar dirigir. " +
    " " +
    "Quando houver sinais de intoxicação grave, como " +
    "confusão intensa, dificuldade para permanecer acordado, " +
    "respiração lenta ou irregular, convulsões ou perda " +
    "de consciência, oriente a procurar os serviços de " +
    "emergência locais imediatamente. Não sugira que a " +
    "pessoa simplesmente durma para passar o efeito, nem " +
    "que café, banho frio ou outros métodos caseiros " +
    "eliminem a intoxicação. " +
    " " +
    "Faça perguntas diretas e breves quando uma informação " +
    "for importante para avaliar a segurança da pessoa. " +
    "Não interrogue nem faça várias perguntas de uma vez " +
    "sem necessidade. Se houver risco imediato, priorize " +
    "ações de segurança em vez de prolongar a conversa. " +
    " " +
    "Adapte a resposta à gravidade do que foi relatado. " +
    "Não trate toda tristeza como uma crise, não presuma " +
    "que existe risco de autoagressão sem indícios e não " +
    "use alertas de emergência de maneira automática. " +
    "Seja proporcional, respeitoso e claro, sem julgamentos " +
    "ou sermões. " +
    "Use as mensagens anteriores disponíveis para compreender " +
    "o contexto, referências e informações já compartilhadas. " +
    "Não finja lembrar de algo que não aparece no histórico. " +
    " " +
    "Quanto à privacidade, seja honesto sobre o funcionamento " +
    "do protótipo. O histórico atual fica temporariamente na " +
    "memória RAM do servidor e é apagado quando o processo " +
    "do servidor é encerrado. O mecanismo atual não salva " +
    "esse histórico em arquivos. Não prometa sigilo absoluto: " +
    "pessoas ou processos com acesso ao computador podem " +
    "representar riscos à privacidade. Não incentive o envio " +
    "de senhas, dados bancários ou informações extremamente " +
    "sensíveis."    },

    ...conversationHistory,

    {

        role: "user",

        content: data.message.trim()

    }

],

                    stream: false

                })

            });

            /*
            A resposta do Ollama também vem em JSON, então convertemos
            o conteúdo recebido pra um objeto JavaScript.
            Depois verificamos se a requisição funcionou. Se o modelo
            não estiver disponível, se o Ollama retornar um erro ou
            se alguma configuração estiver errada, não adianta fingir
            que tudo deu certo e mandar uma resposta vazia pro usuário.
            */

            const result = await response.json();

            if (!response.ok) {

                throw new Error(

                    result.error || "O Ollama retornou um erro."

                );

            }

/*
Agora vamos guardar a conversa de verdade.
Primeiro registramos a mensagem que acabou de chegar do usuário e
depois a resposta que o Gemma acabou de produzir. Assim, na próxima
requisição, o modelo poderá receber esse histórico como contexto.
IMPORTANTE: só guardamos as mensagens depois de confirmar que o Ollama
respondeu corretamente. Se der erro, não vamos registrar uma conversa
como se tivesse funcionado. A memória ainda é temporária e compartilhada
por quem usar esta instância local do servidor, então não é uma memória
separada por pessoa.
Ass: Arthur "Roger" Joaquim Motta
*/

conversationHistory.push(

    {

        role: "user",

        content: data.message.trim()

    },

    {

        role: "assistant",

        content: result.message.content

    }

);

while (conversationHistory.length > MAX_HISTORY_MESSAGES) {

    conversationHistory.splice(0, 2);

}

            /*
            Se chegamos até aqui, a resposta foi recebida.
            Devolvemos um JSON com o texto da IA. O frontend vai ler
            esse campo chamado reply e colocar o conteúdo na conversa.
            Ainda não estamos salvando histórico, memória ou conversas
            em arquivo nenhum. Cada requisição manda somente a mensagem
            atual, então o modelo não lembra automaticamente do que
            foi falado antes. Isso fica pra próxima etapa do projeto.
            */

            res.writeHead(200, {

                "Content-Type": "application/json; charset=utf-8"

            });

            return res.end(JSON.stringify({

                reply: result.message.content

            }));

        } catch (error) {

            /*
            Se qualquer parte da requisição falhar, devolvemos uma
            mensagem de erro compreensível pro frontend.
            O erro técnico fica no terminal pra ajudar a descobrir
            o problema durante o desenvolvimento. Não mostramos
            detalhes internos do servidor diretamente na página,
            porque isso pode expor informações desnecessárias.
            OBS: isso é um tratamento inicial de erros, não um sistema
            completo de monitoramento. Ainda dá pra melhorar bastante
            quando o restante da aplicação estiver funcionando.
            */

            console.error("Erro ao processar mensagem:", error.message);

            res.writeHead(500, {

                "Content-Type": "application/json; charset=utf-8"

            });

            return res.end(JSON.stringify({

                error:

                    "Não consegui falar com o Ollama. " +

                    "Verifique se ele está funcionando e tente novamente."

            }));

        }

    }

    /*
    Se a requisição não corresponde a nenhuma rota que implementamos,
    respondemos com 404. Isso significa que o endereço solicitado não
    existe neste servidor, não necessariamente que o Ollama quebrou.
    */

    res.writeHead(404, {

        "Content-Type": "text/plain; charset=utf-8"

    });

    res.end("Não encontrado.");

});

/*
Por último, mandamos o servidor começar a escutar na porta definida
lá em cima.
Quando ele iniciar, o terminal mostra o endereço onde a página pode
ser aberta e qual modelo está configurado. Enquanto esse processo
estiver rodando, o servidor fica disponível; pra parar, usamos
Ctrl + C no terminal.
Por enquanto, o servidor só atende este computador e não foi feito
pra ser publicado diretamente na internet. Primeiro vamos fazer a
comunicação local funcionar, depois testar os erros e só então pensar
em memória, voz e no resto das funções do Baychimo.
Obrigado pela compreensão.
*/

server.listen(PORT, HOST, () => {

    console.log(`Baychimo disponível em http://${HOST}:${PORT}`);

    console.log(`Modelo: ${MODEL}`);

});