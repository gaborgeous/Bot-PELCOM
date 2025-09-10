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

client.on('message', message => {
    console.log(`Mensagem recebida de ${message.from}: ${message.body}`);

	if (message.body.toLowerCase() === 'ping') {
        //resposta
		client.sendMessage(message.from, 'pong');
        console.log(`Respondeu "pong" para ${message.from}`);
	}
});

client.initialize();
