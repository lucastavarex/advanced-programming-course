// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title CRID - Confirmação de Registro de Inscrição em Disciplinas
 * @dev Contrato inteligente para gerenciar registros de inscrição em disciplinas universitárias
 * @notice Este contrato permite que a universidade registre e os alunos verifiquem suas inscrições
 */
contract CRID is Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // Estrutura para representar uma disciplina
    struct Disciplina {
        uint16 controle;
        string codigo;
        string nome;
        uint16 cargaHoraria;
        uint8 creditos;
        string situacao;
        string observacao;
    }

    // Estrutura para representar as informações do aluno
    struct InfoAluno {
        string nome;
        string matricula;
        string curso;
        string unidade;
        string centro;
        string formacao;
        uint8 periodo;
        bool ativo;
        uint256 dataEmissao;
    }

    // Estrutura para representar um CRID completo
    struct RegistroCRID {
        InfoAluno aluno;
        Disciplina[] disciplinas;
        uint16 totalHoras;
        uint8 totalCreditos;
        bytes assinatura;
        bool valido;
    }

    // Mapeamento de matrícula para registros CRID
    mapping(string => RegistroCRID[]) private registrosPorMatricula;
    
    // Mapeamento de hash do documento para verificação de autenticidade
    mapping(bytes32 => bool) private hashesValidos;
    
    // Endereço autorizado a assinar CRIDs (secretaria acadêmica)
    address public secretariaAcademica;

    // Eventos
    event CRIDRegistrado(string matricula, uint256 periodo, bytes32 hashDocumento);
    event SecretariaAtualizada(address novaSecretaria);
    event CRIDVerificado(string matricula, bool valido);

    // Modificador para funções exclusivas da secretaria
    modifier apenasSecretaria() {
        require(msg.sender == secretariaAcademica, "Apenas a secretaria pode executar esta funcao");
        _;
    }

    constructor(address _secretaria) Ownable(msg.sender) {
        require(_secretaria != address(0), "Endereco invalido");
        secretariaAcademica = _secretaria;
    }

    /**
     * @dev Registra um novo CRID para um aluno
     * @param _infoAluno Informações do aluno
     * @param _disciplinas Array de disciplinas inscritas
     * @param _assinatura Assinatura digital do documento
     */
    function registrarCRID(
        InfoAluno memory _infoAluno,
        Disciplina[] memory _disciplinas,
        bytes memory _assinatura
    ) external apenasSecretaria {
        require(bytes(_infoAluno.matricula).length > 0, "Matricula invalida");
        require(_disciplinas.length > 0, "Deve haver pelo menos uma disciplina");
        
        // Calcula totais
        uint16 totalHoras = 0;
        uint8 totalCreditos = 0;
        
        for (uint256 i = 0; i < _disciplinas.length; i++) {
            totalHoras += _disciplinas[i].cargaHoraria;
            totalCreditos += _disciplinas[i].creditos;
        }
        
        // Cria o hash do documento
        bytes32 hashDocumento = _calcularHashDocumento(_infoAluno, _disciplinas);
        
        // Verifica a assinatura
        address recuperado = hashDocumento.toEthSignedMessageHash().recover(_assinatura);
        require(recuperado == secretariaAcademica, "Assinatura invalida");
        
        // Cria novo registro
        RegistroCRID storage novoRegistro = registrosPorMatricula[_infoAluno.matricula].push();
        
        // Preenche informações do aluno
        novoRegistro.aluno = _infoAluno;
        novoRegistro.aluno.dataEmissao = block.timestamp;
        
        // Adiciona disciplinas
        for (uint256 i = 0; i < _disciplinas.length; i++) {
            novoRegistro.disciplinas.push(_disciplinas[i]);
        }
        
        novoRegistro.totalHoras = totalHoras;
        novoRegistro.totalCreditos = totalCreditos;
        novoRegistro.assinatura = _assinatura;
        novoRegistro.valido = true;
        
        // Marca o hash como válido
        hashesValidos[hashDocumento] = true;
        
        emit CRIDRegistrado(_infoAluno.matricula, _infoAluno.periodo, hashDocumento);
    }

    /**
     * @dev Verifica se um CRID é autêntico
     * @param _matricula Matrícula do aluno
     * @param _periodo Período do CRID
     * @param _assinatura Assinatura a ser verificada
     * @return true se o CRID é autêntico
     */
    function verificarAutenticidade(
        string memory _matricula,
        uint8 _periodo,
        bytes memory _assinatura
    ) external returns (bool) {
        RegistroCRID[] memory registros = registrosPorMatricula[_matricula];
        
        for (uint256 i = 0; i < registros.length; i++) {
            if (registros[i].aluno.periodo == _periodo) {
                bool valido = keccak256(registros[i].assinatura) == keccak256(_assinatura);
                emit CRIDVerificado(_matricula, valido);
                return valido;
            }
        }
        
        emit CRIDVerificado(_matricula, false);
        return false;
    }

    /**
     * @dev Atualiza o endereço da secretaria acadêmica
     * @param _novaSecretaria Novo endereço da secretaria
     */
    function atualizarSecretaria(address _novaSecretaria) 
        external 
        onlyOwner 
    {
        require(_novaSecretaria != address(0), "Endereco invalido");
        secretariaAcademica = _novaSecretaria;
        emit SecretariaAtualizada(_novaSecretaria);
    }

    /**
     * @dev Consulta o CRID mais recente de um aluno
     * @param _matricula Matrícula do aluno
     * @return CRID mais recente do aluno
     */
    function consultarCRID(string memory _matricula) 
        external 
        view 
        returns (RegistroCRID memory) 
    {
        RegistroCRID[] memory registros = registrosPorMatricula[_matricula];
        require(registros.length > 0, "Nenhum CRID encontrado para esta matricula");
        
        return registros[registros.length - 1];
    }

    /**
     * @dev Consulta todos os CRIDs de um aluno
     * @param _matricula Matrícula do aluno
     * @return Array com todos os CRIDs do aluno
     */
    function consultarHistoricoCRID(string memory _matricula) 
        external 
        view 
        returns (RegistroCRID[] memory) 
    {
        return registrosPorMatricula[_matricula];
    }

    /**
     * @dev Retorna o total de CRIDs registrados para uma matrícula
     * @param _matricula Matrícula do aluno
     * @return Quantidade de CRIDs
     */
    function quantidadeCRIDs(string memory _matricula) 
        external 
        view 
        returns (uint256) 
    {
        return registrosPorMatricula[_matricula].length;
    }

    /**
     * @dev Verifica se um hash de documento é válido
     * @param _hashDocumento Hash do documento a ser verificado
     * @return true se o hash é válido
     */
    function verificarHashDocumento(bytes32 _hashDocumento) 
        external 
        view 
        returns (bool) 
    {
        return hashesValidos[_hashDocumento];
    }

    /**
     * @dev Calcula o hash de um documento CRID
     * @param _infoAluno Informações do aluno
     * @param _disciplinas Array de disciplinas
     * @return Hash do documento
     */
    function _calcularHashDocumento(
        InfoAluno memory _infoAluno,
        Disciplina[] memory _disciplinas
    ) private pure returns (bytes32) {
        bytes memory dadosCompletos = abi.encodePacked(
            _infoAluno.nome,
            _infoAluno.matricula,
            _infoAluno.curso,
            _infoAluno.periodo
        );
        
        for (uint256 i = 0; i < _disciplinas.length; i++) {
            dadosCompletos = abi.encodePacked(
                dadosCompletos,
                _disciplinas[i].codigo,
                _disciplinas[i].nome,
                _disciplinas[i].cargaHoraria,
                _disciplinas[i].creditos
            );
        }
        
        return keccak256(dadosCompletos);
    }
} 