const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');
const cors = require('cors');

const app = express();
const port = 3000;

// Configuração do banco de dados
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '1234',
  database: 'estetica_db'
});

db.connect((err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err);
    return;
  }
  console.log('Conectado ao banco de dados MySQL');
});

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'segredo',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Mude para true se estiver usando HTTPS
}));

// Middleware para verificar autenticação
const verificarAutenticacao = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Não autorizado' });
  }
};

// Rota para login
app.post('/login', (req, res) => {
  const { email, senha } = req.body;
  const query = 'SELECT * FROM usuarios WHERE email = ?';
  
  db.query(query, [email], async (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Erro ao fazer login' });
      return;
    }
    
    if (results.length === 0) {
      res.status(401).json({ error: 'Usuário não encontrado' });
      return;
    }
    
    const user = results[0];
    
    try {
      if (await bcrypt.compare(senha, user.senha)) {
        req.session.userId = user.id;
        req.session.userType = user.tipo;
        res.json({ success: true, userType: user.tipo });
      } else {
        res.status(401).json({ error: 'Senha incorreta' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Erro ao fazer login' });
    }
  });
});

// Rota para cadastro
app.post('/cadastro', async (req, res) => {
  const { nome, email, senha, tipo } = req.body;
  
  try {
    const hashedSenha = await bcrypt.hash(senha, 10);
    const query = 'INSERT INTO usuarios (nome, email, senha, tipo) VALUES (?, ?, ?, ?)';
    
    db.query(query, [nome, email, hashedSenha, tipo], (err, result) => {
      if (err) {
        res.status(500).json({ error: 'Erro ao cadastrar usuário' });
        return;
      }
      res.status(201).json({ success: true });
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao cadastrar usuário' });
  }
});

// Rota para obter dados do usuário
app.get('/user-data', verificarAutenticacao, (req, res) => {
  const query = 'SELECT nome, email, tipo FROM usuarios WHERE id = ?';
  db.query(query, [req.session.userId], (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Erro ao obter dados do usuário' });
      return;
    }
    res.json(results[0]);
  });
});

// Rota para obter serviços
app.get('/api/servicos', (req, res) => {
  const query = 'SELECT * FROM servicos';
  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Erro ao obter serviços' });
      return;
    }
    const servicos = results.map(servico => ({
      ...servico,
      preco: parseFloat(servico.preco)
    }));
    res.json(servicos);
  });
});

// Rota para agendar serviço
app.post('/api/agendar', verificarAutenticacao, (req, res) => {
  const { servicoId, data, horario } = req.body;
  const query = 'INSERT INTO agendamentos (usuario_id, servico_id, data, horario, concluida) VALUES (?, ?, ?, ?, 0)';
  
  db.query(query, [req.session.userId, servicoId, data, horario], (err, result) => {
    if (err) {
      res.status(500).json({ error: 'Erro ao agendar serviço' });
      return;
    }
    res.status(201).json({ success: true });
  });
});

// Rota para obter horários disponíveis
app.get('/api/horarios-disponiveis', (req, res) => {
  const { servicoId, data } = req.query;
  const query = 'SELECT horario FROM agendamentos WHERE servico_id = ? AND data = ?';
  
  db.query(query, [servicoId, data], (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Erro ao obter horários disponíveis' });
      return;
    }
    const horariosOcupados = results.map(row => row.horario);
    const todosHorarios = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
    const horariosDisponiveis = todosHorarios.filter(horario => !horariosOcupados.includes(horario));
    res.json(horariosDisponiveis);
  });
});

// Rota para obter itens do portfólio
app.get('/portfolio', (req, res) => {
  const query = 'SELECT * FROM portfolio';
  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Erro ao obter itens do portfólio' });
      return;
    }
    res.json(results);
  });
});

// Rota para adicionar item ao portfólio (apenas para proprietária)
app.post('/adicionar-portfolio', verificarAutenticacao, (req, res) => {
  if (req.session.userType !== 'proprietaria') {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  const { titulo, descricao, imagem } = req.body;
  const query = 'INSERT INTO portfolio (titulo, descricao, imagem) VALUES (?, ?, ?)';
  
  db.query(query, [titulo, descricao, imagem], (err, result) => {
    if (err) {
      res.status(500).json({ error: 'Erro ao adicionar item ao portfólio' });
      return;
    }
    res.status(201).json({ success: true });
  });
});

// Rota para obter consultas do usuário
app.get('/api/minhas-consultas', verificarAutenticacao, (req, res) => {
  const query = `
    SELECT a.id, s.nome as servico, s.preco, a.data, a.horario, a.concluida
    FROM agendamentos a
    JOIN servicos s ON a.servico_id = s.id
    WHERE a.usuario_id = ?
    ORDER BY a.data, a.horario
  `;
  
  db.query(query, [req.session.userId], (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Erro ao obter consultas' });
      return;
    }
    res.json(results);
  });
});

// Rota para obter dados financeiros (apenas para proprietária)
app.get('/dados-financeiros', verificarAutenticacao, (req, res) => {
  if (req.session.userType !== 'proprietaria') {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  const query = `
    SELECT 
      DATE_FORMAT(a.data, '%Y-%m-01') as mes,
      SUM(CASE WHEN a.concluida = 1 THEN s.preco ELSE 0 END) as lucro,
      0 as gastos
    FROM 
      agendamentos a
    JOIN 
      servicos s ON a.servico_id = s.id
    GROUP BY 
      DATE_FORMAT(a.data, '%Y-%m-01')
    ORDER BY 
      mes
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Erro ao obter dados financeiros' });
      return;
    }
    res.json(results);
  });
});

// Rota para obter todas as consultas (apenas para proprietária)
app.get('/todas-consultas', verificarAutenticacao, (req, res) => {
  if (req.session.userType !== 'proprietaria') {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  const query = `
    SELECT a.id, u.nome as cliente, s.nome as servico, s.preco, a.data, a.horario, a.concluida
    FROM agendamentos a
    JOIN usuarios u ON a.usuario_id = u.id
    JOIN servicos s ON a.servico_id = s.id
    ORDER BY a.data, a.horario
  `;
  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Erro ao obter consultas' });
      return;
    }
    res.json(results);
  });
});

// Rota para concluir consulta
app.post('/concluir-consulta', verificarAutenticacao, (req, res) => {
  if (req.session.userType !== 'proprietaria') {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  const { appointmentId } = req.body;
  const query = 'UPDATE agendamentos SET concluida = 1 WHERE id = ?';
  
  db.query(query, [appointmentId], (err, result) => {
    if (err) {
      res.status(500).json({ error: 'Erro ao concluir consulta' });
      return;
    }
    res.json({ success: true });
  });
});

// Rota para obter detalhes de um serviço específico
app.get('/api/servicos/:id', (req, res) => {
  const query = 'SELECT * FROM servicos WHERE id = ?';
  db.query(query, [req.params.id], (err, results) => {
    if (err) {
      console.error('Erro ao obter detalhes do serviço:', err);
      res.status(500).json({ error: 'Erro ao obter detalhes do serviço' });
      return;
    }
    if (results.length === 0) {
      res.status(404).json({ error: 'Serviço não encontrado' });
      return;
    }
    
    const servico = results[0];
    servico.preco = parseFloat(servico.preco);
    
    res.json(servico);
  });
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
  console.log(`Acesse o sistema através do link: http://localhost:${port}`);
});