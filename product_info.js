/*
 * Criação do script para gerar botões 
 * e ações do botão e conexão com API
 * 
 * Utilizando JQuery como biblioteca, pois ja esta inserida no codigo do Bling
 */

/**
 * Cria um estilo para a tabela de informacoes do livro
 */
let styleTable = document.createElement("style");
styleTable.innerHTML = `
    .table-livro-info tbody tr td {
        font-size: 15px;
    }
`;
document.getElementsByTagName("head")[0].appendChild(styleTable);

/**
 * Cria um loader na pagina
 */
let loading = document.createElement('div');
loading.setAttribute("id", "elshaddai-loading");
loading.style.position = 'fixed';
loading.style.top = '50%';
loading.style.left = '50%';
loading.style.width = '200px';
loading.style.height = '200px';
loading.style.margin = '-100px 0 0 -100px';
loading.style.display = 'none';
loading.innerHTML = "<img src='https://github.com/elshaddaicode/bling/blob/main/loading.gif?raw=true'>";
document.body.append(loading);

/**
 * Variavel global para armazenar os dados do livro
 */
let infoLivro = [];

/**
 * Buscar preco promocional do produto
 * @param {string} codigoProduto 
 */
function buscaPrecoPromocional(codigoProduto) {
    const lojas = $.ajax({
        url: "https://www.bling.com.br/services/produtos.server.php?f=obterVinculoProdutosMultilojas",
        method: "POST",
        async: false,
        headers: {
            "session-token": $("#sessid").val()
        },
        data: {
            "xajax": "obterVinculoProdutosMultilojas",
            "xajaxargs[]": codigoProduto
        }
    }).responseText;

    const lojasJson = JSON.parse(lojas);
    infoLivro["precoPromocional"] = lojasJson.vinculosLojas[3].precoPromocional;
}

/**
 * Buscar dados de estoque do produto
 * @param {string} codigoProduto 
 */
function buscaEstoque(codigoProduto) {
    $.ajax({
        url: "https://www.bling.com.br/services/estoques.server.php?f=listarLancamentos",
        method: "POST",
        async: false,
        headers: {
            "session-token": $("#sessid").val()
        },
        data: {
            "xajax": "listarLancamentos",
            "xajaxargs[]": [
                "ultimos",
                codigoProduto
            ],
            "xajaxs": $("#sessid").val()
        },
        success: function (data) {
            const saldosPorDeposito = data.totais.saldosPorDeposito;

            for (let i = 0; i <= saldosPorDeposito.length - 1; i++) {
                // Estoque Geral
                if (saldosPorDeposito[i].descricao == 'Estoque Geral') {
                    let estoqueGeral = String(saldosPorDeposito[i].saldo);

                    if (estoqueGeral.indexOf(".") >= 0) {
                        estoqueGeral = estoqueGeral.split(".");
                        estoqueGeral = estoqueGeral[0];
                    }

                    infoLivro['estoque_geral'] = estoqueGeral;
                }

                // Loja Física
                if (saldosPorDeposito[i].descricao == 'Loja Física') {
                    let estoqueLojaFisica = String(saldosPorDeposito[i].saldo);

                    if (estoqueLojaFisica.indexOf(".") >= 0) {
                        estoqueLojaFisica = estoqueLojaFisica.split(".");
                        estoqueLojaFisica = estoqueLojaFisica[0];
                    }

                    infoLivro['estoque_loja_fisica'] = estoqueLojaFisica;
                }
            }
        }
    });
}

let infosProdutoTable = null;

let dadosProdutoClipboard = null;

/**
 * Busca os dados do produto e monta o modal de informacoes
 * @param {string} codigoProduto 
 */
