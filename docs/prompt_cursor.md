Você é um engenheiro full-stack sênior. Construa o sistema SpaceOne (Controle de Salas de Reunião) do zero, neste repositório, seguindo a especificação abaixo. Antes de codar, leia tudo, proponha o plano de fases em poucas linhas e então implemente fase por fase, rodando e testando a cada fase.

## CONTEXTO
Empresa sem nenhum controle de salas de reunião hoje. Haverá 3 salas, cada uma com um tablet fixo na porta mostrando o status (livre / reunião em breve / em reunião) e permitindo reservar sem login. Um painel web no computador serve admin, gestores e recepção. A empresa usa Google Workspace (Agenda + Meet). Tudo deve rodar 100% na VPS do cliente, em Docker, sem serviços externos de banco/auth.

## STACK (obrigatória)
- Next.js (App Router) + TypeScript + Tailwind CSS
- PostgreSQL 16 via Docker
- Prisma (schema + migrations)
- Auth.js (NextAuth) com Credentials (e-mail + senha, hash argon2 ou bcrypt)
- Zod para validação, date-fns + date-fns-tz para datas
- Fuso: America/Fortaleza (salvar em UTC)
- Tempo real do tablet: SSE (route handler) com fallback de polling a cada 15s
- Jobs agendados (lembretes, virada de status): processo worker separado no mesmo compose (node-cron) ou instrumentação do Next. Prefira um container "worker" separado.
- Google: googleapis (Calendar API) com Service Account + domain-wide delegation. Documente como configurar. Alternativa: OAuth, se preferir, explicando o motivo.
- E-mail: nodemailer via SMTP (variáveis de ambiente).

## BANCO DE DADOS
Use exatamente o schema Prisma abaixo e adicione a migration SQL manual com a exclusion constraint (btree_gist) que impede reservas sobrepostas na mesma sala (status != CANCELADA) e o CHECK fim > inicio. [COLE AQUI O SCHEMA PRISMA E O SQL DO ITEM 1 DA DOCUMENTAÇÃO]

Seed: 1 ADMIN (e-mail/senha por env), recursos padrão (Câmera, Microfone, Televisão, Computador, Quadro branco, Ar-condicionado), configs lembrete_minutos_antes=15 e aviso_laranja_minutos_antes=15.

## PERFIS E PERMISSÕES
- ADMIN: tudo. Exclusivo: cadastro de salas/recursos, ranking, estatísticas, usuários, integrações.
- GESTOR: login; vê o calendário das salas; cria reservas (como responsável); cancela as próprias.
- RECEPCAO: login; vê o calendário; cria reservas em nome de qualquer pessoa com podeReservar; cancela qualquer reserva.
- Colaborador: sem login; só aparece como participante.
- Tablet: sem login, protegido por tabletToken na URL (/tablet/[token]). Só permite ver o status da própria sala e criar reserva nela. O responsável é escolhido numa lista de pessoas com podeReservar=true.
Imponha permissões no servidor (middleware + checagem em cada route handler/server action), nunca só na UI.

## REGRAS DE NEGÓCIO
1. Sem sobreposição na mesma sala. Salas diferentes podem ter reuniões simultâneas.
2. Sem limite de duração (pode reservar o dia todo).
3. Não criar reserva no passado.
4. qtdParticipantes <= capacidade da sala.
5. Participantes são opcionais; convite e lembrete só para os selecionados (+ responsável).
6. Cancelamento: quem criou, recepção, admin.
7. Ao criar reserva: criar evento no Google Agenda com conferenceData (Meet), sendUpdates, guardar meetLink e googleEventId. Se o Google falhar, a reserva NÃO deve ser perdida: salve, marque erro de sincronização e tente novamente pelo worker.
8. Ao cancelar: remover/cancelar o evento no Google e avisar participantes.
9. Tratar a corrida de duas reservas simultâneas capturando o erro da exclusion constraint e devolvendo mensagem amigável ("Horário acabou de ser ocupado").

## TELAS DO COMPUTADOR
- /login
- / (dashboard): cards de status atual de cada sala (livre/ocupada/em breve, com responsável e tempo restante) + lista das próximas reservas (sala, horário, responsável, assunto).
- /calendario: calendário dia/semana/mês com filtro por sala, cor por sala; clicar em um horário abre criar reserva; clicar em reserva abre detalhes com botão cancelar (conforme permissão).
- /reservas/nova: sala, data, início, fim, responsável (recepção escolhe qualquer um; gestor fixo nele mesmo), assunto, participantes (multiselect opcional). Mostrar horários livres da sala escolhida.
- /admin/salas: CRUD com upload de foto (salvar em volume Docker /data/uploads, servido pelo app), capacidade e recursos com quantidade.
- /admin/pessoas e /admin/usuarios: CRUD de setores, pessoas e usuários.
- /admin/estatisticas: ranking de quem mais reservou; média de reuniões por dia por sala; tempo médio de reunião por responsável; taxa de ocupação; horários de pico; filtro por período; gráficos simples (recharts).
- /admin/integracoes: cadastro da conexão N8N (webhookUrl, segredo, eventos). O sistema envia POST assinado (HMAC SHA256 no header) nos eventos reserva.criada, reserva.cancelada, reserva.iniciada, reserva.finalizada. NÃO criar nenhum fluxo ou alerta no N8N; só a conexão e o envio dos eventos. Mostrar também o status da integração Google.

