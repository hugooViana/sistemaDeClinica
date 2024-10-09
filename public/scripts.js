// Configuração da URL base da API
const API_BASE_URL = 'http://localhost:3000';

// Funções de utilidade
function redirecionarParaHome(userType) {
    if (userType === 'usuario') {
        window.location.href = 'home-usuario.html';
    } else if (userType === 'proprietaria') {
        window.location.href = 'home-proprietaria.html';
    }
}

async function fazerRequisicao(url, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include'
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}${url}`, options);
    if (!response.ok) {
        throw new Error(`Erro HTTP! status: ${response.status}`);
    }
    return await response.json();
}

// Login
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const senha = document.getElementById('senha').value;

        try {
            const data = await fazerRequisicao('/login', 'POST', { email, senha });
            if (data.success) {
                redirecionarParaHome(data.userType);
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Ocorreu um erro ao fazer login.');
        }
    });
}

// Cadastro
const cadastroForm = document.getElementById('cadastroForm');
if (cadastroForm) {
    cadastroForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = document.getElementById('nome').value;
        const email = document.getElementById('email').value;
        const senha = document.getElementById('senha').value;
        const tipo = document.getElementById('tipo').value;

        try {
            const data = await fazerRequisicao('/cadastro', 'POST', { nome, email, senha, tipo });
            if (data.success) {
                alert('Cadastro realizado com sucesso!');
                window.location.href = 'index.html';
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Ocorreu um erro ao cadastrar.');
        }
    });
}

// Carregar dados do usuário
async function carregarDadosUsuario() {
    try {
        const userData  = await fazerRequisicao('/user-data');
        document.getElementById('userName').textContent = userData.nome;
    } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
    }
}

// Carregar serviços
async function carregarServicos() {
    try {
        const servicos = await fazerRequisicao('/api/servicos');
        const listaServicos = document.getElementById('listaServicos');
        if (!listaServicos) {
            console.error('Elemento listaServicos não encontrado');
            return;
        }
        listaServicos.innerHTML = '';
        servicos.forEach(servico => {
            const servicoElement = document.createElement('div');
            servicoElement.className = 'servico-item';
            const preco = typeof servico.preco === 'number' ? servico.preco.toFixed(2) : 'Preço indisponível';
            servicoElement.innerHTML = `
                <h3>${servico.nome}</h3>
                <p>${servico.descricao}</p>
                <p><strong>Preço:</strong> R$ ${preco}</p>
                <button onclick="location.href='servico.html?id=${servico.id}'">Agendar</button>
            `;
            listaServicos.appendChild(servicoElement);
        });
    } catch (error) {
        console.error('Erro ao carregar serviços:', error);
    }
}

// Carregar detalhes do serviço e agendar
async function carregarDetalhesServico() {
    const urlParams = new URLSearchParams(window.location.search);
    const servicoId = urlParams.get('id');

    if (!servicoId) {
        console.error('ID do serviço não fornecido');
        return;
    }

    try {
        const servico = await fazerRequisicao(`/api/servicos/${servicoId}`);
        document.getElementById('nomeServico').textContent = servico.nome;
        document.getElementById('descricaoServico').textContent = servico.descricao;
        document.getElementById('precoServico').textContent = `Preço: R$ ${servico.preco.toFixed(2)}`;

        const dataAgendamento = document.getElementById('dataAgendamento');
        dataAgendamento.min = new Date().toISOString().split('T')[0];
        dataAgendamento.addEventListener('change', () => atualizarHorariosDisponiveis(servicoId));

        const formAgendamento = document.getElementById('formAgendamento');
        formAgendamento.onsubmit = (e) => agendarServico(e, servicoId);
    } catch (error) {
        console.error('Erro ao carregar detalhes do serviço:', error);
        alert('Ocorreu um erro ao carregar os detalhes do serviço.');
    }
}

// Função para atualizar horários disponíveis
async function atualizarHorariosDisponiveis(servicoId) {
    const data = document.getElementById('dataAgendamento').value;
    const horarioSelect = document.getElementById('horarioAgendamento');

    if (!data) {
        console.error('Data não selecionada');
        return;
    }

    try {
        const horariosDisponiveis = await fazerRequisicao(`/api/horarios-disponiveis?servicoId=${servicoId}&data=${data}`);
        console.log('Horários disponíveis:', horariosDisponiveis);

        horarioSelect.innerHTML = '<option value="">Selecione um horário</option>';
        horariosDisponiveis.forEach(horario => {
            const option = document.createElement('option');
            option.value = horario;
            option.textContent = horario;
            horarioSelect.appendChild(option);
        });

        if (horariosDisponiveis.length === 0) {
            horarioSelect.innerHTML = '<option value="">Nenhum horário disponível</option>';
        }

        horarioSelect.style.display = 'block';
    } catch (error) {
        console.error('Erro ao obter horários disponíveis:', error);
        alert('Ocorreu um erro ao carregar os horários disponíveis.');
    }
}

// Carregar portfólio
async function carregarPortfolio() {
    try {
        const portfolioItems = await fazerRequisicao('/portfolio');
        const listaPortfolio = document.getElementById('listaPortfolio');
        listaPortfolio.innerHTML = '';
        portfolioItems.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'portfolio-item';
            itemElement.innerHTML = `
                <h3>${item.titulo}</h3>
                <img src="${item.imagem}" alt="${item.titulo}" style="max-width: 200px;">
                <p>${item.descricao}</p>
            `;
            listaPortfolio.appendChild(itemElement);
        });

        // Mostrar formulário de adição apenas para proprietária
        const userData = await fazerRequisicao('/user-data');
        if (userData.tipo === 'proprietaria') {
            document.getElementById('adicionarPortfolio').style.display = 'block';
        }
    } catch (error) {
        console.error('Erro ao carregar portfólio:', error);
    }
}

// Adicionar item ao portfólio
const portfolioForm = document.getElementById('portfolioForm');
if (portfolioForm) {
    portfolioForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const titulo = document.getElementById('titulo').value;
        const descricao = document.getElementById('descricao').value;
        const imagem = document.getElementById('imagem').value;

        try {
            await fazerRequisicao('/adicionar-portfolio', 'POST', { titulo, descricao, imagem });
            alert('Item adicionado ao portfólio com sucesso!');
            carregarPortfolio();
        } catch (error) {
            console.error('Erro ao adicionar item ao portfólio:', error);
            alert('Ocorreu um erro ao adicionar o item ao portfólio.');
        }
    });
}

// Carregar dados da conta do usuário
async function carregarDadosConta() {
    try {
        const userData = await fazerRequisicao('/user-data');
        const dadosUsuario = document.getElementById('dadosUsuario');
        if (dadosUsuario) {
            dadosUsuario.innerHTML = `
                <p><strong>Nome:</strong> ${userData.nome}</p>
                <p><strong>Email:</strong> ${userData.email}</p>
            `;
        } else {
            console.error('Elemento dadosUsuario não encontrado');
        }

        const consultas = await fazerRequisicao('/api/minhas-consultas');
        const minhasConsultas = document.getElementById('minhasConsultas');
        if (minhasConsultas) {
            minhasConsultas.innerHTML = '';
            if (consultas.length === 0) {
                minhasConsultas.innerHTML = '<p>Você não tem consultas agendadas.</p>';
            } else {
                consultas.forEach(consulta => {
                    const consultaElement = document.createElement('div');
                    consultaElement.className = 'consulta-item';
                    consultaElement.innerHTML = `
                        <p><strong>Serviço:</strong> ${consulta.servico}</p>
                        <p><strong>Data:</strong> ${new Date(consulta.data).toLocaleDateString()}</p>
                        <p><strong>Horário:</strong> ${consulta.horario}</p>
                        <p><strong>Status:</strong> ${consulta.concluida ? 'Concluída' : 'Agendada'}</p>
                    `;
                    minhasConsultas.appendChild(consultaElement);
                });
            }
        } else {
            console.error('Elemento minhasConsultas não encontrado');
        }
    } catch (error) {
        console.error('Erro ao carregar dados da conta:', error);
    }
}

// Carregar dados da proprietária
async function carregarDadosProprietaria() {
    try {
        const dadosFinanceiros = await fazerRequisicao('/dados-financeiros');
        const todasConsultas = await fazerRequisicao('/todas-consultas');

        // Gráfico financeiro
        const ctxFinanceiro = document.getElementById('graficoFinanceiro').getContext('2d');
        const graficoFinanceiro = new Chart(ctxFinanceiro, {
            type: 'bar',
            data: {
                labels: dadosFinanceiros.map(d => {
                    const date = new Date(d.mes);
                    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
                }),
                datasets: [
                    {
                        label: 'Lucro',
                        data: dadosFinanceiros.map(d => d.lucro),
                        backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    },
                    {
                        label: 'Gastos',
                        data: dadosFinanceiros.map(d => d.gastos),
                        backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    }
                ]
            },
            options: {
                responsive: true,
                title: {
                    display: true,
                    text: 'Dados Financeiros'
                }
            }
        });

        // Gráfico de consultas
        const consultasPorMes = todasConsultas.reduce((acc, consulta) => {
            const mes = new Date(consulta.data).toLocaleString('default', { month: 'long' });
            acc[mes] = (acc[mes] || 0) + 1;
            return acc;
        }, {});

        const ctxConsultas = document.getElementById('graficoConsultas').getContext('2d');
        new Chart(ctxConsultas, {
            type: 'line',
            data: {
                labels: Object.keys(consultasPorMes),
                datasets: [{
                    label: 'Número de Consultas',
                    data: Object.values(consultasPorMes),
                    borderColor: 'rgba(54, 162, 235, 1)',
                    fill: false
                }]
            },
            options: {
                responsive: true,
                title: {
                    display: true,
                    text: 'Consultas por Mês'
                }
            }
        });

        // Função para atualizar consultas
        function atualizarConsultas() {
            // Exibir consultas agendadas
            const consultasAgendadas = todasConsultas.filter(c => !c.concluida);
            const consultasAgendadasElement = document.getElementById('consultasAgendadas');
            consultasAgendadasElement.innerHTML = '';
            consultasAgendadas.forEach(consulta => {
                const consultaElement = document.createElement('div');
                consultaElement.className = 'consulta-item';
                consultaElement.innerHTML = `
                    <p><strong>Cliente:</strong> ${consulta.cliente}</p>
                    <p><strong>Serviço:</strong> ${consulta.servico}</p>
                    <p><strong>Preço:</strong> R$ ${parseFloat(consulta.preco).toFixed(2)}</p>
                    <p><strong>Data:</strong> ${new Date(consulta.data).toLocaleDateString()}</p>
                    <p><strong>Horário:</strong> ${consulta.horario}</p>
                    <button onclick="concluirConsulta(${consulta.id})">Concluir</button>
                `;
                consultasAgendadasElement.appendChild(consultaElement);
            });

            // Exibir consultas concluídas
            const consultasConcluidas = todasConsultas.filter(c => c.concluida);
            const consultasConcluidasElement = document.getElementById('consultasConcluidas');
            consultasConcluidasElement.innerHTML = '';
            consultasConcluidas.forEach(consulta => {
                const consultaElement = document.createElement('div');
                consultaElement.className = 'consulta-item';
                consultaElement.innerHTML = `
                    <p><strong>Cliente:</strong> ${consulta.cliente}</p>
                    <p><strong>Serviço:</strong> ${consulta.servico}</p>
                    <p><strong>Preço:</strong> R$ ${parseFloat(consulta.preco).toFixed(2)}</p>
                    <p><strong>Data:</strong> ${new Date(consulta.data).toLocaleDateString()}</p>
                    <p><strong>Horário:</strong> ${consulta.horario}</p>
                `;
                consultasConcluidasElement.appendChild(consultaElement);
            });
        }

        atualizarConsultas();

        // Função para concluir consulta
        window.concluirConsulta = async function(consultaId) {
            try {
                await fazerRequisicao('/concluir-consulta', 'POST', { appointmentId: consultaId });
                const consulta = todasConsultas.find(c => c.id === consultaId);
                if (consulta) {
                    consulta.concluida = true;
                
                    // Atualizar gráfico financeiro
                    const mesConsulta = new Date(consulta.data).toLocaleString('default', { month: 'long', year: 'numeric' });
                    const mesIndex = graficoFinanceiro.data.labels.indexOf(mesConsulta);
                    if (mesIndex !== -1) {
                        graficoFinanceiro.data.datasets[0].data[mesIndex] += parseFloat(consulta.preco);
                        graficoFinanceiro.update();
                    }

                    atualizarConsultas();
                }
            } catch (error) {
                console.error('Erro ao concluir consulta:', error);
                alert('Ocorreu um erro ao concluir a consulta.');
            }
        };

    } catch (error) {
        console.error('Erro ao carregar dados da proprietária:', error);
    }
}

// Função para agendar serviço
async function agendarServico(e, servicoId) {
    e.preventDefault();
    const data = document.getElementById('dataAgendamento').value;
    const horario = document.getElementById('horarioAgendamento').value;

    if (!data || !horario) {
        alert('Por favor, selecione uma data e um horário.');
        return;
    }

    try {
        await fazerRequisicao('/api/agendar', 'POST', { servicoId, data, horario });
        alert('Serviço agendado com sucesso!');
        window.location.href = 'minha-conta.html';
    } catch (error) {
        console.error('Erro ao agendar serviço:', error);
        alert('Ocorreu um erro ao agendar o serviço.');
    }
}

// Inicialização das páginas
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    if (path.endsWith('/servicos.html')) {
        carregarServicos();
    } else if (path.endsWith('/servico.html')) {
        carregarDetalhesServico();
    } else if (path.endsWith('/home-usuario.html')) {
        carregarDadosUsuario();
    } else if (path.endsWith('/home-proprietaria.html')) {
        carregarDadosProprietaria();
    } else if (path.endsWith('/portfolio.html')) {
        carregarPortfolio();
    } else if (path.endsWith('/minha-conta.html')) {
        carregarDadosConta();
    }
});