function getProdutoData(codigoProduto) {
    $("#elshaddai-loading").show();

    const xmldata = $.ajax({
        url: "https://www.bling.com.br/services/produtos.server.php?f=obterProduto",
        method: "POST",
        async: false,
        headers: {
            "session-token": $("#sessid").val()
        },
        data: {
            "xajax": "obterProduto",
            "xajaxargs[]": codigoProduto
        }
    }).responseText;

    const parser = new DOMParser();
    const xml = parser.parseFromString(xmldata, "text/xml").documentElement;

    $(xml).find("cmd").each(function () {
        if ($(this).attr('t') == 'nome') {
            infoLivro["nome"] = $(this).text();
        }

        if ($(this).attr('t') == 'codigo') {
            infoLivro["codigo"] = $(this).text();
        }

        if ($(this).attr('t') == 'preco') {
            infoLivro["preco"] = $(this).text();
        }

        if ($(this).attr('t') == 'imagemURL') {
            const jsonDataImg = JSON.parse($(this).text());
            infoLivro["imagem"] = jsonDataImg['imagens'][0];
        }
    });

    // Preco Promocional
    buscaPrecoPromocional(codigoProduto);

    // Percentual de desconto
    let precoFormatado = infoLivro['preco'].replace(".", "");
    precoFormatado = precoFormatado.replace(",", ".");

    let precoPromocionalFormatado = infoLivro["precoPromocional"].replace(".", "");
    precoPromocionalFormatado = precoPromocionalFormatado.replace(",", ".");

    if (precoPromocionalFormatado == '0.00') {
        const desconto = "-";
        infoLivro["desconto"] = desconto;
    } else {
        const desconto = 100 - (parseFloat(precoPromocionalFormatado) * 100) / parseFloat(precoFormatado);
        infoLivro["desconto"] = Math.round(desconto);
    }

    // Estoque
    buscaEstoque(codigoProduto);

    // Coloca os dados no modal e exibe
    // Titulo
    $("#info-modal .modal-title").html('');
    $("#info-modal .modal-title").html(infoLivro["nome"]);

    // Imagem
    $("#info-modal .livro-imagem").html('');
    $("#info-modal .livro-imagem").html("<img src='" + infoLivro["imagem"] + "' width='100%'>");

    infosProdutoTable = `
        <table class="table table-bordered table-striped table-livro-info">
            <tbody>
                <tr>
                    <td>Código</td>
                    <td>` + infoLivro["codigo"] + `</td>
                </tr>
                <tr>
                    <td>Título</td>
                    <td>` + infoLivro["nome"] + `</td>
                </tr>
                <tr>
                    <td>De</td>
                    <td>R$ ` + infoLivro["preco"] + `</td>
                </tr>
                <tr>
                    <td>Por</td>
                    <td>R$ ` + infoLivro["precoPromocional"] + `</td>
                </tr>
                <tr>
                    <td>Desconto</td>
                    <td>` + infoLivro["desconto"] + `%</td>
                </tr>
                <tr>
                    <td>Estoque geral</td>
                    <td>` + infoLivro["estoque_geral"] + ` unidade(s)</td>
                </tr>
                <tr>
                    <td>Estoque lj. física</td>
                    <td>` + infoLivro["estoque_loja_fisica"] + ` unidade(s)</td>
                </tr>
            </tbody>
        </table>
    `

    dadosProdutoClipboard = `
        Código: ${infoLivro["codigo"].trim()}
        Nome: ${infoLivro["nome"].trim()}
        De: ${infoLivro["preco"].trim()}
        Por: ${infoLivro["precoPromocional"].trim()}
    `.trim()

    // Info
    $("#info-modal .livro-info").html('');
    $("#info-modal .livro-info").html(infosProdutoTable);

    $("#info-modal .modal-footer").html(`
        <button type="button" style="background-color: #0984e3" onclick="copiarHtmlFormatado()" class="btn btn-primary call-to-action" data-dismiss="modal">
            Copiar Para Email
        </button>
        <button type="button" onclick="copiarTextoSimples()" class="btn btn-primary call-to-action" data-dismiss="modal">
            Copiar Para WhatsApp
        </button>
        <button type="button" class="btn btn-secondary" data-dismiss="modal">Fechar</button>
    `)

    setTimeout(function () {
        $("#elshaddai-loading").hide();
        $("#info-modal").modal("show");
    }, 1000);
}

