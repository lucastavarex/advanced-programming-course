const hre = require("hardhat");

async function main() {
  console.log("Iniciando deploy do contrato CRID...");

  // Obter contas
  const [deployer, secretaria] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", await hre.ethers.provider.getBalance(deployer.address));

  // Deploy do contrato
  const CRID = await hre.ethers.getContractFactory("CRID");
  const crid = await CRID.deploy(secretaria.address);

  await crid.waitForDeployment();

  const contractAddress = await crid.getAddress();
  console.log("CRID deployed to:", contractAddress);
  console.log("Secretaria Acadêmica definida como:", secretaria.address);

  // Verificar o contrato (opcional - apenas para redes de teste públicas)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("Aguardando confirmações antes de verificar...");
    await crid.deploymentTransaction().wait(6);
    
    console.log("Verificando contrato...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [secretaria.address],
      });
    } catch (error) {
      console.log("Erro ao verificar:", error);
    }
  }

  // Exemplo de uso do contrato
  console.log("\n--- Exemplo de Uso ---");
  
  // Dados de exemplo
  const infoAluno = {
    nome: "João da Silva",
    matricula: "2023001",
    curso: "Engenharia de Software",
    unidade: "Escola de Tecnologia",
    centro: "Centro de Ciências Exatas",
    formacao: "Bacharelado",
    periodo: 5,
    ativo: true,
    dataEmissao: 0
  };

  const disciplinas = [
    {
      controle: 1001,
      codigo: "PROG101",
      nome: "Programação Avançada",
      cargaHoraria: 60,
      creditos: 4,
      situacao: "Inscrição normal",
      observacao: ""
    },
    {
      controle: 1002,
      codigo: "BD201",
      nome: "Banco de Dados",
      cargaHoraria: 45,
      creditos: 3,
      situacao: "Inscrição normal",
      observacao: ""
    }
  ];

  // Criar hash e assinar - replicando o que o contrato faz
  let dadosCompletos = hre.ethers.solidityPacked(
    ["string", "string", "string", "uint8"],
    [infoAluno.nome, infoAluno.matricula, infoAluno.curso, infoAluno.periodo]
  );

  // Adicionar disciplinas ao hash
  for (const disc of disciplinas) {
    dadosCompletos = hre.ethers.solidityPacked(
      ["bytes", "string", "string", "uint16", "uint8"],
      [dadosCompletos, disc.codigo, disc.nome, disc.cargaHoraria, disc.creditos]
    );
  }

  const hashDocumento = hre.ethers.keccak256(dadosCompletos);
  const assinatura = await secretaria.signMessage(hre.ethers.getBytes(hashDocumento));

  // Registrar CRID
  console.log("Registrando CRID de exemplo...");
  const tx = await crid.connect(secretaria).registrarCRID(infoAluno, disciplinas, assinatura);
  await tx.wait();

  console.log("CRID registrado com sucesso!");
  console.log("Transaction hash:", tx.hash);

  // Consultar CRID
  const cridRegistrado = await crid.consultarCRID(infoAluno.matricula);
  console.log("\nCRID Registrado:");
  console.log("- Aluno:", cridRegistrado.aluno.nome);
  console.log("- Matrícula:", cridRegistrado.aluno.matricula);
  console.log("- Total de disciplinas:", cridRegistrado.disciplinas.length);
  console.log("- Total de créditos:", cridRegistrado.totalCreditos.toString());
  console.log("- Total de horas:", cridRegistrado.totalHoras.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 