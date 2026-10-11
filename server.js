const express = require('express');
const cors = require('cors');
const fs = require('node:fs');
const path = require('node:path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve o arquivo index.html automaticamente na raiz '/'
app.use(express.static(path.join(__dirname)));

const caminhoArquivo = path.join(__dirname, 'rede-social.json');

// Carrega e valida os dados atualizados do JSON em tempo real
function carregarDados() {
    const dados = JSON.parse(fs.readFileSync(caminhoArquivo, 'utf8'));
    const usuarios = new Map(dados.users.map((u) => [u.id, u]));
    const adjacencias = new Map(dados.users.map((u) => [u.id, []]));

    for (const [idA, idB] of dados.friendships) {
        if (adjacencias.has(idA) && adjacencias.has(idB)) {
            adjacencias.get(idA).push(idB);
            adjacencias.get(idB).push(idA);
        }
    }
    return { usuarios, adjacencias, friendships: dados.friendships };
}

// Lógica de BFS para as rotas da API
function executarBfsApi(origemId, adjacencias) {
    const fila = [origemId];
    let inicioFila = 0;
    const visitados = new Set([origemId]);
    const predecessores = new Map([[origemId, null]]);
    const distancias = new Map([[origemId, 0]]);

    while (inicioFila < fila.length) {
        const atual = fila[inicioFila++];
        for (const vizinho of adjacencias.get(atual)) {
            if (!visitados.has(vizinho)) {
                visitados.add(vizinho);
                predecessores.set(vizinho, atual);
                distancias.set(vizinho, distancias.get(atual) + 1);
                fila.push(vizinho);
            }
        }
    }
    return { predecessores, distancias };
}

function reconstruirCaminhoApi(destinoId, predecessores) {
    if (!predecessores.has(destinoId)) return null;
    const caminho = [];
    let atual = destinoId;
    while (atual !== null) {
        caminho.push(atual);
        atual = predecessores.get(atual);
    }
    return caminho.reverse();
}

// Rota 1: Retorna os dados da rede em tempo real
app.get('/api/rede', (req, res) => {
    const { usuarios, friendships } = carregarDados();
    res.json({ users: Array.from(usuarios.values()), friendships });
});

// Rota 2: Calcula o caminho mínimo entre dois nós
app.post('/api/caminho', (req, res) => {
    const { origemId, destinoId } = req.body;
    const { usuarios, adjacencias } = carregarDados();

    if (!usuarios.has(origemId) || !usuarios.has(destinoId)) {
        return res.status(400).json({ error: 'Usuários inválidos.' });
    }

    const { predecessores, distancias } = executarBfsApi(origemId, adjacencias);
    const caminho = reconstruirCaminhoApi(destinoId, predecessores);
    const distancia = distancias.get(destinoId);

    res.json({
        caminho: caminho || [],
        distancia: distancia !== undefined ? distancia : null,
        existeCaminho: caminho !== null
    });
});

// Rota 3: Encontra o par mais distante da rede
app.get('/api/par-mais-distante', (req, res) => {
    const { usuarios, adjacencias } = carregarDados();
    let parMaisDistante = null;
    let maiorDistancia = -1;
    const ids = Array.from(usuarios.keys());

    for (let i = 0; i < ids.length; i++) {
        const { distancias } = executarBfsApi(ids[i], adjacencias);
        for (let j = i + 1; j < ids.length; j++) {
            const dist = distancias.get(ids[j]);
            if (dist !== undefined && dist > maiorDistancia) {
                maiorDistancia = dist;
                parMaisDistante = [ids[i], ids[j]];
            }
        }
    }

    res.json({
        par: parMaisDistante,
        distancia: maiorDistancia,
        nomeOrigem: parMaisDistante ? usuarios.get(parMaisDistante[0]).name : null,
        nomeDestino: parMaisDistante ? usuarios.get(parMaisDistante[1]).name : null
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});