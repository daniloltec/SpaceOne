Regras de negócio
ID	Regra
RN01	Uma sala não pode ter duas reservas ativas sobrepostas (garantido também por constraint no banco).
RN02	Salas diferentes podem ter reuniões no mesmo horário.
RN03	Não há limite de duração. É possível reservar a sala pelo dia inteiro.
RN04	Só ADMIN, GESTOR e RECEPCAO reservam. Colaboradores só participam como convidados.
RN05	No tablet não há login. Quem reserva escolhe o responsável numa lista de pessoas com podeReservar = true.
RN06	Cancelam a reserva: quem a criou, o responsável (se tiver login), a RECEPCAO e o ADMIN.
RN07	Participantes são opcionais. Convite e lembrete só vão para os selecionados.
RN08	A quantidade de participantes não pode exceder a capacidade da sala.
RN09	Reservas não podem ser criadas no passado.
RN10	Cadastro de salas, ranking e estatísticas são exclusivos do ADMIN. 

Salas e recursos (ADMIN)
RF01 Cadastrar, editar, ativar e desativar salas (nome, capacidade, descrição, foto).
RF02 Associar recursos a cada sala, com quantidade.
RF03 Gerenciar o catálogo de recursos.
RF04 Gerar e exibir o link/token do tablet de cada sala.
Pessoas e usuários
RF05 Cadastrar setores.
RF06 Cadastrar pessoas (nome, e-mail, setor, podeReservar).
RF07 Criar usuários de login com perfil ADMIN, GESTOR ou RECEPCAO.
RF08 Login por e-mail e senha, com sessão segura.
RF09 Controle de acesso por perfil em todas as rotas e APIs.

Reservas
RF10 Criar reserva (sala, data, início, fim, responsável, assunto, participantes opcionais).
RF11 A recepção escolhe qualquer pessoa como responsável. O gestor é o responsável pelas próprias reservas.
RF12 Validar conflito de horário e capacidade antes de salvar.
RF13 Ao criar, gerar o evento no Google Agenda com link do Google Meet.
RF14 Enviar o convite por e-mail aos participantes selecionados, com o link do Meet.
RF15 Cancelar reserva, removendo o evento do Google Agenda e avisando os participantes.
RF16 Atualização automática de status: AGENDADA → EM_ANDAMENTO → CONCLUIDA.
RF17 Lembrete por e-mail antes da reunião, só para os participantes e o responsável, com antecedência configurável.

Telas do computador
RF18 Tela inicial: status atual das salas (livre, ocupada, reunião em breve) e lista das próximas reservas com sala e responsável.
RF19 Calendário com as reuniões das salas, visões dia, semana e mês, com filtro por sala.
RF20 Tela de criar reserva com sugestão de horários livres.
RF21 Gestor e recepção veem apenas o calendário e a criação/cancelamento de reservas.
RF22 Ranking de quem mais reserva (ADMIN).
RF23 Estatísticas (ADMIN): média de reuniões por dia por sala, tempo médio de reunião por responsável, taxa de ocupação, horários de pico, com filtro por período.

Tablet da sala (sem login)
RF24 🟢 Disponível: fundo verde, botão “Clique aqui para reservar”, próximos horários livres do dia e opção de escolher outro dia.
RF25 🟠 Reunião em breve: fundo laranja, aparece X minutos antes do início (configurável), com assunto e responsável.
RF26 🔴 Em reunião: fundo vermelho, responsável, assunto e contagem regressiva até o fim da reunião.
RF27 Fluxo de reserva no tablet: escolher responsável, horário e duração, quantidade de pessoas e participantes (opcional).
RF28 O tablet atualiza em tempo real quando há mudança de reserva, com fallback por polling.
RF29 Modo tela cheia, sem navegação para o resto do sistema.
Integrações
RF30 Google Agenda: sincronizar criação e cancelamento.
RF31 Google Meet: link gerado automaticamente em cada reserva.
RF32 Envio de e-mail (SMTP ou Gmail API).
RF33 N8N: cadastro da conexão (URL do webhook, segredo, eventos). O sistema envia webhooks assinados nos eventos selecionados. Nenhum fluxo ou alerta é configurado agora.

Requisitos não funcionais
RNF01 Todo o sistema roda em Docker Compose na VPS (app + PostgreSQL), com deploy por git pull seguido de docker compose up -d --build.
RNF02 Interface responsiva, e telas do tablet otimizadas para toque, com fontes grandes.
RNF03 Fuso horário America/Fortaleza, com datas salvas em UTC.
RNF04 Senhas com hash (bcrypt/argon2), cookies httpOnly, proteção CSRF e validação de entrada.
RNF05 Credenciais só em variáveis de ambiente. Nada no repositório.
RNF06 Log de auditoria das ações relevantes.
RNF07 Backup do volume do PostgreSQL documentado.