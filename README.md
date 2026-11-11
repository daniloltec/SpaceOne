# SpaceOne

O escopo de implementação deste repositório é o controle de salas de reunião descrito em `docs/prompt_cursor.md` e `docs/rn/requisitos_funcionais.md`.

## Como executar

Pré-requisitos: Docker com Compose e, para desenvolvimento no host, Node.js 22 ou superior.

1. Copie `.env.example` para `.env`.
2. Troque `AUTH_SECRET`, `ADMIN_PASSWORD` e a senha do Postgres antes de publicar. Um segredo pode ser gerado com:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

3. Na VPS:

```bash
git pull && docker compose up -d --build
```

O Compose sobe PostgreSQL 16, o painel e um worker. Na inicialização o app aplica as migrations e o seed. O seed cria o administrador de `ADMIN_EMAIL` somente se ele ainda não existe, e não troca a senha depois. Também garante os recursos padrão e as configs `lembrete_minutos_antes=15` e `aviso_laranja_minutos_antes=15`.

Acesse `http://localhost:3000` (ou a porta de `APP_PORT`). O primeiro login usa `ADMIN_EMAIL` e `ADMIN_PASSWORD`.

Para desenvolver no host, suba só o banco e rode o app localmente:

```bash
docker compose up -d db
npx prisma migrate deploy
npm run db:seed
npm run dev
```

`DATABASE_URL` no `.env` aponta para `localhost` na porta `POSTGRES_PORT` (5433 por padrão, para não disputar com um Postgres já instalado na máquina). Dentro do Compose essa URL é trocada para o serviço `db`.

### Proxy reverso

O processo escuta a porta 3000 dentro da rede Docker. No EasyPanel/Traefik, aponte o domínio para essa porta do serviço `app`. Defina `AUTH_URL` e `APP_URL` com a URL pública, por exemplo `https://salas.exemplo.com`. O Postgres fica publicado só em `127.0.0.1`, para não ficar aberto na internet.

### Backup do Postgres

```bash
docker compose exec -T db pg_dump -U spaceone -d spaceone > backup-spaceone.sql
```

Para restaurar em uma base vazia:

```bash
docker compose exec -T db psql -U spaceone -d spaceone < backup-spaceone.sql
```

O volume nomeado `pgdata` guarda os dados. O volume `uploads` será usado pelas fotos das salas.

### Google Agenda

Ao criar uma reserva, o sistema grava no banco e tenta criar o evento com Meet na agenda da sala (`googleCalendarId`). Se o Google falhar, a reserva permanece e o worker tenta de novo. O cancelamento remove o evento e avisa os participantes. Sem `GOOGLE_SERVICE_ACCOUNT_JSON` ou sem agenda na sala, a reserva fica só no SpaceOne.

A conta de serviço precisa de delegação em todo o domínio no Google Workspace:

1. Criar uma service account no Google Cloud e baixar o JSON.
2. Ativar a Google Calendar API no projeto.
3. No admin do Workspace, autorizar o client ID da service account no escopo `https://www.googleapis.com/auth/calendar`.
4. Colocar o JSON em `GOOGLE_SERVICE_ACCOUNT_JSON` (o texto ou o caminho do arquivo) e o usuário a ser personificado em `GOOGLE_IMPERSONATE_USER`.
5. Em cada sala, informar o identificador da agenda do Google.
6. Preencher `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` e `SMTP_FROM` para o convite, o lembrete e o aviso de cancelamento.

O JSON e a senha do e-mail ficam só no servidor. O worker, a cada minuto, atualiza o status da reserva, envia o lembrete (`lembrete_minutos_antes`) e repete o que o Google ou o e-mail não concluíram.

### N8N

O N8N não faz parte deste Compose. Ele permanece na VPS, no IP ou domínio público que você já usa. Em `/admin/integracoes` o administrador informa a URL pública do webhook, o segredo e quais eventos enviar: `reserva.criada`, `reserva.cancelada`, `reserva.iniciada` e `reserva.finalizada`. O SpaceOne faz POST do JSON e coloca no cabeçalho `X-SpaceOne-Signature` o HMAC SHA256 do corpo, em hexadecimal, calculado com esse segredo. Endereços locais e redirecionamentos são recusados. Se o envio falhar, o worker tenta de novo até cinco vezes. Nenhum fluxo é criado no N8N por este sistema. O segredo fica no banco, então o backup do Postgres também o contém. Prefira `https` quando o webhook tiver domínio.

### Stack desta fase

