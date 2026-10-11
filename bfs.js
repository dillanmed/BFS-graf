const fs = require('node:fs');
const path = require('node:path');

// Caminho absoluto para o arquivo JSON de dados
const caminhoArquivo = path.join(__dirname, 'rede-social.json');
const dados = JSON.parse(fs.readFileSync(caminhoArquivo, 'utf8'));

// Exemplo padrão de origem e destino
const exemploOrigemId = 'Dillan';
const exemploDestinoId = 'Felipe Carvalho';

// Mapeia os usuários para busca rápida por ID
const usuarios = new Map(dados.users.map((usuario) => [usuario.id, usuario]));

if (usuarios.size !== dados.users.length) {
    throw new Error('Existem identificadores de usuários repetidos no arquivo JSON.');
}

// Cria a lista de adjacências para o grafo não direcionado
const adjacencias = new Map(dados.users.map((usuario) => [usuario.id, []]));

for (const [idA, idB] of dados.friendships) {
    if (!adjacencias.has(idA) || !adjacencias.has(idB)) {
        throw new Error(`A amizade [${idA}, ${idB}] menciona um usuário inexistente.`);
    }
    adjacencias.get(idA).push(idB);
    adjacencias.get(idB).push(idA);
}

// Algoritmo de Busca em Largura (BFS)
function executarBfs(origemId) {
    if (!adjacencias.has(origemId)) {
        throw new Error(`O usuário "${origemId}" não existe no arquivo JSON.`);
    }

    const fila = [origemId];
    let inicioFila = 0;
    const visitados = new Set([origemId]);
    const predecessores = new Map([[origemId, null]]);
    const distancias = new Map([[origemId, 0]]);

    while (inicioFila < fila.length) {
        const usuarioAtual = fila[inicioFila];
        inicioFila += 1;

        for (const vizinho of adjacencias.get(usuarioAtual)) {
            if (!visitados.has(vizinho)) {
                visitados.add(vizinho);
                predecessores.set(vizinho, usuarioAtual);
                distancias.set(vizinho, distancias.get(usuarioAtual) + 1);
                fila.push(vizinho);
            }
        }
    }
    return { predecessores, distancias };
}

// Reconstrói o caminho mínimo a partir dos predecessores
function reconstruirCaminho(origemId, destinoId, predecessores) {
    if (!predecessores.has(destinoId)) {
        return null;
    }

    const caminho = [];
    let usuarioAtual = destinoId;

    while (usuarioAtual !== null) {
        caminho.push(usuarioAtual);
        usuarioAtual = predecessores.get(usuarioAtual);
    }

    caminho.reverse();
    return caminho;
}

function nomeDoUsuario(usuarioId) {
    return usuarios.get(usuarioId).name;
}

// Execução padrão no console
console.log('Lista de adjacência:');
for (const [usuarioId, vizinhos] of adjacencias) {
    const nomesDosVizinhos = vizinhos.map(nomeDoUsuario);
    console.log(`- ${nomeDoUsuario(usuarioId)}: ${nomesDosVizinhos.join(', ') || 'sem amizades'}`);
}

console.log(`\nConsulta de caminho mínimo: ${nomeDoUsuario(exemploOrigemId)} -> ${nomeDoUsuario(exemploDestinoId)}`);
const resultadoExemplo = executarBfs(exemploOrigemId);
const caminhoExemplo = reconstruirCaminho(
    exemploOrigemId,
    exemploDestinoId,
    resultadoExemplo.predecessores,
);

if (caminhoExemplo === null) {
    console.log('Não existe caminho entre esses dois usuários.');
} else {
    const distanciaExemplo = resultadoExemplo.distancias.get(exemploDestinoId);
    console.log(`Caminho mínimo: ${caminhoExemplo.map(nomeDoUsuario).join(' -> ')}`);
    console.log(`Distância: ${distanciaExemplo} conexão(ões)`);
}

// Cálculo do par de usuários conectados mais distantes
let parMaisDistante = null;
let maiorDistancia = -1;
const idsDosUsuarios = Array.from(usuarios.keys());

for (let indiceOrigem = 0; indiceOrigem < idsDosUsuarios.length; indiceOrigem += 1) {
    const origemId = idsDosUsuarios[indiceOrigem];
    const { distancias } = executarBfs(origemId);

    for (let indiceDestino = indiceOrigem + 1; indiceDestino < idsDosUsuarios.length; indiceDestino += 1) {
        const destinoId = idsDosUsuarios[indiceDestino];
        const distancia = distancias.get(destinoId);

        if (distancia !== undefined && distancia > maiorDistancia) {
            maiorDistancia = distancia;
            parMaisDistante = [origemId, destinoId];
        }
    }
}

console.log('\nPar de usuários conectados mais distantes:');
if (parMaisDistante === null) {
    console.log('Não há dois usuários conectados para comparar.');
} else {
    const [origemId, destinoId] = parMaisDistante;
    console.log(`${nomeDoUsuario(origemId)} e ${nomeDoUsuario(destinoId)}`);
    console.log(`Distância mínima: ${maiorDistancia} conexão(ões)`);
}
