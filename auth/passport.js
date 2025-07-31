const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { generateToken, generateRefreshToken } = require('./jwt');

// Configuração da estratégia Google OAuth
const configureGoogleStrategy = (pool) => {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_REDIRECT_URI
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const client = await pool.connect();
      
      // Verificar se usuário já existe
      const existingUserQuery = await client.query(
        'SELECT * FROM usuarios WHERE google_id = $1',
        [profile.id]
      );
      
      let user;
      
      if (existingUserQuery.rows.length > 0) {
        // Usuário existe - atualizar último login
        user = existingUserQuery.rows[0];
        
        await client.query(
          'UPDATE usuarios SET ultimo_login = CURRENT_TIMESTAMP WHERE id = $1',
          [user.id]
        );
        
        console.log(`✅ Login realizado: ${user.email}`);
      } else {
        // Criar novo usuário
        const newUserQuery = await client.query(
          `INSERT INTO usuarios (google_id, email, nome, foto_perfil, role, ativo, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
           RETURNING *`,
          [
            profile.id,
            profile.emails[0].value,
            profile.displayName,
            profile.photos && profile.photos[0] ? profile.photos[0].value : null,
            'user', // role padrão
            true    // ativo por padrão
          ]
        );
        
        user = newUserQuery.rows[0];
        console.log(`✅ Novo usuário criado: ${user.email}`);
      }
      
      client.release();
      
      // Verificar se usuário está ativo
      if (!user.ativo) {
        return done(new Error('Usuário inativo'), null);
      }
      
      // Gerar tokens
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
      user.refreshToken = refreshTokenJWT;
      
      return done(null, user);
      
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
