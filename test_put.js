const http = require('http');

// Dados para testar
const data = JSON.stringify({
  status: 'concluido'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/servicos/737', // ID 737 que vimos no erro
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('Testando PUT /servicos/737 com status: concluido');
console.log('Dados enviados:', data);

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);

  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log('Response Body:', responseData);
    try {
      const parsed = JSON.parse(responseData);
      console.log('Parsed Response:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Não foi possível fazer parse da resposta');
    }
  });
});

req.on('error', (error) => {
  console.error('Erro na requisição:', error);
});

// Enviar dados
req.write(data);
req.end();