## TABLET (/tablet/[token]) — tela cheia, toque, fontes grandes
Três estados, com fundo de cor sólida e muito contraste:
- 🟢 DISPONÍVEL (verde): nome da sala, capacidade, recursos em ícones, botão gigante "Clique aqui para reservar". Ao tocar: escolher responsável (lista), horário (próximos horários livres do dia em botões + opção "Outro dia" com seletor de data), duração (atalhos 30min/1h/2h/dia todo + personalizado), quantidade de pessoas, participantes (opcional, multiselect por nome), assunto. Confirmar.
- 🟠 REUNIÃO EM BREVE (laranja): aparece X minutos antes do início (config aviso_laranja_minutos_antes); mostra "Reunião prestes a começar", assunto, responsável e horário.
- 🔴 EM REUNIÃO (vermelho): "Em reunião", responsável, assunto e contagem regressiva até o fim (ex.: reservou 30min às 10:30 → às 10:30 inicia 30:00 e vai até 00:00). Ao zerar, o tablet volta sozinho para verde (ou laranja, se houver outra reunião logo em seguida).
O estado é calculado no servidor (fonte de verdade) e enviado por SSE; o cliente mantém a contagem localmente e sincroniza com o relógio do servidor. Tela deve voltar sozinha ao estado inicial após inatividade no fluxo de reserva (60s). Evitar suspensão de tela quando possível (Wake Lock API).

## ESTRUTURA SUGERIDA
/prisma (schema, migrations, seed)
/src/app (rotas), /src/components, /src/lib (auth, db, google, mail, reservas, estatisticas, n8n), /src/worker (jobs)
/docker (Dockerfile app, Dockerfile worker opcional)
docker-compose.yml, .env.example, README.md (deploy e configuração do Google)

## DOCKER E DEPLOY
Entregue um docker-compose.yml com:
- db: postgres:16, volume nomeado, healthcheck
- app: build do Dockerfile multi-stage (Next.js standalone), roda `prisma migrate deploy` na inicialização, depende do db saudável, expõe a porta via variável, volume /data/uploads
- worker: mesmo build/imagem, comando diferente, roda jobs
Deploy esperado na VPS: `git pull && docker compose up -d --build`. Escreva no README o passo a passo, incluindo uso atrás de proxy reverso (a VPS usa EasyPanel/Traefik; a porta do app deve ser configurável) e backup do volume do Postgres.
.env.example com: DATABASE_URL, AUTH_SECRET, AUTH_URL, ADMIN_EMAIL, ADMIN_PASSWORD, TZ=America/Fortaleza, GOOGLE_SERVICE_ACCOUNT_JSON (ou caminho), GOOGLE_IMPERSONATE_USER, SMTP_HOST/PORT/USER/PASS/FROM, APP_URL.

## JOBS DO WORKER (a cada minuto)
- Atualizar status: AGENDADA → EM_ANDAMENTO → CONCLUIDA.
- Enviar lembretes (lembrete_minutos_antes) a participantes que ainda não receberam; marcar lembreteEnviadoEm.
- Reenviar sincronização com Google das reservas com falha.
- Disparar eventos para o N8N (com retry simples).

## FASES
1. Setup, Docker Compose, Prisma, migrations, seed, auth e permissões.
2. CRUD de salas, recursos, setores, pessoas, usuários.
3. Motor de reservas (validações, conflito, cancelamento) + calendário + criar reserva.
4. Tablet com os 3 estados, fluxo de reserva e tempo real.
5. Google Agenda/Meet + e-mails + lembretes (worker).
6. Dashboard, ranking e estatísticas.
7. Conexão N8N, auditoria, README final, testes (reservas/conflito e permissões) e revisão de segurança.

## CRITÉRIOS DE ACEITE
- Dois usuários tentando reservar a mesma sala no mesmo horário: só um consegue.
- 3 reuniões no mesmo horário em 3 salas diferentes funcionam.
- Tablet muda de cor sozinho (verde → laranja → vermelho → verde) sem recarregar.
- Reserva cria evento com Meet e e-mail para os participantes selecionados; cancelar remove o evento.
- Gestor e recepção não acessam estatísticas nem cadastro de salas (nem por URL nem por API).
- `git pull && docker compose up -d --build` sobe o sistema completo em VPS limpa.

Comece apresentando o plano e a estrutura de pastas; depois implemente a Fase 1.