/*
    Função que copia as informações do produto para a área de transferência.
*/
function copiarHtmlFormatado() {
    if (!navigator.clipboard) {
        console.log('Clipboard não suportado!')
        return
    }
    const blob = new Blob([infosProdutoTable], { type: "text/html" });
    const clipboardItem = new window.ClipboardItem({ "text/html": blob });
    navigator.clipboard.write([clipboardItem]).then(() => {
        console.log("Texto formatado copiado para a área de transferência!");
    }).catch(err => {
        console.error("Erro ao copiar texto formatado: ", err);
    });
}

function copiarTextoSimples() {
    if (!navigator.clipboard) {
        console.log('Clipboard não suportado!')
        return
    }
    navigator.clipboard.writeText(dadosProdutoClipboard).then(() => {
        console.log("Texto simples copiado para a área de transferência!");
    }).catch(err => {
        console.error("Erro ao copiar texto simples: ", err);
    });
}

/**
 * Function que cria os botões de +INFO em cada produto
 */
createButtons = function () {
    $(".context-menu-item .btn-group").each(function () {
        // Product ID
        const produtoId = $(this).parent().parent().attr("id");

        if (produtoId != "" && produtoId != undefined) {
            $(this).append(`
                <button id="btn-details-${produtoId}"
                    onclick="getProdutoData(${produtoId});"
                    class="bling-button call-to-action fas fa-plus info-button"
                    style="width: auto; margin: 3px 10px 3px 0;">
                        <span class="text-add hide-on-minimize">
                            INFO
                        </span>
                </button>
            `);
        }
    });

    // Modal de informação
    const modalHtml = `
        <div class="modal fade" id="info-modal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h4 class="modal-title" style="font-weight: 700; font-size: 14pt !important;"></h4>
                        <button 
                            type="button" 
                            class="close" 
                            data-dismiss="modal"
                            style="border-radius: 5px; background-color: #777!important; 
                            color: #fff; opacity: 1; position: absolute; right: 17px; 
                            top: 17px; width: 25px !important; height: 25px !important;
                            z-index: 999999 !important;"
                        >
                            &times;
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-lg-3 col-md-3 col-sm-3 col-xs-3 mb-4 livro-imagem"></div>
                            <div class="col-lg-9 col-md-9 col-sm-9 col-xs-9 livro-info"></div>
                        </div>
                    </div>
                    <div class="modal-footer">
                    </div>
                </div>
            </div>
        </div>
    `;

    if ($("#info-modal").length == 0) {
        $("#main-container").append(modalHtml);
    }
}
createButtons();

/**
 * Function que fica verificando se houve alguma requisicao AJAX para recarregar os botoes
 */
(function () {
    var proxied = window.XMLHttpRequest.prototype.send;

    window.XMLHttpRequest.prototype.send = function () {
        var pointer = this;

        var intervalId = window.setInterval(function () {
            if (pointer.readyState != 4) {
                return;
            }

            if ($(".info-button").length == 0) {
                createButtons(); // Recarrega os botoes
            }

            clearInterval(intervalId);
        }, 1000);

        return proxied.apply(this, [].slice.call(arguments));
    };
})();

/**
 * Function para detectar quando a pesquisa acontece
 */
setTimeout(function () {
    $("#pesquisa-mini").on("keydown", function (event) {
        if (event.keyCode === 13) {
            event.preventDefault(); // Previne a ação padrão (se houver)
            setTimeout(function () {
                createButtons();
            }, 1000);
        }
    });

    $("#btn-mini-search").on("click", function () {
        setTimeout(function () {
            createButtons();
        }, 1000);
    });

    $("#search-left-area #filter-button-area button").on("click", function () {
        setTimeout(function () {
            createButtons();
        }, 1000);
    });

}, 1000);
