const express = require('express');
const router = express.Router();
const passport = require('passport');

// POST /api/auth/login
router.post('/login', (req, res, next) => {
  console.log('🔐 Login attempt for:', req.body.username);
  
  passport.authenticate('local-login', (err, user, info) => {
    if (err) {
      console.error('❌ Login error:', err);
      return res.status(500).json({ 
        success: false,
        error: 'Errore durante il login',
        details: err.message 
      });
    }
    
    if (!user) {
      console.log('🚫 Login failed:', info?.message);
      return res.status(401).json({ 
        success: false,
        error: 'Credenziali non valide',
        message: info?.message || 'Username o password errati'
      });
    }
    
    req.logIn(user, (err) => {
      if (err) {
        console.error('❌ Login session error:', err);
        return res.status(500).json({ 
          success: false,
          error: 'Errore nella creazione sessione' 
        });
      }
      
      console.log(`✅ User logged in: ${user.username} (${user.id})`);
      
      res.json({
        success: true,
        message: 'Login effettuato con successo',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          first_name: user.first_name,
          last_name: user.last_name
        }
      });
    });
  })(req, res, next);
});

// POST /api/auth/register
router.post('/register', (req, res, next) => {
  console.log('📝 Registration attempt for:', req.body.username);
  
  passport.authenticate('local-register', (err, user, info) => {
    if (err) {
      console.error('❌ Registration error:', err);
      return res.status(500).json({ 
        success: false,
        error: 'Errore durante la registrazione',
        details: err.message 
      });
    }
    
    if (!user) {
      console.log('🚫 Registration failed:', info?.message);
      return res.status(400).json({ 
        success: false,
        error: 'Registrazione fallita',
        message: info?.message || 'Dati non validi'
      });
    }
    
    req.logIn(user, (err) => {
      if (err) {
        console.error('❌ Auto-login after registration failed:', err);
        // Utente creato ma non loggato automaticamente
        return res.status(201).json({
          success: true,
          message: 'Utente registrato con successo. Effettua il login.',
          user: {
            id: user.id,
            username: user.username,
            email: user.email
          }
        });
      }
      
      console.log(`✅ User registered and logged in: ${user.username} (${user.id})`);
      
      res.status(201).json({
        success: true,
        message: 'Registrazione e login effettuati con successo',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          first_name: user.first_name,
          last_name: user.last_name
        }
      });
    });
  })(req, res, next);
});

// POST /api/auth/logout
router.post('/logout', (req, res, next) => {
  const username = req.user?.username || 'Unknown';
  
  req.logout((err) => {
    if (err) {
      console.error('❌ Logout error:', err);
      return res.status(500).json({ 
        success: false,
        error: 'Errore durante il logout' 
      });
    }
    
    console.log(`👋 User logged out: ${username}`);
    
    res.json({ 
      success: true,
      message: 'Logout effettuato con successo' 
    });
  });
});

// GET /api/auth/status
router.get('/status', (req, res) => {
  if (req.isAuthenticated() && req.user) {
    res.json({ 
      success: true,
      authenticated: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
        first_name: req.user.first_name,
        last_name: req.user.last_name
      }
    });
  } else {
    res.json({ 
      success: true,
      authenticated: false 
    });
  }
});

module.exports = router;