| Camada | Tecnologia |
| --- | --- |
| Frontend e API | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Autenticação | Auth.js (NextAuth) com e-mail e senha (bcrypt) |
| Banco | PostgreSQL 16 e Prisma 6 |
| Datas | date-fns e date-fns-tz, fuso America/Fortaleza, gravação em UTC |
| Jobs | Worker separado com node-cron |
| Execução | Docker Compose |

## Salas e tablets

Cada sala cadastrada em `/admin/salas` recebe um link `/tablet/[token]`. Esse endereço fica no tablet fixado na porta e mostra só aquela sala. A tela fica verde quando a sala está livre, laranja minutos antes da próxima reunião e vermelha enquanto a reunião acontece. No verde, a pessoa reserva sem login: escolhe o responsável, o horário, a duração, a quantidade e os participantes. O estado chega por uma conexão contínua e, se ela cair, o tablet consulta de novo a cada 15 segundos. As fotos das salas ficam no volume `uploads`, na pasta definida por `UPLOAD_DIR`.

## Painel e estatísticas

A página inicial mostra o estado de cada sala no mesmo critério do tablet: livre, em breve ou ocupada, com o responsável e o tempo restante. A lista de próximas reservas continua abaixo. Em `/admin/estatisticas` o administrador filtra um período e vê quem mais reservou, a média de reuniões por dia em cada sala, o tempo médio por responsável, a taxa de ocupação e os horários de pico. Reserva cancelada não entra nessa conta. Gestor e recepção não abrem essa rota.

## Reservas locais

O calendário em `/calendario` mostra o dia, a semana e o mês, com filtro e cor por sala. A criação em `/reservas/nova` grava a reserva no banco, recusa horário no passado, sala desativada, excesso de capacidade e sobreposição na mesma sala. O cancelamento fica com quem criou, com a recepção e com o administrador. O link do Meet aparece na reserva quando a agenda da sala responde.

## Apresentação do projeto

O **SpaceOne** é uma proposta de plataforma digital modular, concebida
para centralizar informações, facilitar o acompanhamento de atividades e
oferecer uma visão organizada dos recursos e ambientes administrados.

A ideia é reunir, em um único lugar, funcionalidades que normalmente
ficam distribuídas entre diferentes ferramentas e processos. Com uma
estrutura flexível, o projeto pode ser configurado conforme a realidade
de cada operação, permitindo adaptações de identidade visual, regras,
módulos e dispositivos.

O SpaceOne está sendo concebido como um projeto-piloto e uma base
reutilizável: sua estrutura poderá ser clonada e ajustada para
diferentes contextos, sem depender de uma organização ou ambiente
específico.

## Objetivo

Oferecer uma experiência simples e centralizada para:

-   Organizar informações e recursos em uma interface única.
-   Acompanhar situações, solicitações e mudanças de status.
-   Facilitar a visualização da operação e de suas atividades.
-   Reduzir tarefas manuais por meio de eventos e automações.
-   Permitir integrações com ferramentas e dispositivos compatíveis.
-   Crescer por módulos, de acordo com as necessidades de cada
    implantação.

## Proposta de funcionalidades

As funcionalidades abaixo representam a proposta funcional do SpaceOne.
A disponibilidade de cada recurso depende da configuração e da etapa de
implementação do projeto.

### 1. Painel de visão geral

Uma área inicial para apresentar, de forma objetiva, as principais
informações da operação.

Pode reunir indicadores, itens pendentes, atividades recentes, alertas e
atalhos para os módulos mais utilizados. A intenção é permitir que o
usuário compreenda rapidamente o cenário atual sem precisar consultar
várias telas.

### 2. Gestão de ambientes e recursos

Organização dos ambientes e dos recursos associados a cada operação, com
informações centralizadas e visualização estruturada.

A configuração poderá ser adaptada para diferentes tipos de espaço,
equipamentos ou recursos compartilhados, conforme a finalidade da
implantação.

### 3. Acompanhamento de status

Visualização do estado de cada item acompanhado pelo sistema, com
situações identificáveis e histórico de alterações quando aplicável.

Esse acompanhamento ajuda a tornar os processos mais transparentes e
facilita a identificação de pendências ou necessidades de atenção.

### 4. Calendário e agendamentos

Possibilidade de organizar compromissos, reservas e atividades em uma
visualização de calendário.

A estrutura poderá contemplar integrações com serviços externos de
agenda, conforme a necessidade e a disponibilidade técnica de cada
implantação.

### 5. Reuniões virtuais

Possibilidade de associar atividades ou agendamentos a reuniões on-line,
incluindo integração com plataformas de videoconferência compatíveis.

