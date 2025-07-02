# Smart Contract CRID - Sistema de Confirmação de Registro de Inscrição em Disciplinas

## 📋 Sobre o Projeto

Este projeto implementa um sistema de smart contract para gerenciar CRIDs (Confirmação de Registro de Inscrição em Disciplinas) de forma descentralizada e segura na blockchain Ethereum. O sistema permite que universidades registrem as inscrições dos alunos em disciplinas de forma imutável e verificável.

## 🎯 Funcionalidades Principais

- **Registro de CRIDs**: A secretaria acadêmica pode registrar novos CRIDs com assinatura digital
- **Verificação de Autenticidade**: Qualquer pessoa pode verificar se um CRID é autêntico
- **Consulta de Registros**: Alunos podem consultar seus CRIDs atuais e históricos
- **Segurança Criptográfica**: Uso de assinaturas digitais para garantir autenticidade
- **Imutabilidade**: Uma vez registrado, um CRID não pode ser alterado

## 🏗️ Arquitetura do Projeto

```
advanced-programming-course/
├── contracts/
│   └── CRID.sol            # Contrato principal
├── test/
│   └── CRID.test.js        # Testes unitários
├── scripts/
│   └── deploy.js           # Script de deploy
├── .github/
│   └── workflows/
│       └── ci-cd.yml       # Pipeline CI/CD
├── hardhat.config.js       # Configuração do Hardhat
├── package.json            # Dependências do projeto
└── README.md              # Este arquivo
```

## 🚀 Como Executar

### Pré-requisitos

- Node.js v18 ou superior
- NPM ou Yarn
- Git

### Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/advanced-programming-course.git
cd advanced-programming-course
```

2. Instale as dependências:
```bash
npm install
```

### Compilação

```bash
npm run compile
```

### Testes

Executar todos os testes:
```bash
npm test
```

Executar testes com relatório de cobertura:
```bash
npm run coverage
```

### Deploy Local

1. Inicie um node local do Hardhat:
```bash
npx hardhat node
```

2. Em outro terminal, faça o deploy:
```bash
npm run deploy
```

## 📊 Pipeline CI/CD

O projeto possui um pipeline completo de CI/CD usando GitHub Actions que executa:

1. **Testes Unitários**: Valida toda a lógica do contrato
2. **Análise de Cobertura**: Garante cobertura mínima de código
3. **Análise de Segurança**: Usa Slither para detectar vulnerabilidades
4. **Linting**: Verifica padrões de código com Solhint
5. **Análise de Gas**: Otimização de custos de transação
6. **Deploy Automático**: Para testnet (branch develop) 
7. **Documentação**: Geração automática de docs
8. **Release**: Criação de releases com artefatos

## 🔐 Decisões de Design

### 1. Estruturas de Dados

**Por que structs?**
- Organizamos os dados em structs (`InfoAluno`, `Disciplina`, `RegistroCRID`) para melhor legibilidade e manutenibilidade
- Facilita a extensão futura do sistema

### 2. Sistema de Assinaturas

**Por que assinaturas digitais?**
- Garante que apenas a secretaria autorizada pode emitir CRIDs
- Permite verificação off-chain da autenticidade
- Segue o padrão EIP-712 para assinaturas estruturadas

### 3. Armazenamento de Histórico

**Por que manter histórico completo?**
- Permite rastreabilidade completa do percurso acadêmico
- Arrays dinâmicos permitem número ilimitado de registros por aluno

### 4. Eventos

**Por que emitir eventos?**
- Facilita a indexação e busca de dados off-chain
- Permite que aplicações front-end monitorem mudanças em tempo real

### 5. Modificadores de Acesso

**Por que usar Ownable e modificadores customizados?**
- `Ownable` da OpenZeppelin é um padrão consolidado e auditado
- `apenasSecretaria` garante que apenas a secretaria pode registrar CRIDs

## 🧪 Cobertura de Testes

Os testes cobrem:

- ✅ Deploy e inicialização
- ✅ Registro de CRIDs
- ✅ Consultas e histórico
- ✅ Verificação de autenticidade
- ✅ Controle de acesso
- ✅ Proteção contra replay attacks
- ✅ Casos extremos (múltiplas disciplinas, valores variados)

## 🔍 Segurança

### Medidas Implementadas

1. **Controle de Acesso**: Apenas endereços autorizados podem registrar CRIDs
2. **Validação de Assinaturas**: Verificação criptográfica de todas as assinaturas
3. **Proteção contra Replay**: Cada CRID tem dados únicos que impedem reutilização
4. **Validação de Entrada**: Verificação de dados vazios ou inválidos

### Auditoria Automática

O pipeline executa Slither para análise estática de segurança em cada push.

## 📈 Otimizações de Gas

- Uso de `memory` vs `storage` otimizado
- Loops eficientes para cálculo de totais
- Armazenamento mínimo de dados on-chain

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 👨‍💻 Autores

Lucas Tavares da Silva Ferreira 
Vaz

## 🙏 Agradecimentos

- Cláudio Miceli, Professor do curso de Programação Avançada
- [Documentação do Solidity](https://docs.soliditylang.org/en/v0.8.30/)

