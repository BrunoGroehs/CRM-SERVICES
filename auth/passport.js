const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { generateToken, generateRefreshToken } = require('./jwt');

// Configuração da estratégia Google OAuth
const configureGoogleStrategy = (pool) => {
  // Configurar URL de callback baseada no ambiente
  const isProd = process.env.NODE_ENV === 'production';
  const baseURL = isProd 
    ? process.env.RENDER_EXTERNAL_URL || process.env.BASE_URL || 'https://crm-services.onrender.com'
    : 'http://localhost:3000';
  
  const callbackURL = process.env.GOOGLE_REDIRECT_URI || `${baseURL}/auth/google/callback`;
  
  console.log(`🔧 Configurando Google OAuth para ambiente: ${isProd ? 'PRODUÇÃO' : 'DESENVOLVIMENTO'}`);
  console.log(`🔗 Callback URL: ${callbackURL}`);

  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: callbackURL
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const client = await pool.connect();
      
      // Primeiro, verificar se usuário já existe pelo google_id
      const existingUserByGoogleId = await client.query(
        'SELECT * FROM usuarios WHERE google_id = $1',
        [profile.id]
      );
      
      let user;
      
      if (existingUserByGoogleId.rows.length > 0) {
        // Usuário já existe com google_id - atualizar último login
        user = existingUserByGoogleId.rows[0];
        
        await client.query(
          'UPDATE usuarios SET ultimo_login = CURRENT_TIMESTAMP WHERE id = $1',
          [user.id]
        );
        
        console.log(`✅ Login realizado: ${user.email}`);
      } else {
        // Verificar se existe usuário com o mesmo email (criado manualmente)
        const existingUserByEmail = await client.query(
          'SELECT * FROM usuarios WHERE email = $1',
          [profile.emails[0].value]
        );
        
        if (existingUserByEmail.rows.length > 0) {
          // Usuário existe por email - vincular google_id
          user = existingUserByEmail.rows[0];
          
          await client.query(
            `UPDATE usuarios 
             SET google_id = $1, 
                 nome = $2, 
                 foto_perfil = $3, 
                 ultimo_login = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP 
             WHERE id = $4`,
            [
              profile.id,
              profile.displayName,
              profile.photos && profile.photos[0] ? profile.photos[0].value : user.foto_perfil,
              user.id
            ]
          );
          
          // Buscar usuário atualizado
          const updatedUserQuery = await client.query(
            'SELECT * FROM usuarios WHERE id = $1',
            [user.id]
          );
          user = updatedUserQuery.rows[0];
          
          console.log(`✅ Usuário existente vinculado ao Google: ${user.email}`);
        } else {
          // Usuário não cadastrado no sistema
          // Ao invés de criar automaticamente, vamos retornar um indicador
          user = {
            google_id: profile.id,
            email: profile.emails[0].value,
            nome: profile.displayName,
            foto_perfil: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
            status_auth: 'nao_cadastrado'
          };
          
          console.log(`⚠️ Usuário não cadastrado tentou fazer login: ${user.email}`);
        }
      }
      
      client.release();
      
      // Verificar se usuário está ativo
      if (!user.ativo && !user.status_auth) {
        // Ao invés de retornar erro, vamos marcar o usuário como inativo
        // para ser tratado na rota de callback
        user.status_auth = 'inativo';
        return done(null, user);
      }

      // Se usuário tem status especial (inativo ou não cadastrado), não gerar tokens
      if (user.status_auth) {
        return done(null, user);
      }

      // Gerar tokens apenas para usuários válidos
      const tokenPayload = {
        id: user.id,
        google_id: user.google_id,
        email: user.email,
        nome: user.nome,
        role: user.role,
        ativo: user.ativo
      };
      
      const token = generateToken(tokenPayload);
      const refreshTokenJWT = generateRefreshToken({ id: user.id, email: user.email });
      
      // Adicionar tokens ao objeto user
      user.token = token;
      user.refreshToken = refreshTokenJWT;      return done(null, user);
      
    } catch (error) {
      console.error('❌ Erro na autenticação Google:', error);
      return done(error, null);
    }
  }));
  
  // Serialização para sessão
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  // Deserialização da sessão
  passport.deserializeUser(async (id, done) => {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT * FROM usuarios WHERE id = $1', [id]);
      client.release();
      
      if (result.rows.length > 0) {
        done(null, result.rows[0]);
      } else {
        done(new Error('Usuário não encontrado'), null);
      }
    } catch (error) {
      done(error, null);
    }
  });
};

module.exports = {
  configureGoogleStrategy
};
