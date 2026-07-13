/* Concept — modal de pré-cadastro nas LPs. Autossuficiente: injeta CSS + HTML,
   intercepta os botões que iam pro form público do Pipefy e cria o card via
   endpoint do Quaks. Classes prefixadas com lm- pra não colidir com o CSS da LP.
   A conversão (Lead + evento por LP) só dispara em envio validado + confirmado. */
(function () {
  if (window.__conceptLeadModal) return;
  window.__conceptLeadModal = true;

  var host = location.hostname;
  var _qs = new URLSearchParams(location.search);
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
  var LEAD_ENDPOINT =
    "https://quaks.com.br/api/public/lead/paula-casagrande?key=aa5243d8a2a3955ff6d712d55e4c9ee8e477964c1c6b2fc3";

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
    ".lm-inline{background:#fff;width:100%;max-width:540px;margin:0 auto;border-radius:16px;padding:26px 26px 30px;color:#16191a;line-height:1.55;box-shadow:0 20px 60px rgba(0,0,0,.28)}" +
    "@media(max-width:560px){.lm-ov{padding:0}.lm-modal{max-width:100%;min-height:100%;border-radius:0;padding-top:20px}.lm-inline{border-radius:14px;padding:22px 18px 26px}}";

  var INNER =
    '<div id="lm-passo-form">' +
    '<span class="lm-eyebrow">Pré-cadastro · Concept</span>' +
    '<h2 class="lm-title" id="lm-t">Pré Cadastro</h2>' +
    '<p class="lm-intro">Preencha o formulário abaixo. Após concluído, entraremos em contato em até 24h (dias úteis). Caso sua análise seja aprovada, basta escolher a categoria de sua preferência para fazermos a reserva (a depender da disponibilidade).</p>' +
    '<form id="lm-form" novalidate>' +
    fld("nome", "Digite seu Nome Completo", '<input type="text" id="lm-nome" autocomplete="name" placeholder="Seu nome completo">', "Informe seu nome completo.") +
    fld("cpf", "CPF", '<input type="text" id="lm-cpf" inputmode="numeric" placeholder="000.000.000-00" maxlength="14">', "Informe um CPF válido.") +
    fld("whats", "Número de WhatsApp", '<input type="tel" id="lm-whats" inputmode="numeric" placeholder="(99) 99999-9999" maxlength="16">', "Informe um WhatsApp válido com DDD.") +
    fld("email", "Email", '<input type="email" id="lm-email" autocomplete="email" placeholder="voce@email.com">', "Informe um e-mail válido.") +
    '<div class="lm-fld" data-fld="indicado"><label class="lm-lab">Você foi indicado? <span class="lm-req">*</span></label>' +
    '<div class="lm-seg"><label><input type="radio" name="lm-indicado" value="Sim"><span>Sim</span></label><label><input type="radio" name="lm-indicado" value="Não"><span>Não</span></label></div>' +
    '<div class="lm-erro">Selecione uma opção.</div></div>' +
    '<div class="lm-fld" data-fld="indicadoPor" id="lm-indic-wrap" style="display:none"><label class="lm-lab">Nome completo de quem te indicou <span class="lm-req">*</span></label>' +
    '<input type="text" id="lm-indicadoPor" placeholder="Nome do motorista que te indicou"><div class="lm-erro">Informe o nome de quem te indicou.</div></div>' +
    '<div class="lm-fld" data-fld="cnh"><label class="lm-lab">Inclua sua CNH Física ou CNH Digital <span class="lm-req">*</span></label>' +
    '<div class="lm-help"><b>Condições:</b><ul><li>Ter pelo menos 21 anos.</li><li>Ter EAR na CNH.</li><li>CNH definitiva e dentro da validade.</li></ul><div style="margin-top:6px"><b>CNH física:</b> foto legível da CNH ABERTA.<br><b>CNH digital:</b> PDF do documento com QRCODE.</div></div>' +
    '<div class="lm-drop" data-drop="cnh">Arraste os arquivos aqui ou clique para enviar</div>' +
    '<input type="file" id="lm-cnh" accept="image/*,application/pdf" multiple hidden><ul class="lm-files" data-files="cnh"></ul><div class="lm-erro">Anexe sua CNH.</div></div>' +
    '<div class="lm-fld" data-fld="comp"><label class="lm-lab">Inclua um Comprovante de Residência <span class="lm-req">*</span></label>' +
    '<div class="lm-help"><b>Os comprovantes de residência devem:</b><ul><li>Estar em seu nome ou comprovar vínculo com o titular (pai, mãe, esposa/marido com certidão de casamento, ou certidão de nascimento de filho etc.).</li><li>Caso não tenha vínculo com o titular, enviar o contrato de locação com assinaturas autenticadas em cartório ou declaração de residência feita pelo titular com assinatura autenticada em cartório, junto ao comprovante em nome do mesmo.</li><li>Ter vencimento máximo de 2 meses.</li><li>Ser conta de água, luz ou correspondência de banco com data de emissão/validade.</li></ul></div>' +
    '<div class="lm-drop" data-drop="comp">Arraste os arquivos aqui ou clique para enviar</div>' +
    '<input type="file" id="lm-comp" accept="image/*,application/pdf" multiple hidden><ul class="lm-files" data-files="comp"></ul><div class="lm-erro">Anexe o comprovante de residência.</div></div>' +
    '<input type="hidden" id="lm-gclid"><input type="hidden" id="lm-fbclid"><input type="hidden" id="lm-event_id">' +
    '<input type="text" id="lm-website" name="website" tabindex="-1" readonly autocomplete="off" aria-hidden="true" data-lpignore="true" data-1p-ignore data-form-type="other" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0">' +
    '<button type="submit" class="lm-enviar" id="lm-btn">Enviar</button>' +
    '<p class="lm-nota">Nunca envie senhas ou dados confidenciais. Formulário oficial da Locadora Concept (CNPJ 35.015.925/0001-90).</p>' +
    "</form></div>" +
    '<div id="lm-passo-suc" class="lm-suc" hidden><div class="lm-ic">&check;</div><h2>Pré-cadastro enviado!</h2><p>Recebemos seus dados. Entraremos em contato em até 24h úteis pelo WhatsApp ou e-mail. 🚗</p></div>';

  // Modal (LPs): overlay + botão fechar em volta do INNER.
  var HTML_MODAL =
    '<div class="lm-ov" id="lm-ov" hidden><div class="lm-modal" role="dialog" aria-modal="true" aria-labelledby="lm-t">' +
    '<button class="lm-x" id="lm-fechar" aria-label="Fechar">&times;</button>' +
    INNER +
    "</div></div>";

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
    var arquivos = { cnh: [], comp: [] };

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
        var a = e.target.closest('a[href*="pipefy.com/public/form"],[data-lead-open]');
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

    // mostra/esconde "quem indicou"
    form.querySelectorAll('input[name="lm-indicado"]').forEach(function (r) {
      r.addEventListener("change", function () {
        document.getElementById("lm-indic-wrap").style.display = r.value === "Sim" ? "" : "none";
      });
    });

    var cpf = document.getElementById("lm-cpf");
    cpf.oninput = function () {
      var v = cpf.value.replace(/\D/g, "").slice(0, 11);
      v = v.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
      cpf.value = v;
    };
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

    ["cnh", "comp"].forEach(function (k) {
      var input = document.getElementById("lm-" + k);
      var drop = document.querySelector('[data-drop="' + k + '"]');
      drop.onclick = function () {
        input.click();
      };
      input.onchange = function () {
        add(k, input.files);
        input.value = "";
      };
      drop.addEventListener("dragover", function (e) {
        e.preventDefault();
        drop.classList.add("lm-over");
      });
      drop.addEventListener("dragleave", function () {
        drop.classList.remove("lm-over");
      });
      drop.addEventListener("drop", function (e) {
        e.preventDefault();
        drop.classList.remove("lm-over");
        add(k, e.dataTransfer.files);
      });
    });
    function add(k, fl) {
      for (var i = 0; i < fl.length; i++) {
        var f = fl[i];
        if (f.size > 15 * 1024 * 1024) {
          alert('Arquivo "' + f.name + '" maior que 15MB.');
          continue;
        }
        arquivos[k].push(f);
      }
      render(k);
    }
    function render(k) {
      var ul = document.querySelector('[data-files="' + k + '"]');
      ul.innerHTML = "";
      arquivos[k].forEach(function (f, idx) {
        var li = document.createElement("li");
        li.innerHTML =
          '<span class="lm-nome">📎 ' + f.name + '</span><span style="color:#9aa0a2">' +
          (f.size / 1024 / 1024).toFixed(1) + 'MB</span><button type="button">&times;</button>';
        li.querySelector("button").onclick = function () {
          arquivos[k].splice(idx, 1);
          render(k);
        };
        ul.appendChild(li);
      });
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
      var ind = form.querySelector('input[name="lm-indicado"]:checked');
      setErro("indicado", !ind); if (!ind) ok = false;
      if (ind && ind.value === "Sim") {
        var ip = document.getElementById("lm-indicadoPor").value.trim();
        var bip = ip.length < 3; setErro("indicadoPor", bip); if (bip) ok = false;
      } else setErro("indicadoPor", false);
      setErro("cnh", arquivos.cnh.length === 0); if (!arquivos.cnh.length) ok = false;
      setErro("comp", arquivos.comp.length === 0); if (!arquivos.comp.length) ok = false;
      return ok;
    }
    function uuid() {
      return crypto.randomUUID
        ? crypto.randomUUID()
        : "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!valida()) {
        var p = form.querySelector(".lm-invalid");
        if (p) p.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      var btn = document.getElementById("lm-btn");
      btn.disabled = true;
      btn.textContent = "Enviando…";
      var eid = uuid();
      document.getElementById("lm-event_id").value = eid;
      var ind = (form.querySelector('input[name="lm-indicado"]:checked') || {}).value;

      var fd = new FormData();
      fd.append("nome", document.getElementById("lm-nome").value.trim());
      fd.append("cpf", cpf.value);
      fd.append("whatsapp", wh.value);
      fd.append("email", document.getElementById("lm-email").value.trim());
      fd.append("indicado", ind);
      if (ind === "Sim") fd.append("indicadoPor", document.getElementById("lm-indicadoPor").value.trim());
      fd.append("lp", LP);
      fd.append("event_id", eid);
      fd.append("gclid", document.getElementById("lm-gclid").value);
      fd.append("fbclid", document.getElementById("lm-fbclid").value);
      fd.append("website", document.getElementById("lm-website").value);
      arquivos.cnh.forEach(function (f) { fd.append("cnh", f, f.name); });
      arquivos.comp.forEach(function (f) { fd.append("comprovante", f, f.name); });

      fetch(LEAD_ENDPOINT, { method: "POST", body: fd })
        .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
        .catch(function () { return { ok: false }; })
        .then(function (resp) {
          // Só confirma "enviado" se o card foi REALMENTE criado (cardId presente).
          // Assim honeypot/falha não viram falso sucesso — o cliente vê o erro e corrige.
          if (resp && resp.ok && resp.cardId) {
            dispararConversao(eid);
            document.getElementById("lm-passo-form").hidden = true;
            document.getElementById("lm-passo-suc").hidden = false;
          } else {
            btn.disabled = false;
            btn.textContent = "Enviar";
            alert(
              "Não consegui concluir seu envio agora. Confira os campos e tente de novo — se continuar, fale com a gente no WhatsApp 0800 999 1500.",
            );
          }
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
