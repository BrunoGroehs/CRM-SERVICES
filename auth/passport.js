const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { generateToken, generateRefreshToken } = require('./jwt');
const { googleLogger, authLogger } = require('../config/logger');

// Configuração da estratégia Google OAuth
const configureGoogleStrategy = (pool) => {
  // Configurar URL de callback baseada no ambiente
  const isProd = process.env.NODE_ENV === 'production';
  const baseURL = isProd 
    ? process.env.RENDER_EXTERNAL_URL || process.env.BASE_URL || 'https://crm-services.onrender.com'
    : 'http://localhost:3001';
  
  const callbackURL = process.env.GOOGLE_REDIRECT_URI || `${baseURL}/auth/google/callback`;
  
  googleLogger.info('🔧 Configurando Google OAuth Strategy', {
    environment: isProd ? 'PRODUÇÃO' : 'DESENVOLVIMENTO',
    baseURL,
    callbackURL,
    clientID: process.env.GOOGLE_CLIENT_ID ? 'CONFIGURADO' : 'NÃO CONFIGURADO',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'CONFIGURADO' : 'NÃO CONFIGURADO'
  });

  console.log(`🔧 Configurando Google OAuth para ambiente: ${isProd ? 'PRODUÇÃO' : 'DESENVOLVIMENTO'}`);
  console.log(`🔗 Callback URL: ${callbackURL}`);

  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: callbackURL
  },
  async (accessToken, refreshToken, profile, done) => {
    googleLogger.info('🚀 Iniciando processo de autenticação Google', {
      profileId: profile.id,
      email: profile.emails?.[0]?.value,
      displayName: profile.displayName,
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken
    });

    try {
      const client = await pool.connect();
      googleLogger.debug('✅ Conexão com banco estabelecida para autenticação');
      
      // Primeiro, verificar se usuário já existe pelo google_id
      googleLogger.debug('🔍 Verificando usuário existente por Google ID', { googleId: profile.id });
      
      const existingUserByGoogleId = await client.query(
        'SELECT * FROM usuarios WHERE google_id = $1',
        [profile.id]
      );
      
      googleLogger.debug('📊 Resultado busca por Google ID', {
        found: existingUserByGoogleId.rows.length > 0,
        userCount: existingUserByGoogleId.rows.length
      });
      
      let user;
      
      if (existingUserByGoogleId.rows.length > 0) {
        // Usuário já existe com google_id - atualizar último login
        user = existingUserByGoogleId.rows[0];
        
        googleLogger.info('👤 Usuário existente encontrado por Google ID', {
          userId: user.id,
          email: user.email,
          nome: user.nome,
          ativo: user.ativo
        });
        // Atualizar foto_perfil se vier do Google e (não existir ainda ou tiver mudado)
        let updated = false;
        const newPhoto = profile.photos && profile.photos[0] ? profile.photos[0].value : null;
        if (newPhoto && newPhoto !== user.foto_perfil) {
          await client.query(
            'UPDATE usuarios SET ultimo_login = CURRENT_TIMESTAMP, foto_perfil = $1 WHERE id = $2',
            [newPhoto, user.id]
          );
          updated = true;
          user.foto_perfil = newPhoto;
          googleLogger.debug('🖼️ Foto de perfil atualizada a partir do Google', { userId: user.id });
        } else {
          await client.query(
            'UPDATE usuarios SET ultimo_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
          );
        }
        
        googleLogger.debug('⏰ Último login atualizado para usuário', { userId: user.id, fotoAtualizada: updated });
        console.log(`✅ Login realizado: ${user.email}`);
        
      } else {
        googleLogger.debug('🔍 Usuário não encontrado por Google ID, verificando por email');
        
        // Verificar se existe usuário com o mesmo email (criado manualmente)
        const existingUserByEmail = await client.query(
          'SELECT * FROM usuarios WHERE email = $1',
          [profile.emails[0].value]
        );
        
        googleLogger.debug('📊 Resultado busca por email', {
          found: existingUserByEmail.rows.length > 0,
          userCount: existingUserByEmail.rows.length,
          email: profile.emails[0].value
        });
        
        if (existingUserByEmail.rows.length > 0) {
          // Usuário existe por email - vincular google_id
          user = existingUserByEmail.rows[0];
          
          googleLogger.info('🔗 Vinculando usuário existente ao Google', {
            userId: user.id,
            email: user.email,
            googleId: profile.id
          });
          
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
          
          googleLogger.info('✅ Usuário existente vinculado ao Google com sucesso', {
            userId: user.id,
            email: user.email
          });
          
          console.log(`✅ Usuário existente vinculado ao Google: ${user.email}`);
        } else {
          // Usuário não cadastrado no sistema
          googleLogger.warn('⚠️ Usuário não cadastrado tentando fazer login', {
            googleId: profile.id,
            email: profile.emails[0].value,
            nome: profile.displayName
          });
          
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
      googleLogger.debug('🔌 Conexão com banco liberada');
      
      // Verificar se usuário está ativo
      if (!user.ativo && !user.status_auth) {
        googleLogger.warn('❌ Usuário inativo tentando fazer login', {
          userId: user.id,
          email: user.email
        });
        
        user.status_auth = 'inativo';
        return done(null, user);
      }

      // Se usuário tem status especial (inativo ou não cadastrado), não gerar tokens
      if (user.status_auth) {
        googleLogger.info('🚫 Retornando usuário com status especial sem tokens', {
          email: user.email,
          status: user.status_auth
        });
        return done(null, user);
      }

      // Gerar tokens apenas para usuários válidos
      googleLogger.debug('🔑 Gerando tokens para usuário válido', {
        userId: user.id,
        email: user.email,
        role: user.role
      });
      
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
      
      googleLogger.info('✅ Autenticação Google concluída com sucesso', {
        userId: user.id,
        email: user.email,
        hasToken: !!token,
        hasRefreshToken: !!refreshTokenJWT
      });
      
      return done(null, user);
      
    } catch (error) {
      googleLogger.error('❌ Erro durante autenticação Google', {
        error: error.message,
        stack: error.stack,
        profileId: profile?.id,
        email: profile?.emails?.[0]?.value
      });
      
      console.error('❌ Erro na autenticação Google:', error);
      return done(error, null);
    }
  }));
  
  // Serialização para sessão
  passport.serializeUser((user, done) => {
    authLogger.debug('📝 Serializando usuário para sessão', {
      userId: user.id || 'N/A',
      email: user.email || 'N/A'
    });
    done(null, user.id);
  });
  
  // Deserialização da sessão
  passport.deserializeUser(async (id, done) => {
    authLogger.debug('📖 Deserializando usuário da sessão', { userId: id });
    
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT * FROM usuarios WHERE id = $1', [id]);
      client.release();
      
      if (result.rows.length > 0) {
        authLogger.debug('✅ Usuário deserializado com sucesso', {
          userId: id,
          email: result.rows[0].email
        });
        done(null, result.rows[0]);
      } else {
        authLogger.warn('❌ Usuário não encontrado durante deserialização', { userId: id });
        done(new Error('Usuário não encontrado'), null);
      }
    } catch (error) {
      authLogger.error('❌ Erro durante deserialização', {
        userId: id,
        error: error.message
      });
      done(error, null);
    }
  });
};

module.exports = {
  configureGoogleStrategy
};
