const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

// Basic middleware
app.use(express.json());

// Simple test route
app.get('/', (req, res) => {
  res.json({ message: 'Server is working', status: 'OK' });
});

// Serve static files
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'frontend/crm-frontend/build')));
  
  app.get('/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/crm-frontend/build/index.html'));
  });
}

app.listen(port, () => {
  console.log(`Simple server running on port ${port}`);
});

module.exports = app;
