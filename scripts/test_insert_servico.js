require('dotenv').config();
const { Pool } = require('pg');
(async () => {
  const pool = new Pool({connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV==='production'?{rejectUnauthorized:false}:false});
  const client = await pool.connect();
  try {
    const cli = await client.query('SELECT id FROM clientes LIMIT 1');
    if(!cli.rows.length){console.log('Nenhum cliente para teste'); return;}
    const usuarios = await client.query('SELECT id FROM usuarios LIMIT 2');
    const uids = usuarios.rows.map(r=>r.id);
    console.log('Cliente', cli.rows[0].id, 'Usuarios', uids);
    const insertSQL = 'INSERT INTO servicos (cliente_id,data,hora,valor,notas,status) VALUES ($1,CURRENT_DATE,$2,$3,$4,$5) RETURNING id';
    console.log('Insert SQL:', insertSQL);
    const ins = await client.query(insertSQL, [cli.rows[0].id,'10:00',10.50,'Teste migracao','agendado']);
    const sid = ins.rows[0].id;
    for(const uid of uids){
      await client.query('INSERT INTO servicos_usuarios (servico_id,usuario_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',[sid,uid]);
    }
    const ret = await client.query('SELECT s.id, COALESCE(array_agg(su.usuario_id) FILTER (WHERE su.usuario_id IS NOT NULL),ARRAY[]::int[]) as usuarios FROM servicos s LEFT JOIN servicos_usuarios su ON su.servico_id=s.id WHERE s.id=$1 GROUP BY s.id',[sid]);
    console.log('Resultado:', ret.rows[0]);
  } catch (e) {
    console.error('Erro teste:', e);
  } finally {
    client.release();
    await pool.end();
  }
})();