A integração com serviços como Google Meet é uma possibilidade de
extensão, e não uma dependência obrigatória do projeto.

### 6. Monitoramento de dispositivos

Espaço para acompanhar informações de dispositivos conectados ou
cadastrados, conforme os recursos de integração disponíveis.

Esse módulo poderá evoluir para apresentar condições de funcionamento,
disponibilidade e alertas, de acordo com os equipamentos e protocolos
suportados.

### 7. Automações e eventos

Possibilidade de configurar ações a partir de eventos do sistema,
mudanças de status ou condições previamente definidas.

As automações podem reduzir tarefas repetitivas, padronizar etapas e
ajudar a manter os responsáveis informados. As regras devem ser
configuráveis para cada implantação.

### 8. Usuários e controle de acesso

A estrutura prevê a possibilidade de organizar usuários e permissões,
limitando o acesso às informações e funcionalidades conforme os perfis
definidos.

A configuração de acesso deve respeitar o contexto de uso, os níveis de
responsabilidade e as políticas de segurança adotadas em cada ambiente.

## Como a plataforma pode ser utilizada

O fluxo de uso pode ser organizado em etapas:

1.  **Configuração:** definição dos módulos, ambientes, recursos e
    regras que farão parte da implantação.
2.  **Cadastro:** inclusão das informações necessárias para a operação.
3.  **Utilização:** consulta, organização e atualização das informações
    pela interface.
4.  **Acompanhamento:** visualização de status, atividades, pendências e
    alertas.
5.  **Integração:** conexão opcional com agendas, reuniões, dispositivos
    e outros serviços compatíveis.
6.  **Evolução:** inclusão ou adaptação de módulos conforme novas
    necessidades.

## Arquitetura modular e adaptabilidade

Um dos princípios centrais do SpaceOne é a possibilidade de adaptação.

A plataforma deve servir como uma base que possa ser clonada e
personalizada para diferentes cenários. Cada implantação poderá
selecionar os módulos necessários, ajustar nomenclaturas, identidade
visual, permissões, regras e integrações.

Essa abordagem permite:

-   Reaproveitar uma base comum em projetos distintos.
-   Adaptar a experiência a diferentes dispositivos e tamanhos de tela.
-   Adicionar ou desativar módulos conforme o contexto.
-   Integrar serviços externos sem tornar essas integrações
    obrigatórias.
-   Evoluir a solução gradualmente, preservando sua proposta modular.

## Segurança e privacidade

A segurança deve ser considerada em todas as etapas do projeto. Entre os
princípios previstos estão:

-   Controle de acesso por usuário e perfil.
-   Restrição de funcionalidades conforme permissões.
-   Proteção das informações armazenadas e transmitidas.
-   Registro de eventos relevantes para auditoria, quando aplicável.
-   Configuração responsável de integrações e credenciais.
-   Coleta e utilização de dados limitadas ao necessário para cada
    finalidade.

Os mecanismos específicos de segurança deverão ser definidos e validados
durante a implementação de cada versão.

## Benefícios esperados

-   **Centralização:** informações e recursos organizados em um só
    ambiente.
-   **Visibilidade:** acompanhamento mais claro de status e atividades.
-   **Agilidade:** menos consultas dispersas e tarefas repetitivas.
-   **Flexibilidade:** módulos e regras adaptáveis a diferentes
    realidades.
-   **Integração:** possibilidade de conectar ferramentas e dispositivos
    compatíveis.
-   **Escalabilidade:** evolução gradual de acordo com a demanda.

## Evolução do projeto

O SpaceOne pode evoluir em ciclos, começando pelos recursos essenciais e
incorporando novas funcionalidades conforme a validação de uso.

As próximas etapas podem envolver o amadurecimento do painel, ampliação
dos recursos de gestão, integrações com agendas e videoconferência,
monitoramento de dispositivos e automações mais avançadas.

A priorização dessas entregas deve considerar a necessidade real dos
usuários, a viabilidade técnica e os requisitos de segurança de cada
implantação.

## Considerações finais

O SpaceOne nasce com a proposta de ser mais do que uma aplicação fechada
para um único cenário. Sua concepção modular busca oferecer uma base
reutilizável, personalizável e preparada para diferentes necessidades.

Ao centralizar informações, facilitar o acompanhamento e permitir
integrações graduais, o projeto estabelece um ponto de partida para
construir soluções específicas sem precisar começar do zero a cada nova
implantação.

------------------------------------------------------------------------

**SpaceOne --- uma base flexível para conectar recursos, informações e
operações.**
