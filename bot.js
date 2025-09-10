const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

console.log('Iniciando o bot...');

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    console.log('Escaneie o QR code acima com o seu WhatsApp!');
});

client.on('ready', () => {
    console.log('Bot conectado e pronto para operar!');
});

// Este evento é o coração do bot: ele é disparado toda vez que uma nova mensagem chega
client.on('message', message => {
    console.log(`Mensagem recebida de ${message.from}: ${message.body}`);
    
    // Converte a mensagem para minúsculas para facilitar a verificação
    const lowerCaseBody = message.body.toLowerCase();

	// Nosso primeiro comando!
	if (lowerCaseBody === 'ping') {
		client.sendMessage(message.from, 'pong');
        console.log(`Respondeu "pong" para ${message.from}`);
	}
    // Se a mensagem começar com "/amanha"
    if (lowerCaseBody.startsWith('/amanha')) {
        // Por enquanto, a agenda está fixa no código. No futuro, ela virá de um banco de dados.
        const agendaDoDia = `
*Bizu para o dia seguinte:*
07h30 - Aula de
09h25 - Aula de 
11h00 - Estudo
13h50 - Aula de 
15h25 - TFM
17h20 - À Dispo Cad
        `;

        // O bot responde na mesma conversa com a agenda
        client.sendMessage(message.from, agendaDoDia);
        console.log(`Enviou a agenda para ${message.from}`);
    }
});

client.initialize();
