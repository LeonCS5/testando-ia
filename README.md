# Neon Labyrinth Demo

Este repositório contém um jogo procedural em Canvas implementado pela IA: `Neon Labyrinth`.

## Como executar

1. `cd /workspaces/testando-ia`
2. `python3 -m http.server 8000`
3. Abra `http://localhost:8000` no navegador

## Mecânica do jogo

- Controle o quadrado neon verde com Arrow/WASD.
- Alcance a saída neon rosa para avançar a fase.
- A cada 15 segundos o labirinto se regenera automaticamente.
- O jogador e a saída são reposicionados em células válidas.
- Partículas de trilha (move), shake de tela (colisão) e glitch visual (regen).

## Controles de interface (menu e retry)

- Tela inicial: `Enter` / `Space` para começar.
- Jogo: `ESC` volta ao menu.
- `R` reinicia o jogo ou fase.

## Estatísticas

- Score atual, melhor score, e tempo até próxima regeneração são exibidos.

## Notas

- Áudio embutido via WebAudio (sem arquivos externos).
- O algoritmo usa DFS + extra corredores para criar labirintos jogáveis.

## To do

- Adicionar efeitos sonoros adicionais e music loop.
- Implementar unlock de skins neon com pontuação.
