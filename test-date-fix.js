// Teste das novas funções de data
const formatDateLocal = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateFromString = (dateString) => {
  try {
    const date = new Date(dateString + 'T12:00:00');
    return formatDateLocal(date);
  } catch (error) {
    console.warn('Erro ao formatar data:', dateString, error);
    return dateString;
  }
};

console.log('🧪 TESTE DAS NOVAS FUNÇÕES DE DATA\n');

// Teste com data atual
const hoje = new Date();
console.log('Data atual:', hoje);
console.log('formatDateLocal(hoje):', formatDateLocal(hoje));

// Teste com string do banco (formato que vem do PostgreSQL)
const stringDoBanco = '2025-08-28';
console.log('\nString do banco:', stringDoBanco);
console.log('formatDateFromString(stringDoBanco):', formatDateFromString(stringDoBanco));

// Teste de comparação
const dataCalendario = new Date(2025, 7, 28); // Note: mês 7 = agosto (0-indexado)
console.log('\nData do calendário (28/08/2025):', dataCalendario);
console.log('formatDateLocal(dataCalendario):', formatDateLocal(dataCalendario));

// Verificar se as datas batem
const formatadaCalendario = formatDateLocal(dataCalendario);
const formatadaBanco = formatDateFromString(stringDoBanco);
console.log('\nComparação:');
console.log('Calendário:', formatadaCalendario);
console.log('Banco:', formatadaBanco);
console.log('São iguais?', formatadaCalendario === formatadaBanco);

console.log('\n✅ Teste concluído!');
