const fs = require('node:fs');
const path = require('node:path');

// O caminho baseado em __dirname funciona mesmo quando o programa é iniciado de outra pasta.
const caminhoArquivo = path.join(__dirname, 'rede-social.json');
const dados = JSON.parse(fs.readFileSync(caminhoArquivo, 'utf8'));

// O exemplo pode ser alterado aqui, sem modificar a implementação da BFS.
const exemploOrigemId = 'Dillan';
const exemploDestinoId = 'Felipe Carvalho';

// Mantemos os usuários em Map para encontrar rapidamente seus nomes pelo identificador.
const usuarios = new Map(dados.users.map((usuario) => [usuario.id, usuario]));

if (usuarios.size !== dados.users.length) {
    throw new Error('Existem identificadores de usuários repetidos no arquivo JSON.');
}

// Cada usuário começa com uma lista vazia. Cada amizade é adicionada nos dois sentidos,
// pois uma amizade representa uma aresta de um grafo não direcionado.
const adjacencias = new Map(dados.users.map((usuario) => [usuario.id, []]));

for (const [idA, idB] of dados.friendships) {
    if (!adjacencias.has(idA) || !adjacencias.has(idB)) {
        throw new Error(`A amizade [${idA}, ${idB}] menciona um usuário inexistente.`);
    }

    adjacencias.get(idA).push(idB);
    adjacencias.get(idB).push(idA);
}

// BFS visita primeiro os usuários que estão a uma conexão, depois os que estão
// a duas, e assim por diante. Por isso, a primeira descoberta de cada usuário
// também registra um caminho mínimo até ele.
function executarBfs(origemId) {
    if (!adjacencias.has(origemId)) {
        throw new Error(`O usuário "${origemId}" não existe no arquivo JSON.`);
    }

    const fila = [origemId];
    let inicioFila = 0;
    const visitados = new Set([origemId]);
    const predecessores = new Map([[origemId, null]]);
    const distancias = new Map([[origemId, 0]]);

    // O índice evita remover o primeiro item com shift(), que reorganizaria a fila.
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

// Seguindo os predecessores do destino até a origem, recuperamos o caminho;
// depois o invertemos para apresentá-lo na ordem correta.
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

// Executamos uma BFS a partir de cada usuário e comparamos apenas pares ainda
// não avaliados. Usuários sem caminho entre si são ignorados.
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
    console.log('Em caso de empate, é exibido o primeiro par conforme a ordem dos usuários no JSON.');
}
