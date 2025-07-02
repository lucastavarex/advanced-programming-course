const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CRID - Contrato de Confirmação de Registro de Inscrição em Disciplinas", function () {
  let crid;
  let owner;
  let secretaria;
  let aluno;
  let outraPessoa;

  // Função auxiliar para criar assinatura válida
  async function criarAssinaturaValida(infoAluno, disciplinas, signer) {
    // Replicar exatamente o que o contrato faz em _calcularHashDocumento
    let dadosCompletos = ethers.solidityPacked(
      ["string", "string", "string", "uint8"],
      [infoAluno.nome, infoAluno.matricula, infoAluno.curso, infoAluno.periodo]
    );

    for (const disc of disciplinas) {
      dadosCompletos = ethers.solidityPacked(
        ["bytes", "string", "string", "uint16", "uint8"],
        [dadosCompletos, disc.codigo, disc.nome, disc.cargaHoraria, disc.creditos]
      );
    }

    const hashDocumento = ethers.keccak256(dadosCompletos);
    return await signer.signMessage(ethers.getBytes(hashDocumento));
  }

  // Dados de exemplo baseados no CRID real
  const infoAlunoExemplo = {
    nome: "LUCAS TAVARES DA SILVA FERREIRA",
    matricula: "120152739",
    curso: "Engenharia de Computação e Informação",
    unidade: "Escola Politécnica",
    centro: "Centro de Tecnologia",
    formacao: "Bacharelado",
    periodo: 10,
    ativo: true,
    dataEmissao: 0 // Será preenchido pelo contrato
  };

  const disciplinasExemplo = [
    {
      controle: 16340,
      codigo: "COC602",
      nome: "COC602 - Mineração de Dados - ECI",
      cargaHoraria: 90,
      creditos: 5,
      situacao: "Inscrição normal",
      observacao: ""
    },
    {
      controle: 4282,
      codigo: "EEL770",
      nome: "SISTEMAS OPERACIONAIS EL1",
      cargaHoraria: 75,
      creditos: 5,
      situacao: "Inscrição normal",
      observacao: ""
    },
    {
      controle: 16337,
      codigo: "COS603",
      nome: "Eng.Sist.Software Contemporâneos",
      cargaHoraria: 90,
      creditos: 4,
      situacao: "Inscrição trancada",
      observacao: ""
    }
  ];

  beforeEach(async function () {
    // Obter signers
    [owner, secretaria, aluno, outraPessoa] = await ethers.getSigners();

    // Deploy do contrato
    const CRID = await ethers.getContractFactory("CRID");
    crid = await CRID.deploy(secretaria.address);
    await crid.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Deve definir o owner corretamente", async function () {
      expect(await crid.owner()).to.equal(owner.address);
    });

    it("Deve definir a secretaria acadêmica corretamente", async function () {
      expect(await crid.secretariaAcademica()).to.equal(secretaria.address);
    });

    it("Deve falhar ao tentar fazer deploy com endereço zero para secretaria", async function () {
      const CRID = await ethers.getContractFactory("CRID");
      await expect(CRID.deploy(ethers.ZeroAddress)).to.be.revertedWith("Endereco invalido");
    });
  });

  describe("Registro de CRID", function () {
    it("Deve registrar um CRID com sucesso", async function () {
      // Criar assinatura válida
      const assinatura = await criarAssinaturaValida(infoAlunoExemplo, disciplinasExemplo, secretaria);

      // Registrar CRID
      const tx = await crid.connect(secretaria).registrarCRID(
        infoAlunoExemplo,
        disciplinasExemplo,
        assinatura
      );

      // Verificar evento emitido (não vamos testar o hash específico, apenas que foi emitido)
      await expect(tx).to.emit(crid, "CRIDRegistrado");

      // Verificar se foi salvo corretamente
      const cridSalvo = await crid.consultarCRID(infoAlunoExemplo.matricula);
      expect(cridSalvo.aluno.nome).to.equal(infoAlunoExemplo.nome);
      expect(cridSalvo.aluno.matricula).to.equal(infoAlunoExemplo.matricula);
      expect(cridSalvo.disciplinas.length).to.equal(disciplinasExemplo.length);
      expect(cridSalvo.totalCreditos).to.equal(14); // 5 + 5 + 4
      expect(cridSalvo.totalHoras).to.equal(255); // 90 + 75 + 90
    });

    it("Deve falhar se não for a secretaria tentando registrar", async function () {
      const assinatura = "0x00"; // Assinatura inválida
      
      await expect(
        crid.connect(aluno).registrarCRID(infoAlunoExemplo, disciplinasExemplo, assinatura)
      ).to.be.revertedWith("Apenas a secretaria pode executar esta funcao");
    });

    it("Deve falhar com matrícula vazia", async function () {
      const infoAlunoInvalido = { ...infoAlunoExemplo, matricula: "" };
      const assinatura = "0x00";
      
      await expect(
        crid.connect(secretaria).registrarCRID(infoAlunoInvalido, disciplinasExemplo, assinatura)
      ).to.be.revertedWith("Matricula invalida");
    });

    it("Deve falhar sem disciplinas", async function () {
      const assinatura = "0x00";
      
      await expect(
        crid.connect(secretaria).registrarCRID(infoAlunoExemplo, [], assinatura)
      ).to.be.revertedWith("Deve haver pelo menos uma disciplina");
    });
  });

  describe("Consultas", function () {
    beforeEach(async function () {
      // Registrar um CRID para testes usando a função auxiliar
      const assinatura = await criarAssinaturaValida(infoAlunoExemplo, disciplinasExemplo, secretaria);

      await crid.connect(secretaria).registrarCRID(
        infoAlunoExemplo,
        disciplinasExemplo,
        assinatura
      );
    });

    it("Deve consultar CRID mais recente com sucesso", async function () {
      const cridConsultado = await crid.consultarCRID(infoAlunoExemplo.matricula);
      
      expect(cridConsultado.aluno.nome).to.equal(infoAlunoExemplo.nome);
      expect(cridConsultado.aluno.matricula).to.equal(infoAlunoExemplo.matricula);
      expect(cridConsultado.disciplinas.length).to.equal(3);
    });

    it("Deve falhar ao consultar matrícula inexistente", async function () {
      await expect(
        crid.consultarCRID("999999999")
      ).to.be.revertedWith("Nenhum CRID encontrado para esta matricula");
    });

    it("Deve retornar histórico completo de CRIDs", async function () {
      // Registrar um segundo CRID para o mesmo aluno
      const novoInfoAluno = { ...infoAlunoExemplo, periodo: 11 };
      
      const assinatura = await criarAssinaturaValida(novoInfoAluno, [disciplinasExemplo[0]], secretaria);

      await crid.connect(secretaria).registrarCRID(
        novoInfoAluno,
        [disciplinasExemplo[0]], // Apenas uma disciplina
        assinatura
      );

      const historico = await crid.consultarHistoricoCRID(infoAlunoExemplo.matricula);
      expect(historico.length).to.equal(2);
      expect(historico[0].aluno.periodo).to.equal(10);
      expect(historico[1].aluno.periodo).to.equal(11);
    });

    it("Deve retornar quantidade correta de CRIDs", async function () {
      const quantidade = await crid.quantidadeCRIDs(infoAlunoExemplo.matricula);
      expect(quantidade).to.equal(1);
    });
  });

  describe("Verificação de Autenticidade", function () {
    let assinaturaValida;

    beforeEach(async function () {
      // Criar assinatura válida usando a função auxiliar
      assinaturaValida = await criarAssinaturaValida(infoAlunoExemplo, disciplinasExemplo, secretaria);

      await crid.connect(secretaria).registrarCRID(
        infoAlunoExemplo,
        disciplinasExemplo,
        assinaturaValida
      );
    });

    it("Deve verificar autenticidade com assinatura válida", async function () {
      const tx = await crid.verificarAutenticidade(
        infoAlunoExemplo.matricula,
        infoAlunoExemplo.periodo,
        assinaturaValida
      );

      await expect(tx).to.emit(crid, "CRIDVerificado")
        .withArgs(infoAlunoExemplo.matricula, true);

      const resultado = await crid.verificarAutenticidade.staticCall(
        infoAlunoExemplo.matricula,
        infoAlunoExemplo.periodo,
        assinaturaValida
      );
      expect(resultado).to.be.true;
    });

    it("Deve falhar verificação com assinatura inválida", async function () {
      const assinaturaInvalida = "0x" + "00".repeat(65);
      
      const tx = await crid.verificarAutenticidade(
        infoAlunoExemplo.matricula,
        infoAlunoExemplo.periodo,
        assinaturaInvalida
      );

      await expect(tx).to.emit(crid, "CRIDVerificado")
        .withArgs(infoAlunoExemplo.matricula, false);

      const resultado = await crid.verificarAutenticidade.staticCall(
        infoAlunoExemplo.matricula,
        infoAlunoExemplo.periodo,
        assinaturaInvalida
      );
      expect(resultado).to.be.false;
    });

    it("Deve verificar hash de documento", async function () {
      // O hash é calculado internamente e armazenado
      // Vamos verificar através dos eventos (sem filtrar por matrícula já que não é indexed)
      const filter = crid.filters.CRIDRegistrado();
      const events = await crid.queryFilter(filter);
      
      expect(events.length).to.be.greaterThan(0);
      const hashDocumento = events[0].args[2];
      
      const ehValido = await crid.verificarHashDocumento(hashDocumento);
      expect(ehValido).to.be.true;
    });
  });

  describe("Gerenciamento da Secretaria", function () {
    it("Deve permitir que o owner atualize a secretaria", async function () {
      const tx = await crid.connect(owner).atualizarSecretaria(outraPessoa.address);
      
      await expect(tx).to.emit(crid, "SecretariaAtualizada")
        .withArgs(outraPessoa.address);
      
      expect(await crid.secretariaAcademica()).to.equal(outraPessoa.address);
    });

    it("Deve falhar se não for o owner tentando atualizar", async function () {
      await expect(
        crid.connect(aluno).atualizarSecretaria(outraPessoa.address)
      ).to.be.revertedWithCustomError(crid, "OwnableUnauthorizedAccount");
    });

    it("Deve falhar ao tentar definir endereço zero", async function () {
      await expect(
        crid.connect(owner).atualizarSecretaria(ethers.ZeroAddress)
      ).to.be.revertedWith("Endereco invalido");
    });
  });

  describe("Testes de Segurança", function () {
    it("Deve proteger contra replay attacks usando assinaturas diferentes", async function () {
      // Primeira assinatura para período 10
      const assinatura1 = await criarAssinaturaValida(infoAlunoExemplo, [disciplinasExemplo[0]], secretaria);

      await crid.connect(secretaria).registrarCRID(
        infoAlunoExemplo,
        [disciplinasExemplo[0]],
        assinatura1
      );

      // Tentar usar a mesma assinatura para período diferente
      const infoAlunoNovoPeriodo = { ...infoAlunoExemplo, periodo: 11 };
      
      await expect(
        crid.connect(secretaria).registrarCRID(
          infoAlunoNovoPeriodo,
          [disciplinasExemplo[0]],
          assinatura1 // Mesma assinatura
        )
      ).to.be.revertedWith("Assinatura invalida");
    });

    it("Deve garantir integridade dos dados através do hash", async function () {
      // Registrar CRID
      const assinatura = await criarAssinaturaValida(infoAlunoExemplo, [disciplinasExemplo[0]], secretaria);

      await crid.connect(secretaria).registrarCRID(
        infoAlunoExemplo,
        [disciplinasExemplo[0]],
        assinatura
      );

      // Verificar que diferentes dados geram hashes diferentes
      const infoModificada = { ...infoAlunoExemplo, nome: "NOME ALTERADO" };
      
      // Simular o hash para dados modificados
      let dadosOriginais = ethers.solidityPacked(
        ["string", "string", "string", "uint8"],
        [infoAlunoExemplo.nome, infoAlunoExemplo.matricula, infoAlunoExemplo.curso, infoAlunoExemplo.periodo]
      );
      
      let dadosModificados = ethers.solidityPacked(
        ["string", "string", "string", "uint8"],
        [infoModificada.nome, infoModificada.matricula, infoModificada.curso, infoModificada.periodo]
      );

      const hashOriginal = ethers.keccak256(dadosOriginais);
      const hashModificado = ethers.keccak256(dadosModificados);

      expect(hashOriginal).to.not.equal(hashModificado);
    });
  });

  describe("Casos Extremos", function () {
    it("Deve lidar com múltiplas disciplinas corretamente", async function () {
      // Criar array com 10 disciplinas
      const muitasDisciplinas = Array(10).fill(null).map((_, i) => ({
        controle: 1000 + i,
        codigo: `DISC${i}`,
        nome: `Disciplina ${i}`,
        cargaHoraria: 60,
        creditos: 4,
        situacao: "Inscrição normal",
        observacao: ""
      }));

      const assinatura = await criarAssinaturaValida(infoAlunoExemplo, muitasDisciplinas, secretaria);

      await crid.connect(secretaria).registrarCRID(
        infoAlunoExemplo,
        muitasDisciplinas,
        assinatura
      );

      const cridSalvo = await crid.consultarCRID(infoAlunoExemplo.matricula);
      expect(cridSalvo.disciplinas.length).to.equal(10);
      expect(cridSalvo.totalCreditos).to.equal(40); // 10 * 4
      expect(cridSalvo.totalHoras).to.equal(600); // 10 * 60
    });

    it("Deve calcular totais corretamente com valores variados", async function () {
      const disciplinasVariadas = [
        { ...disciplinasExemplo[0], cargaHoraria: 30, creditos: 2 },
        { ...disciplinasExemplo[1], cargaHoraria: 45, creditos: 3 },
        { ...disciplinasExemplo[2], cargaHoraria: 120, creditos: 8 }
      ];

      const assinatura = await criarAssinaturaValida(infoAlunoExemplo, disciplinasVariadas, secretaria);

      await crid.connect(secretaria).registrarCRID(
        infoAlunoExemplo,
        disciplinasVariadas,
        assinatura
      );

      const cridSalvo = await crid.consultarCRID(infoAlunoExemplo.matricula);
      expect(cridSalvo.totalCreditos).to.equal(13); // 2 + 3 + 8
      expect(cridSalvo.totalHoras).to.equal(195); // 30 + 45 + 120
    });
  });
});
