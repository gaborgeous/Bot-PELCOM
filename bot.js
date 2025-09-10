// --- Bibliotecas ---
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const pdf = require('pdf-parse');
const sqlite3 = require('sqlite3').verbose(); // Nossa nova biblioteca para o banco de dados

// --- Configuração Inicial ---
console.log('Iniciando o bot...');
const ADMIN_NUMBER = '556291814411';

// --- Banco de Dados ---
// Conecta ou cria um arquivo de banco de dados chamado 'pelotao.db'
const db = new sqlite3.Database('./pelotao.db', (err) => {
    if (err) {
        console.error('Erro ao abrir o banco de dados', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
        // Cria as tabelas se elas não existirem
        db.run('CREATE TABLE IF NOT EXISTS members(number TEXT PRIMARY KEY, name TEXT)');
        db.run('CREATE TABLE IF NOT EXISTS tasks(id INTEGER PRIMARY KEY AUTOINCREMENT, task_name TEXT, member_number TEXT, status TEXT DEFAULT "PENDENTE")');
    }
});

// --- Configuração do Cliente WhatsApp ---
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox'],
    }
});

// --- Eventos do Bot ---
client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});
client.on('ready', () => {
    console.log('Bot conectado e pronto para operar!');
});

// --- Coração do Bot (Processamento de Mensagens) ---
client.on('message', async message => {
    const senderNumber = message.from.split('@')[0];
    console.log('>>>> NÚMERO DETECTADO PELO BOT:', message.from);
    const lowerCaseBody = message.body.toLowerCase();
    const chat = await message.getChat();

    // --- Comandos de Administrador ---
    if (senderNumber === ADMIN_NUMBER) { 
        // Comando para iniciar uma nova tarefa de "pronto"
        if (lowerCaseBody.startsWith('/novatarefa ')) {
            const taskName = message.body.substring(12);
            db.run('DELETE FROM tasks'); // Limpa a lista de tarefas antiga
            db.all('SELECT * FROM members', [], (err, rows) => {
                if (err) return console.error(err);
                rows.forEach(member => {
                    db.run('INSERT INTO tasks (task_name, member_number) VALUES (?, ?)', [taskName, member.number]);
                });
            });
            chat.sendMessage(`✅ *Nova tarefa iniciada:* ${taskName}\n\nCadetes, por favor, enviem "/pronto" assim que concluírem.`);
            return;
        }

        // Comando para ver quem falta
        if (lowerCaseBody === '/faltam') {
            db.all('SELECT t.member_number, m.name FROM tasks t JOIN members m ON t.member_number = m.number WHERE t.status = "PENDENTE"', [], (err, rows) => {
                if (err) return console.error(err);
                if (rows.length === 0) {
                    chat.sendMessage('✅ *Todos os cadetes estão prontos!*');
                    return;
                }
                let response = '🚨 *Cadetes com status pendente:*\n\n';
                rows.forEach(row => {
                    response += `- ${row.name || row.member_number}\n`;
                });
                chat.sendMessage(response);
            });
            return;
        }

        // Comando para adicionar um novo membro
        if (lowerCaseBody.startsWith('/addmembro ')) {
            const [_, number, ...nameParts] = message.body.split(' ');
            const name = nameParts.join(' ');
            db.run('INSERT OR IGNORE INTO members (number, name) VALUES (?, ?)', [number, name], (err) => {
                if(err) return chat.sendMessage('Erro ao adicionar membro.');
                chat.sendMessage(`Membro ${name} (${number}) adicionado com sucesso.`);
            });
            return;
        }
    }

    // --- Comandos para Todos ---
    if (lowerCaseBody === '/pronto') {
        db.run('UPDATE tasks SET status = "PRONTO" WHERE member_number = ?', [senderNumber], function(err) {
            if (err) return chat.sendMessage('Erro ao registrar seu status.');
            if (this.changes > 0) {
                 message.reply('✅ Status "Pronto" registrado com sucesso!');
            } else {
                 message.reply('🤔 Não encontrei uma tarefa pendente para você. Fale com o comandante.');
            }
        });
        return;
    }

    // Comandos antigos (ping, qae, amanha) continuam funcionando
	if (lowerCaseBody === 'ping') {
		client.sendMessage(message.from, 'pong');
	}
    if (lowerCaseBody.startsWith('/qae')) {
        try {
            const pdfPath = './schedules/qae_semana.pdf';
            // Usa a biblioteca para carregar o arquivo como uma mídia
            const media = MessageMedia.fromFilePath(pdfPath);
            // Envia o arquivo de mídia para a conversa
            client.sendMessage(message.from, media);
        } catch (error) {
            console.error('Erro ao enviar o QAE:', error);
            client.sendMessage(message.from, 'Desculpe, não consegui encontrar o arquivo do QAE para enviar.');
        }
    }
    if (lowerCaseBody.startsWith('/amanha')) {
        try {
            // Define o caminho para o arquivo PDF
            const pdfPath = './schedules/qae_semana.pdf';
            const dataBuffer = fs.readFileSync(pdfPath);

            // Usa a biblioteca para extrair o texto do PDF
            const data = await pdf(dataBuffer);
            const allText = data.text;

            // Divide o texto completo em linhas individuais
            const lines = allText.split('\n');

            let scheduleCM1 = '*Atividades para o pelotão CM 1:*\n\n';
            let foundActivities = false;

            // Itera por cada linha do texto extraído
            lines.forEach(line => {
                // Se a linha contém "CM1"
                if (line.includes('CM1')) {
                    // Limpa a linha, removendo "CM1" e espaços extras para ficar mais legível
                    const cleanLine = line.replace('CM1', '').trim();
                    scheduleCM1 += `- ${cleanLine}\n`;
                    foundActivities = true;
                }
            });

            if (foundActivities) {
                client.sendMessage(message.from, scheduleCM1);
            } else {
                client.sendMessage(message.from, 'Não encontrei atividades para o pelotão CM 1 no QAE desta semana.');
            }

        } catch (error) {
            console.error('Erro ao processar o QAE:', error);
            client.sendMessage(message.from, 'Desculpe, tive um problema ao tentar ler o arquivo do QAE. Verifique se o arquivo está na pasta correta.');
        }
    }
});

// --- Inicialização ---
client.initialize();

