// Teste de timezone e datas
console.log('🕒 TESTE DE DATAS E TIMEZONES\n');

// Configurar timezone para Brasil (se estiver em produção)
if (process.env.NODE_ENV === 'production') {
  process.env.TZ = 'America/Sao_Paulo';
}

console.log('Ambiente:', process.env.NODE_ENV || 'development');
console.log('Timezone configurada:', process.env.TZ || 'não configurada');
console.log('Timezone atual do sistema:', Intl.DateTimeFormat().resolvedOptions().timeZone);

// Teste com data atual
const agora = new Date();
console.log('\n📅 Data atual:');
console.log('Date.now():', new Date(Date.now()));
console.log('new Date():', agora);
console.log('toISOString():', agora.toISOString());
console.log('toLocaleDateString():', agora.toLocaleDateString());
console.log('toLocaleDateString("pt-BR"):', agora.toLocaleDateString("pt-BR"));
console.log('toLocaleString("pt-BR"):', agora.toLocaleString("pt-BR"));

// Teste com data específica (ex: 28/08/2025)
console.log('\n🎯 Teste com data específica (28/08/2025):');
const dataTest = new Date('2025-08-28');
console.log('new Date("2025-08-28"):', dataTest);
console.log('toISOString():', dataTest.toISOString());
console.log('toLocaleDateString():', dataTest.toLocaleDateString());
console.log('toLocaleDateString("pt-BR"):', dataTest.toLocaleDateString("pt-BR"));
console.log('getDate():', dataTest.getDate());
console.log('getMonth():', dataTest.getMonth() + 1); // +1 porque getMonth() retorna 0-11
console.log('getFullYear():', dataTest.getFullYear());

// Teste convertendo ISO para Date
console.log('\n🔄 Teste conversão ISO para Date:');
const isoString = '2025-08-28T00:00:00.000Z';
const dateFromISO = new Date(isoString);
console.log('ISO string:', isoString);
console.log('new Date(isoString):', dateFromISO);
console.log('split("T")[0]:', dateFromISO.toISOString().split('T')[0]);

// Teste com diferentes fusos
console.log('\n🌍 Teste com diferentes fusos:');
const utcDate = new Date('2025-08-28T12:00:00.000Z');
console.log('UTC 12:00:', utcDate);
console.log('No Brasil (UTC-3):', utcDate.toLocaleString("pt-BR", {timeZone: "America/Sao_Paulo"}));
console.log('No UTC:', utcDate.toLocaleString("pt-BR", {timeZone: "UTC"}));

console.log('\n✅ Teste concluído!');
