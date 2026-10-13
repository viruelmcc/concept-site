/* Concept — modal de cadastro nas LPs. Autossuficiente: injeta CSS + HTML e intercepta os botões de
   "Quero alugar". É a PRIMEIRA tela do cadastro (10/2026): começa pela CIDADE — a pessoa digita, escolhe na
   sugestão e, só se a cidade for atendida, aparecem nome, CPF, e-mail e WhatsApp. Quem mora fora da área lê na
   hora que não atendemos e não informa contato nenhum: nada é criado. Criada a conta, o MOTRIK abre a segunda
   tela (endereço + comprovante de residência), que é quando a análise começa. Sem foto de CNH.
   Classes prefixadas com lm- pra não colidir com o CSS da LP.
   A conversão (Lead + evento por LP) dispara aqui, do MESMO jeito de sempre: quando o Motrik confirma que o
   cadastro foi criado. Pixel, nomes de evento, dataLayer, etiqueta de origem e fonte de tráfego não mudaram. */
(function () {
  if (window.__conceptLeadModal) return;
  window.__conceptLeadModal = true;

  var host = location.hostname;
  var _qs = new URLSearchParams(location.search);
  // Fonte de tráfego: o que o navegador sabe no PRIMEIRO acesso desta visita — clique de anúncio (gclid/fbclid),
  // parâmetros utm_* e de onde a pessoa veio. Fica na sessão porque ela pode navegar antes de abrir o formulário.
  // Vai junto no cadastro e o Motrik classifica (Google patrocinado, Google orgânico, Meta, direto…).
  var RASTREIO = (function () {
    try { var salvo = sessionStorage.getItem("concept_rastreio"); if (salvo) return JSON.parse(salvo); } catch (e) {}
    var r = {};
    ["gclid", "gbraid", "wbraid", "fbclid", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(function (k) {
      var v = _qs.get(k);
      if (v) r[k] = String(v).slice(0, 300);
    });
    if (document.referrer) r.referrer = String(document.referrer).slice(0, 300);
    r.pagina = (location.hostname + location.pathname).slice(0, 300);
    try { sessionStorage.setItem("concept_rastreio", JSON.stringify(r)); } catch (e) {}
    return r;
  })();
  var _origem =
    _qs.get("origem") ||
    (typeof window.CONCEPT_LEAD_LP === "string" ? window.CONCEPT_LEAD_LP : "");
  // Etiqueta PADRÃO da página: 1º uma ORIGEM explícita (?origem= no link OU
  // window.CONCEPT_LEAD_LP setado pela página — ex.: link do WhatsApp = "whatsapp");
  // senão vem do DOMÍNIO. Um botão ainda pode sobrepor com data-lead-lp (slug absoluto)
  // OU compor variante com data-lead-variant (sufixo, ex.: "eletrico" → "<base>-eletrico").
  // promo. → gratis (LP semana grátis) · www/apex → site-oficial · eletrico. → eletrico.
  var LP_PADRAO =
    _origem && /^[a-z0-9_-]{1,24}$/.test(_origem)
      ? _origem
      : /eletric/i.test(host)
        ? "eletrico"
        : /promo|gratis/i.test(host)
          ? "gratis"
          : /(^|\.)locadoraconcept\.com\.br$/i.test(host)
            ? "site-oficial"
            : "combustao";
  // Meta/Pixel: UM evento de conversão por PÁGINA (base do domínio). O botão NÃO muda
  // o evento do Meta — senão divide o sinal e atrapalha a otimização de campanha. A
  // diferenciação por botão (elétrico etc.) fica SÓ no `lp` mandado pro Pipefy (etiqueta).
  var EVENTOS = {
    combustao: "LeadCombustao",
    eletrico: "LeadEletrico",
    gratis: "LeadSemanaGratis",
    "site-oficial": "LeadSiteOficial",
    whatsapp: "LeadWhatsapp",
  };
  function eventoDe(lp) {
    return EVENTOS[lp] || "Lead";
  }
  var LP = LP_PADRAO;
  var EVENTO = eventoDe(LP_PADRAO);
  // window.CONCEPT_LEAD_ENDPOINT existe só para a página de teste (aponta para o Motrik de homologação).
  var LEAD_ENDPOINT = typeof window.CONCEPT_LEAD_ENDPOINT === "string" ? window.CONCEPT_LEAD_ENDPOINT : "https://cliente.locadoraconcept.com.br/api/registro";
  var REGIAO = "Curitiba e região";
  // O "disquinho" de carregando: anel do conjunto SVG Spinners (Utkarsh Verma, licença MIT) — animação do próprio SVG.
  var DISCO =
    '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><g stroke="currentColor"><circle cx="12" cy="12" r="9.5" fill="none" stroke-linecap="round" stroke-width="3">' +
    '<animate attributeName="stroke-dasharray" calcMode="spline" dur="1.5s" keySplines="0.42,0,0.58,1;0.42,0,0.58,1;0.42,0,0.58,1" keyTimes="0;0.475;0.95;1" repeatCount="indefinite" values="0 150;42 150;42 150;42 150"/>' +
    '<animate attributeName="stroke-dashoffset" calcMode="spline" dur="1.5s" keySplines="0.42,0,0.58,1;0.42,0,0.58,1;0.42,0,0.58,1" keyTimes="0;0.475;0.95;1" repeatCount="indefinite" values="0;-16;-59;-59"/>' +
    '</circle><animateTransform attributeName="transform" dur="2s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12"/></g></svg>';
  // O logo para fundo escuro vem do Motrik (o mesmo da tela de entrada do cliente).
  var LOGO = LEAD_ENDPOINT.replace(/\/api\/registro$/, "") + "/api/marca/concept/logo-escuro";
  // Etiqueta de origem que vai para o cadastro no Motrik — os mesmos rótulos que o Pipefy usava.
  var ETIQUETAS = {
    "site-oficial": "SITE OFICIAL",
    "site-oficial-eletrico": "SITE OFICIAL - ELÉTRICO",
    gratis: "LP SEMANA GRÁTIS",
    "gratis-eletrico": "LP SEMANA GRÁTIS - ELÉTRICO",
    eletrico: "LP ELÉTRICO",
    combustao: "LP COMBUSTÃO",
    "combustao-eletrico": "LP COMBUSTÃO - ELÉTRICO",
    whatsapp: "WHATSAPP",
  };
  function etiquetaDe(lp) {
    return ETIQUETAS[lp] || String(lp || "").replace(/[-_]+/g, " ").toUpperCase();
  }

  var CSS =
    ".lm-ov{position:fixed;inset:0;background:rgba(8,10,11,.72);backdrop-filter:blur(3px);z-index:99999;display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:32px 16px;font-family:'Inter',system-ui,sans-serif}" +
    ".lm-ov[hidden]{display:none}" +
    ".lm-modal{background:#fff;width:100%;max-width:540px;border-radius:16px;position:relative;padding:26px 26px 30px;box-shadow:0 24px 70px rgba(0,0,0,.4);animation:lmpop .2s ease;color:#16191a;line-height:1.55}" +
    "@keyframes lmpop{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}" +
    ".lm-x{position:absolute;top:14px;right:16px;width:34px;height:34px;border:none;background:#eef0f1;border-radius:50%;font-size:20px;color:#333;cursor:pointer;line-height:1}" +
    ".lm-eyebrow{font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#B70103;font-weight:700}" +
    ".lm-title{font-family:'Anton','Inter',sans-serif;font-size:30px;line-height:1.05;text-transform:uppercase;margin:6px 0 8px;color:#0F1313}" +
    ".lm-intro{font-size:14px;color:#6b7173;margin-bottom:20px}" +
    ".lm-fld{margin-bottom:16px}" +
    ".lm-fld label.lm-lab{display:block;font-size:14px;font-weight:600;margin-bottom:6px;color:#16191a}" +
    ".lm-req{color:#B70103}" +
    ".lm-fld input[type=text],.lm-fld input[type=email],.lm-fld input[type=tel]{width:100%;font:inherit;font-size:15px;padding:11px 13px;border:1.5px solid #d7dadd;border-radius:9px;background:#fff;color:#16191a}" +
    ".lm-fld input:focus{outline:none;border-color:#0F1313}" +
    ".lm-fld input.lm-bad{border-color:#c0392b;background:#fff5f4}" +
    ".lm-erro{display:none;color:#c0392b;font-size:12.5px;margin-top:5px}" +
    ".lm-fld.lm-invalid .lm-erro{display:block}" +
    ".lm-seg{display:flex;gap:8px}" +
    ".lm-seg label{flex:1;border:1.5px solid #d7dadd;border-radius:9px;padding:10px;text-align:center;cursor:pointer;font-weight:600;font-size:14px;margin:0;color:#16191a}" +
    ".lm-seg input{display:none}" +
    ".lm-seg label:has(input:checked){background:#0F1313;border-color:#0F1313;color:#fff}" +
    ".lm-help{font-size:12.5px;color:#6b7173;background:#f7f8f8;border-radius:8px;padding:10px 12px;margin:6px 0 8px}" +
    ".lm-help b{color:#16191a}.lm-help ul{margin:4px 0 0 16px}.lm-help li{margin:2px 0}" +
    ".lm-drop{border:1.5px dashed #c2c7cb;border-radius:10px;padding:18px;text-align:center;cursor:pointer;color:#6b7173;font-size:14px;transition:.15s}" +
    ".lm-drop:hover,.lm-drop.lm-over{border-color:#0F1313;background:#fafafa;color:#16191a}" +
    ".lm-files{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:6px}" +
    ".lm-files li{display:flex;align-items:center;gap:8px;background:#eef0f1;border-radius:7px;padding:7px 10px;font-size:13px}" +
    ".lm-files li .lm-nome{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
    ".lm-files li button{border:none;background:none;color:#c0392b;cursor:pointer;font-size:16px}" +
    ".lm-enviar{width:100%;margin-top:8px;font-size:17px;padding:15px;background:#B70103;color:#fff;font-weight:700;border:none;border-radius:10px;cursor:pointer;font-family:inherit}" +
    ".lm-enviar:hover{background:#9a0103}.lm-enviar:disabled{opacity:.6;cursor:default}" +
    ".lm-nota{font-size:11.5px;color:#9aa0a2;text-align:center;margin-top:12px}" +
    ".lm-suc{text-align:center;padding:24px 8px}" +
    ".lm-suc .lm-ic{width:64px;height:64px;border-radius:50%;background:#16a34a;color:#fff;font-size:36px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px}" +
    ".lm-suc h2{font-family:'Anton','Inter',sans-serif;text-transform:uppercase;color:#0F1313;font-size:26px;margin:0 0 8px}" +
    ".lm-suc p{color:#6b7173;font-size:15px;margin:0}" +
    // Não depende do CSS da página que hospeda o modal (alinhamento e largura dos campos).
    ".lm-modal,.lm-inline{text-align:left}.lm-modal *,.lm-inline *{box-sizing:border-box}" +
    ".lm-eyebrow{display:block}" +
    // O que está escondido fica escondido mesmo quando a classe define display (flex/grid).
    ".lm-modal [hidden],.lm-inline [hidden]{display:none!important}" +
    ".lm-fld input::placeholder{color:#b9bfc4;opacity:1}" +
    ".lm-passos{list-style:none;margin:0 0 20px;padding:0;display:flex;align-items:center;gap:10px;font-size:12px;color:#a3a9ad}" +
    ".lm-passos li{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}" +
    ".lm-passos li+li::before{content:'';width:18px;height:1px;background:#d7dadd;margin-right:4px}" +
    ".lm-passos b{width:16px;height:16px;border-radius:50%;display:inline-grid;place-items:center;font-size:10px;font-weight:600;background:#eef0f1;color:#8a9094}" +
    ".lm-passos li.lm-atual{color:#16191a}.lm-passos li.lm-atual b{background:#0F1313;color:#fff}" +
    ".lm-q{display:block;font-size:17px;font-weight:700;color:#0F1313;margin:0 0 2px}" +
    ".lm-qs{font-size:13.5px;color:#6b7173;margin:0 0 10px}" +
    ".lm-lista{list-style:none;margin:8px 0 0;padding:0;border:1.5px solid #d7dadd;border-radius:9px;overflow:hidden}" +
    ".lm-lista li+li{border-top:1px solid #e6e8ea}" +
    ".lm-item{width:100%;min-height:52px;padding:9px 13px;display:flex;flex-direction:column;justify-content:center;gap:1px;text-align:left;background:#fff;border:0;font:inherit;cursor:pointer}" +
    ".lm-item:hover,.lm-item:active{background:#f7f8f8}" +
    ".lm-item.lm-linha{flex-direction:row;align-items:center;justify-content:space-between;gap:12px}" +
    ".lm-rua{font-size:15px;font-weight:600;color:#16191a;line-height:1.3}.lm-onde{font-size:13px;color:#6b7173;line-height:1.3}" +
    ".lm-dica{font-size:13.5px;color:#6b7173;margin-top:8px}" +
    ".lm-link{margin-top:10px;padding:8px 0;background:none;border:0;font:inherit;font-size:13.5px;font-weight:600;color:#6b7173;text-decoration:underline;cursor:pointer}" +
    ".lm-esc{display:flex;align-items:center;gap:12px;border:1.5px solid #86c79b;border-radius:10px;padding:11px 13px;margin-bottom:16px}" +
    ".lm-esc.lm-fora{border-color:#d7dadd}" +
    ".lm-esc-tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}" +
    ".lm-trocar{flex:none;padding:9px 13px;border:1.5px solid #d7dadd;border-radius:9px;background:#fff;font:inherit;font-size:13.5px;font-weight:600;color:#16191a;cursor:pointer}" +
    ".lm-foramsg{background:#fff8ec;border:1.5px solid #f1d08f;color:#7a4b06;border-radius:10px;padding:12px 14px;font-size:14px;line-height:1.45;margin-bottom:8px}" +
    ".lm-foramsg b{display:block;font-size:15px}" +
    ".lm-dois{display:grid;grid-template-columns:110px minmax(0,1fr);gap:10px}" +
    ".lm-dois2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px}" +
    // ── TEMA ESCURO (10/2026): o mesmo visual da tela de cadastro do cliente no Motrik ──
    ".lm-modal,.lm-inline{background:#0F1313 radial-gradient(70% 38% at 50% 112%,rgba(183,1,3,.42) 0%,transparent 70%) no-repeat;color:#fff;border:1px solid rgba(255,255,255,.08)}" +
    ".lm-modal{max-width:460px;padding:34px 30px 30px}" +
    ".lm-x{background:rgba(255,255,255,.10);color:#fff}" +
    ".lm-topo{display:flex;justify-content:center;padding-bottom:24px;margin-bottom:24px;border-bottom:1px solid rgba(255,255,255,.10)}" +
    ".lm-logo{height:52px;width:auto;display:block}" +
    ".lm-title{font-family:'Inter',system-ui,sans-serif;font-size:26px;font-weight:700;letter-spacing:-.02em;text-transform:none;text-align:center;color:#fff;margin:0}" +
    ".lm-intro{text-align:center;font-size:15px;color:rgba(255,255,255,.55);margin:8px 0 26px}" +
    ".lm-passos{justify-content:center;color:rgba(255,255,255,.38);margin-bottom:28px}" +
    ".lm-passos li+li::before{background:rgba(255,255,255,.16)}" +
    ".lm-passos b{background:rgba(255,255,255,.10);color:rgba(255,255,255,.55)}" +
    ".lm-passos li.lm-atual{color:rgba(255,255,255,.9)}.lm-passos li.lm-atual b{background:#fff;color:#0F1313}" +
    ".lm-q{color:#fff}.lm-qs{color:rgba(255,255,255,.62);margin-bottom:14px}" +
    ".lm-fld label.lm-lab{color:rgba(255,255,255,.72);font-size:13.5px}" +
    ".lm-fld input[type=text],.lm-fld input[type=email],.lm-fld input[type=tel]{height:52px;padding:0 16px;font-size:16px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.06);color:#fff}" +
    ".lm-fld input:focus{border-color:rgba(255,255,255,.55);background:rgba(255,255,255,.08)}" +
    ".lm-fld input::placeholder{color:rgba(255,255,255,.30)}" +
    ".lm-fld input.lm-bad{border-color:rgba(239,68,68,.7);background:rgba(239,68,68,.08)}" +
    ".lm-erro{color:#FCA5A5}" +
    ".lm-lista{border:1px solid rgba(255,255,255,.12);border-radius:12px}.lm-lista li+li{border-top:1px solid rgba(255,255,255,.10)}" +
    ".lm-item{background:transparent}.lm-item:hover,.lm-item:active{background:rgba(255,255,255,.08)}" +
    ".lm-rua{color:#fff}.lm-onde,.lm-dica,.lm-link{color:rgba(255,255,255,.62)}" +
    ".lm-esc{border:1px solid rgba(34,197,94,.45);border-radius:12px}.lm-esc.lm-fora{border-color:rgba(255,255,255,.12)}" +
    ".lm-trocar{background:transparent;border:1px solid rgba(255,255,255,.18);color:#fff;border-radius:10px}" +
    ".lm-foramsg{background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.30);color:#FCD34D;border-radius:12px}" +
    ".lm-enviar{border-radius:12px;height:52px;padding:0;font-size:16px}" +
    ".lm-nota{color:rgba(255,255,255,.38)}" +
    ".lm-comdisco{position:relative;display:block}.lm-disco{position:absolute;right:14px;top:50%;transform:translateY(-50%);display:inline-flex;color:rgba(255,255,255,.7);pointer-events:none}" +
    ".lm-ja{display:flex;flex-direction:column;gap:10px;margin:-6px 0 16px;padding:12px 14px;border-radius:12px;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.30);font-size:14px;line-height:1.45;color:#FCD34D}" +
    ".lm-ja-b{display:flex;align-items:center;justify-content:center;height:44px;border-radius:10px;background:#fff;color:#0F1313;font-weight:600;font-size:14.5px;text-decoration:none}" +
    ".lm-enviar svg{vertical-align:middle;margin-right:8px}" +
    ".lm-inline{width:100%;max-width:460px;margin:0 auto;border-radius:16px;padding:34px 30px 30px;line-height:1.55;box-shadow:0 20px 60px rgba(0,0,0,.28)}" +
    "@media(max-width:560px){.lm-ov{padding:0}.lm-modal{max-width:100%;min-height:100%;border-radius:0;padding-top:20px}.lm-inline{border-radius:14px;padding:22px 18px 26px}}";

  var INNER =
    '<div id="lm-passo-form">' +
    '<div class="lm-topo"><img class="lm-logo" src="' + LOGO + '" alt="Locadora Concept" width="190" height="52"></div>' +
    '<h2 class="lm-title" id="lm-t">Alugue seu carro</h2>' +
    '<p class="lm-intro">Cadastro em 1 minuto, sem burocracia.</p>' +
    '<ol class="lm-passos" aria-label="Como funciona"><li class="lm-atual"><b>1</b>Seus dados</li><li><b>2</b>Endereço</li><li><b>3</b>Análise</li></ol>' +
    // Sem preenchimento automático do navegador em nenhum campo: ele troca dado certo por dado guardado.
    '<form id="lm-form" novalidate autocomplete="off">' +
    // ── A cidade vem primeiro, sozinha ──
    '<div id="lm-busca" class="lm-fld">' +
    '<label class="lm-q" for="lm-cid">Em que cidade você mora?</label>' +
    '<p class="lm-qs">Atendemos ' + REGIAO + '.</p>' +
    '<span class="lm-comdisco"><input type="text" id="lm-cid" name="search" autocomplete="off" data-1p-ignore data-lpignore="true" autocapitalize="words" enterkeyhint="search" placeholder="Digite o nome da cidade">' +
    '<span class="lm-disco" id="lm-disco-cid" hidden>' + DISCO + "</span></span>" +
    '<ul class="lm-lista" id="lm-lista" hidden></ul>' +
    '<div class="lm-dica" id="lm-dica" hidden></div>' +
    "</div>" +
    '<div id="lm-esc" class="lm-esc" hidden><span class="lm-esc-tx"><span class="lm-rua" id="lm-esc-rua"></span><span class="lm-onde" id="lm-esc-onde"></span></span>' +
    '<button type="button" class="lm-trocar" id="lm-trocar">Trocar</button></div>' +
    '<div id="lm-foramsg" class="lm-foramsg" hidden><b id="lm-fora-t"></b>Por enquanto atendemos só ' + REGIAO + ".</div>" +
    // ── Os dados: só aparecem com a cidade atendida ──
    '<div id="lm-dados" hidden>' +
    fld("nome", "Nome completo", '<input type="text" id="lm-nome" name="search" autocomplete="off" data-1p-ignore data-lpignore="true" placeholder="Como está na sua CNH">', "Informe seu nome completo.") +
    fld("cpf", "CPF", '<span class="lm-comdisco"><input type="text" id="lm-cpf" name="search" autocomplete="off" data-1p-ignore data-lpignore="true" inputmode="numeric" placeholder="Seu CPF" maxlength="14"><span class="lm-disco" id="lm-disco-cpf" hidden>' + DISCO + "</span></span>", "Informe um CPF válido.") +
    '<div id="lm-ja" class="lm-ja" hidden>Esse CPF já tem cadastro com a gente.<a id="lm-ja-b" class="lm-ja-b" href="#">Entrar na minha conta →</a></div>' +
    fld("email", "E-mail", '<input type="email" id="lm-email" name="search" autocomplete="off" data-1p-ignore data-lpignore="true" placeholder="Seu e-mail">', "Informe um e-mail válido.") +
    fld("whats", "WhatsApp", '<input type="tel" id="lm-whats" name="search" autocomplete="off" data-1p-ignore data-lpignore="true" inputmode="numeric" placeholder="DDD e número" maxlength="16">', "Informe um WhatsApp válido com DDD.") +
    '<input type="hidden" id="lm-gclid"><input type="hidden" id="lm-fbclid"><input type="hidden" id="lm-event_id">' +
    '<input type="text" id="lm-website" name="website" tabindex="-1" readonly autocomplete="off" aria-hidden="true" data-lpignore="true" data-1p-ignore data-form-type="other" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0">' +
    '<button type="submit" class="lm-enviar" id="lm-btn">Continuar</button>' +
    "</div>" +
    '<p class="lm-nota">Nunca envie senhas ou dados confidenciais. Formulário oficial da Locadora Concept (CNPJ 35.015.925/0001-90).</p>' +
    "</form></div>";

  // Modal (LPs): overlay + botão fechar em volta do INNER.
  var HTML_MODAL =
    '<div class="lm-ov" id="lm-ov" hidden><div class="lm-modal" role="dialog" aria-modal="true" aria-labelledby="lm-t">' +
    '<button class="lm-x" id="lm-fechar" aria-label="Fechar">&times;</button>' +
    INNER +
    "</div></div>";

  function fldOpc(key, label, input) {
    return '<div class="lm-fld" data-fld="' + key + '"><label class="lm-lab">' + label + "</label>" + input + "</div>";
  }
  function fld(key, label, input, erro) {
    return (
      '<div class="lm-fld" data-fld="' + key + '"><label class="lm-lab">' + label +
      ' <span class="lm-req">*</span></label>' + input + '<div class="lm-erro">' + erro + "</div></div>"
    );
  }

  function init() {
    var st = document.createElement("style");
    st.textContent = CSS;
    document.head.appendChild(st);
    // Modo INLINE: se a página pede (window.CONCEPT_LEAD_INLINE = seletor, ou um
    // elemento [data-lead-inline]), o form vai DIRETO no container — sem overlay,
    // sem botão de abrir/fechar. Ex.: página /cadastro do link de WhatsApp. Senão,
    // comportamento normal de modal (LPs).
    var inlineSel = typeof window.CONCEPT_LEAD_INLINE === "string" ? window.CONCEPT_LEAD_INLINE : null;
    var inlineTarget = null;
    try {
      inlineTarget = inlineSel ? document.querySelector(inlineSel) : document.querySelector("[data-lead-inline]");
    } catch (e) {}
    var INLINE = !!inlineTarget;
    if (INLINE) {
      var box = document.createElement("div");
      box.className = "lm-inline";
      box.innerHTML = INNER;
      inlineTarget.appendChild(box);
    } else {
      var holder = document.createElement("div");
      holder.innerHTML = HTML_MODAL;
      document.body.appendChild(holder);
    }

    var ov = document.getElementById("lm-ov");
    var form = document.getElementById("lm-form");

    var qs = new URLSearchParams(location.search);
    if (qs.get("gclid")) document.getElementById("lm-gclid").value = qs.get("gclid");
    if (qs.get("fbclid")) document.getElementById("lm-fbclid").value = qs.get("fbclid");

    function abrir() {
      if (!ov) return;
      ov.hidden = false;
      document.documentElement.style.overflow = "hidden";
    }
    function fechar() {
      if (!ov) return;
      ov.hidden = true;
      document.documentElement.style.overflow = "";
    }
    var _xbtn = document.getElementById("lm-fechar");
    if (_xbtn) _xbtn.onclick = fechar;
    if (ov)
      ov.addEventListener("click", function (e) {
        if (e.target === ov) fechar();
      });

    // intercepta os botões que iam pro form público do Pipefy (e [data-lead-open])
    document.addEventListener(
      "click",
      function (e) {
        if (!e.target.closest) return;
        var a = e.target.closest('a[href*="cliente.locadoraconcept.com.br/registro"],a[href*="pipefy.com/public/form"],[data-lead-open]');
        if (a) {
          e.preventDefault();
          // data-lead-lp = slug absoluto; data-lead-variant = sufixo sobre a base do domínio
          // (ex.: card de elétrico → "<base>-eletrico": gratis-eletrico ou site-oficial-eletrico)
          var over = a.getAttribute && a.getAttribute("data-lead-lp");
          var vary = a.getAttribute && a.getAttribute("data-lead-variant");
          if (over && /^[a-z0-9_-]{1,24}$/.test(over)) LP = over;
          else if (vary && /^[a-z0-9_]{1,20}$/.test(vary)) LP = LP_PADRAO + "-" + vary;
          else LP = LP_PADRAO;
          // só o LP (etiqueta do Pipefy) muda por botão; o EVENTO do Meta é fixo pela página.
          abrir();
        }
      },
      true,
    );

    // abertura automática: página /cadastro do link de WhatsApp (window.CONCEPT_LEAD_OPEN)
    // ou qualquer link com ?cadastro=1. O LP já é o LP_PADRAO da página (ex.: "whatsapp").
    if (window.CONCEPT_LEAD_OPEN || _qs.get("cadastro") === "1") abrir();

    // ── CIDADE ────────────────────────────────────────────────────────────────
    // `cid` = a cidade escolhida na sugestão ({ cidade, estado, atendida }).
    var $ = function (id) { return document.getElementById(id); };
    var cid = null, pedido = 0, timer = null;
    var URL_CIDADES = LEAD_ENDPOINT.replace(/\/+$/, "") + "/enderecos?tipo=cidade&q=";

    // Uma função só decide o que aparece: a pergunta · a cidade escolhida · o aviso de fora da área · os dados.
    function pintar() {
      var fora = !!cid && !cid.atendida;
      $("lm-busca").hidden = !!cid;
      $("lm-esc").hidden = !cid;
      $("lm-foramsg").hidden = !fora;
      $("lm-dados").hidden = !cid || fora;
      $("lm-esc").className = "lm-esc" + (fora ? " lm-fora" : "");
      if (cid) { $("lm-esc-rua").textContent = cid.cidade + (cid.estado ? " · " + cid.estado : ""); $("lm-esc-onde").textContent = ""; }
      if (fora) $("lm-fora-t").textContent = "Ainda não atendemos " + cid.cidade + ".";
    }
    function mostrarCidades(itens, buscou) {
      var ul = $("lm-lista");
      ul.textContent = "";
      itens.forEach(function (it) {
        var li = document.createElement("li"), b = document.createElement("button"), r = document.createElement("span"), o = document.createElement("span");
        // Cidade à esquerda, estado à direita, na mesma linha.
        b.type = "button"; b.className = "lm-item lm-linha"; r.className = "lm-rua"; o.className = "lm-onde";
        r.textContent = it.cidade; o.textContent = it.estado || "";
        b.appendChild(r); b.appendChild(o);
        b.onclick = function () { escolher(it); };
        li.appendChild(b); ul.appendChild(li);
      });
      ul.hidden = itens.length === 0;
      $("lm-dica").hidden = !(buscou && itens.length === 0);
      $("lm-dica").textContent = "Não achamos essa cidade. Confira como está escrito.";
    }
    function buscarCidades() {
      var termo = $("lm-cid").value.trim();
      clearTimeout(timer);
      if (termo.length < 2) { pedido++; $("lm-disco-cid").hidden = true; mostrarCidades([], false); return; }
      var meu = ++pedido;
      $("lm-disco-cid").hidden = false;
      // Espera a pausa de 250 ms e ignora resposta atrasada (a pessoa continuou digitando).
      timer = setTimeout(function () {
        fetch(URL_CIDADES + encodeURIComponent(termo))
          .then(function (r) { return r.json(); })
          .then(function (j) { if (meu === pedido) { $("lm-disco-cid").hidden = true; mostrarCidades((j && j.itens) || [], true); } })
          .catch(function () { if (meu === pedido) { $("lm-disco-cid").hidden = true; mostrarCidades([], true); } });
      }, 250);
    }
    function escolher(it) {
      cid = { cidade: it.cidade, estado: it.estado || "", atendida: it.atendida !== false };
      pintar();
      if (cid.atendida) setTimeout(function () { $("lm-nome").focus(); }, 60);
    }
    $("lm-cid").oninput = buscarCidades;
    $("lm-trocar").onclick = function () { cid = null; $("lm-cid").value = ""; mostrarCidades([], false); pintar(); $("lm-cid").focus(); };
    pintar();

    var cpf = document.getElementById("lm-cpf");
    cpf.oninput = function () {
      var v = cpf.value.replace(/\D/g, "").slice(0, 11);
      v = v.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
      cpf.value = v;
      conferirCpf();
    };
    // O CPF já tem cadastro? Confere assim que os 11 dígitos são válidos e oferece a entrada na hora — em vez de a
    // pessoa preencher tudo e descobrir no envio. O Motrik limita as tentativas por IP (a mesma trava do envio).
    var cpfJa = false, pedidoCpf = 0, timerCpf = null;
    function pintarCpfJa() {
      $("lm-ja").hidden = !cpfJa;
      $("lm-btn").disabled = cpfJa;
      $("lm-ja-b").href = LEAD_ENDPOINT.replace(/\/api\/registro$/, "") + "/entrar?ja=1";
    }
    function conferirCpf() {
      clearTimeout(timerCpf);
      var meu = ++pedidoCpf;
      cpfJa = false; pintarCpfJa();
      if (!validaCPF(cpf.value)) { $("lm-disco-cpf").hidden = true; return; }
      $("lm-disco-cpf").hidden = false;
      timerCpf = setTimeout(function () {
        fetch(LEAD_ENDPOINT.replace(/\/+$/, "") + "/cpf", { method: "POST", credentials: "omit", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cpf: cpf.value }) })
          .then(function (r) { return r.json(); })
          .then(function (j) { if (meu === pedidoCpf) { $("lm-disco-cpf").hidden = true; cpfJa = !!(j && j.existe); pintarCpfJa(); } })
          .catch(function () { if (meu === pedidoCpf) $("lm-disco-cpf").hidden = true; });
      }, 300);
    }
    var wh = document.getElementById("lm-whats");
    wh.oninput = function () {
      var v = wh.value.replace(/\D/g, "").slice(0, 11);
      if (v.length > 10) v = v.replace(/(\d{2})(\d{5})(\d{1,4})/, "($1) $2-$3");
      else if (v.length > 6) v = v.replace(/(\d{2})(\d{4})(\d{1,4})/, "($1) $2-$3");
      else if (v.length > 2) v = v.replace(/(\d{2})(\d+)/, "($1) $2");
      else if (v.length) v = v.replace(/(\d+)/, "($1");
      wh.value = v;
    };

    function validaCPF(s) {
      s = s.replace(/\D/g, "");
      if (s.length !== 11 || /^(\d)\1+$/.test(s)) return false;
      var t, c, i;
      for (t = 9; t < 11; t++) {
        for (c = 0, i = 0; i < t; i++) c += parseInt(s[i]) * (t + 1 - i);
        c = ((c * 10) % 11) % 10;
        if (c !== parseInt(s[t])) return false;
      }
      return true;
    }

    function setErro(fld, on) {
      document.querySelector('[data-fld="' + fld + '"]').classList.toggle("lm-invalid", on);
      var inp = document.querySelector('[data-fld="' + fld + '"] input[type=text],[data-fld="' + fld + '"] input[type=email],[data-fld="' + fld + '"] input[type=tel]');
      if (inp) inp.classList.toggle("lm-bad", on);
    }
    function valida() {
      var ok = true;
      var nome = document.getElementById("lm-nome").value.trim();
      var bn = !(nome.length >= 3 && nome.indexOf(" ") > 0);
      setErro("nome", bn); if (bn) ok = false;
      var bc = !validaCPF(cpf.value); setErro("cpf", bc); if (bc) ok = false;
      var w = wh.value.replace(/\D/g, ""); var bw = w.length < 10; setErro("whats", bw); if (bw) ok = false;
      var em = document.getElementById("lm-email").value.trim();
      var be = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em); setErro("email", be); if (be) ok = false;
      return ok;
    }
    function uuid() {
      return crypto.randomUUID
        ? crypto.randomUUID()
        : "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      // Sem cidade atendida não há o que enviar (os campos nem aparecem).
      if (!cid || !cid.atendida || cpfJa) return;
      if (!valida()) {
        var p = form.querySelector(".lm-invalid");
        if (p) p.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      var btn = document.getElementById("lm-btn");
      btn.disabled = true;
      btn.innerHTML = DISCO + "Enviando…";
      var eid = uuid();
      document.getElementById("lm-event_id").value = eid;

      // ── O PRÉ-CADASTRO VAI DIRETO PARA O MOTRIK (05/10/2026) ──
      // O envio é feito daqui e a resposta decide o que a pessoa vê — é o que evita perder lead por erro:
      //   criou a conta      → dispara a conversão (só agora, com o cadastro confirmado) e abre a segunda tela (endereço + comprovante);
      //   fora da área       → o aviso aparece no endereço; nada foi criado e NÃO conta como conversão;
      //   já tem cadastro    → abre a tela de entrada, que explica; não conta como conversão;
      //   dado recusado      → o motivo aparece AQUI, com o formulário preenchido, para corrigir e reenviar;
      //   falha ou sem rede  → os dados ficam na tela, com "tentar de novo" e o WhatsApp já com o nome escrito.
      // O que o Motrik recusa ou não consegue gravar vira tarefa para a equipe lá dentro.
      var BASE = LEAD_ENDPOINT.replace(/\/api\/registro$/, "");
      var campos = {
        cidade: cid.cidade,
        estado: cid.estado,
        nome: document.getElementById("lm-nome").value.trim(),
        cpf: cpf.value,
        whatsapp: wh.value,
        email: document.getElementById("lm-email").value.trim(),
        etiqueta: etiquetaDe(LP),
        rastreio: RASTREIO,
        website: document.getElementById("lm-website").value,
      };
      function reativar() {
        btn.disabled = false;
        btn.textContent = "Continuar";
      }
      function aviso() {
        var a = document.getElementById("lm-aviso");
        if (!a) {
          a = document.createElement("div");
          a.id = "lm-aviso";
          a.setAttribute("role", "alert");
          a.style.cssText = "background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.28);color:#FCA5A5;border-radius:12px;padding:12px 14px;font-size:14px;line-height:1.45;margin:0 0 12px";
          btn.parentNode.insertBefore(a, btn);
        }
        a.textContent = "";
        return a;
      }
      function botaoDoAviso(a, texto, escuro, aoClicar, href) {
        var b = document.createElement(href ? "a" : "button");
        if (href) { b.href = href; b.target = "_blank"; b.rel = "noopener noreferrer"; } else b.type = "button";
        b.textContent = texto;
        b.style.cssText = "display:block;width:100%;margin-top:10px;padding:12px;border-radius:9px;font:inherit;font-size:15px;font-weight:700;text-align:center;text-decoration:none;cursor:pointer;border:1px solid rgba(255,255,255,.22);" + (escuro ? "background:#fff;color:#0F1313" : "background:transparent;color:#fff");
        if (aoClicar) b.onclick = aoClicar;
        a.appendChild(b);
      }
      function mostrarRecusa(texto) {
        var a = aviso();
        a.appendChild(document.createTextNode(texto || "Confira os dados e tente de novo."));
        a.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      // Caminho de reserva: envio comum do navegador (sem depender da resposta) — o Motrik cria a conta e leva adiante.
      function enviarPorFormulario() {
        var destino = document.createElement("form");
        destino.method = "POST";
        destino.action = LEAD_ENDPOINT;
        destino.style.display = "none";
        Object.keys(campos).forEach(function (k) {
          var i = document.createElement("input");
          i.type = "hidden";
          i.name = k;
          i.value = campos[k];
          destino.appendChild(i);
        });
        document.body.appendChild(destino);
        destino.submit();
      }
      function mostrarFalha() {
        var a = aviso();
        a.appendChild(document.createTextNode("Não conseguimos concluir o seu cadastro agora. Seus dados continuam aqui — tente de novo ou chame a gente no WhatsApp."));
        botaoDoAviso(a, "Tentar de novo", true, function () {
          btn.disabled = true;
          enviarPorFormulario();
        });
        botaoDoAviso(a, "Chamar no WhatsApp", false, null,
          "https://wa.me/5508009991500?text=" + encodeURIComponent("Olá! Tentei fazer meu cadastro pelo site e não consegui concluir. Meu nome é " + campos.nome + "."));
        a.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      fetch(LEAD_ENDPOINT, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campos),
      })
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, j: j }; });
        })
        .then(function (res) {
          if (res.status === 200 && res.j && res.j.ok) {
            dispararConversao(eid);
            // Um instante para o aviso do Pixel sair antes de a página trocar.
            // Um instante para o aviso do Pixel sair antes de a página trocar.
            setTimeout(function () { location.href = BASE + "/cliente/cadastro"; }, 450);
            return;
          }
          if (res.status === 409) { location.href = BASE + "/entrar?ja=1"; return; }
          reativar();
          // O servidor confere a cidade de novo: recusou → marca como fora da área (somem os campos).
          if (res.status === 400 && res.j && res.j.foraDaArea) { cid.atendida = false; pintar(); return; }
          if (res.status === 400) mostrarRecusa(res.j && res.j.erro);
          else mostrarFalha();
        })
        .catch(function () {
          reativar();
          mostrarFalha();
        });
    });

    function dispararConversao(eid) {
      // Meta vê só a PÁGINA (LP_PADRAO): mesmo evento pra todos os botões da página.
      // O slug do botão (LP) vai só pro Pipefy (fd "lp") e como referência no dataLayer.
      var dados = { content_name: LP_PADRAO, content_category: "pre_cadastro", lp: LP_PADRAO };
      try {
        if (window.fbq) {
          fbq("track", "Lead", dados, { eventID: eid });
          fbq("trackCustom", EVENTO, dados, { eventID: eid });
        }
      } catch (e) {}
      try {
        (window.dataLayer = window.dataLayer || []).push({
          event: "lead_submit",
          lp: LP_PADRAO,
          evento_meta: EVENTO,
          lp_pipefy: LP,
          event_id: eid,
        });
      } catch (e) {}
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
