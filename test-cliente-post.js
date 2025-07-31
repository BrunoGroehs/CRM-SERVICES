const fetch = require('node-fetch');

async function testClientePost() {
  try {
    console.log('🧪 Testando criação de cliente...');
    
    const response = await fetch('http://localhost:3001/clientes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nome: 'Cliente Teste',
        telefone: '11999999999',
        email: 'teste@teste.com',
        endereco: 'Rua Teste, 123',
        cidade: 'São Paulo',
        cep: '01234-567',
        indicacao: 'Google',
        quantidade_placas: 10
      })
    });
    
    console.log('📊 Status:', response.status);
    console.log('📊 Status Text:', response.statusText);
    
    const responseText = await response.text();
    console.log('📊 Response Body:', responseText);
    
    if (response.ok) {
      console.log('✅ Teste bem-sucedido!');
    } else {
      console.log('❌ Teste falhou!');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testClientePost();
