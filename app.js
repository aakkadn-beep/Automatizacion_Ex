(function () {
  'use strict';
  const C = window.EduCore;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const KEY = 'edunex_e4_estado_v1', SES = 'edunex_e4_sesion';
  let S, rol = null, lastRec = null, prev = null;

  function load() { try { const t = localStorage.getItem(KEY); if (t) { const o = JSON.parse(t); if (o && o.v === 1) return o; } } catch (e) { } return C.nuevoConDatos(60); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }
  function getRol() { try { return sessionStorage.getItem(SES) || null; } catch (e) { return null; } }
  S = load(); rol = getRol();

  const toast = m => { const t = $('#toast'); t.textContent = m; t.className = 'toast on'; clearTimeout(toast.h); toast.h = setTimeout(() => t.className = 'toast', 3600); };
  const msg = (id, m, kind) => { const e = $(id); e.textContent = m; e.className = 'msg' + (kind ? ' ' + kind : ''); };
  const download = (name, text) => { const b = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
  const pill = r => { const s = C.estatusDe(r); return `<span class="pill ${s === 'Registrado' ? 'p-reg' : 'p-pag'}">${esc(s)}</span>`; };
  const readFile = (inp, cb) => { const f = inp.files && inp.files[0]; if (!f) return false; const fr = new FileReader(); fr.onload = () => cb(String(fr.result)); fr.readAsText(f); return true; };

  /* catálogos */
  $('#carrera').innerHTML = '<option value="">Elige tu carrera</option>' + C.CARRERAS.map(x => `<option>${esc(x)}</option>`).join('');
  $('#grupo').innerHTML = '<option value="">Elige tu grupo</option>' + C.GRUPOS.map(x => `<option>${x}</option>`).join('');
  $('#fCar').innerHTML = '<option value="">Todas</option>' + C.CARRERAS.map(x => `<option>${esc(x)}</option>`).join('');
  $('#fGru').innerHTML = '<option value="">Todos</option>' + C.GRUPOS.map(x => `<option>${x}</option>`).join('');

  /* navegación y acceso por rol */
  function go(v, ok) {
    if (!C.puedeVer(rol, v)) { $('#accesoMsg').textContent = 'Esta parte es solo para ' + (v === 'panel' ? 'la Coordinación' : 'la Coordinación y caja') + '. Entra con tu usuario y contraseña.'; go.next = v; v = 'acceso'; }
    $$('[data-view]').forEach(s => s.hidden = s.dataset.view !== v);
    $$('nav [data-go]').forEach(b => b.dataset.go === v ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
    $('#salir').hidden = !rol;
    if (v === 'registro') drawInstr();
    if (v === 'consulta') drawDemo();
    if (v === 'panel') drawPanel();
    if (v === 'caja') drawCaja();
    try { history.replaceState(null, '', '#' + v); } catch (e) { }
    window.scrollTo(0, 0);
  }
  $$('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go));
  $('#salir').onclick = () => { try { sessionStorage.removeItem(SES); } catch (e) { } rol = null; toast('Sesión cerrada.'); go('registro'); };
  $('#lg').onsubmit = ev => {
    ev.preventDefault(); const r = C.iniciarSesion($('#lu').value, $('#lp').value), e = $('#e-lg');
    if (!r) { e.textContent = 'Usuario o contraseña incorrectos. Revisa los datos de prueba que aparecen abajo.'; e.classList.add('on'); return; }
    e.classList.remove('on'); rol = r; try { sessionStorage.setItem(SES, r); } catch (x) { } $('#lp').value = '';
    go(C.puedeVer(r, go.next || 'panel') ? (go.next || 'panel') : (r === 'caja' ? 'caja' : 'panel'));
  };

  /* registro */
  function drawInstr() {
    const c = S.conv;
    $('#i-cierre').textContent = C.fdate(c.cierre); $('#i-pago').textContent = C.fdate(c.payFrom) + ' al ' + C.fdate(c.payTo); $('#i-exam').textContent = C.fdate(c.exam);
    $('#asistidoRow').hidden = rol !== 'coordinador';
    const cerrado = C.hoy(S) > c.cierre, g = $('#e-general');
    if (cerrado) { g.textContent = 'El registro cerró el ' + C.fdate(c.cierre) + '. Ya no se aceptan más registros.'; g.classList.add('on'); } else g.classList.remove('on');
  }
  const E = (k, m) => { const e = $('#e-' + k); e.textContent = m || ''; e.classList.toggle('on', !!m); };
  $('#f').onsubmit = ev => {
    ev.preventDefault();
    const d = { control: $('#control').value, nombre: $('#nombre').value, carrera: $('#carrera').value, grupo: $('#grupo').value };
    const r = C.registrar(S, d, { asistido: rol === 'coordinador' && $('#asistido').checked });
    ['control', 'nombre', 'carrera', 'grupo', 'general'].forEach(k => E(k, r.ok ? '' : r.errores[k]));
    if (!r.ok) { const first = ['control', 'nombre', 'carrera', 'grupo'].find(k => r.errores[k]); if (first) $('#' + first).focus(); return; }
    save(); lastRec = r.rec; const c = S.conv;
    $('#o-ref').textContent = r.rec.ref; $('#o-con').textContent = r.rec.con; $('#o-code').textContent = r.rec.code; $('#o-win').textContent = C.fdate(c.payFrom) + ' al ' + C.fdate(c.payTo);
    $('#regForm').hidden = true; $('#regOk').hidden = false; window.scrollTo(0, 0);
  };
  $('#copyCode').onclick = () => { const t = lastRec.code; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Código copiado.')).catch(() => toast('Anota tu código: ' + t)); };
  $('#toConsulta').onclick = () => { go('consulta'); $('#qc').value = lastRec.c; $('#qk').value = lastRec.code; };
  $('#otro').onclick = () => { $('#f').reset(); $('#regOk').hidden = true; $('#regForm').hidden = false; drawInstr(); };

  /* consulta */
  function drawDemo() {
    const ej = S.regs.slice(0, 2);
    $('#demoQ').innerHTML = ej.length ? '<b>Para probar:</b> ' + ej.map(r => `control <code>${esc(r.c)}</code> con código <code>${esc(r.code)}</code>`).join(', o ') + '. También puedes registrarte primero y usar tu propio código.' : 'No hay aspirantes todavía. Regístrate primero.';
  }
  $('#q').onsubmit = ev => {
    ev.preventDefault(); const r = $('#qres'), e = $('#e-q'), v = C.consultar(S, $('#qc').value, $('#qk').value);
    if (!v) { r.hidden = true; e.textContent = 'No encontramos ese número de control con ese código. Revisa los dos datos e inténtalo de nuevo.'; e.classList.add('on'); return; }
    e.classList.remove('on'); r.hidden = false;
    const hint = v.nivel ? 'Ya puedes consultar tu nivel.' : v.estatus === 'Pagado' ? 'Tu pago está confirmado. El nivel aparece después del examen.' : 'Aún no vemos tu pago. Paga con tu referencia dentro de la ventana de pago.';
    r.innerHTML = `<div class="kv"><span>Estatus</span><span class="pill ${v.estatus === 'Registrado' ? 'p-reg' : 'p-pag'}">${esc(v.estatus)}</span></div><div class="kv" style="margin-top:10px"><span>Tu nivel</span><b>${esc(v.nivel || 'Aún no disponible')}</b></div><p class="hint">${hint}</p>`;
  };

  /* panel */
  function kpi(el) {
    const s = C.estadisticas(S);
    el.innerHTML = [[s.registrados, 'Registrados'], [s.pagados, 'Pagados'], [s.pendientes, 'Pendientes de pago'], [s.asistentes, 'Con resultado (asistentes)'], [s.excepciones, 'Excepciones']].map(x => `<div class="kpi"><b>${x[0]}</b><span>${x[1]}</span></div>`).join('');
    return s;
  }
  function drawPanel() {
    const s = kpi($('#kpis'));
    $('#nivelesTxt').textContent = 'Niveles: ' + (Object.keys(s.niveles).length ? C.NIVELES.filter(n => s.niveles[n]).map(n => n + ' ' + s.niveles[n]).join(' · ') : 'aún sin resultados');
    const c = S.conv; $('#d1').value = c.cierre; $('#d2').value = c.payFrom; $('#d3').value = c.payTo; $('#d4').value = c.exam; $('#d0').value = S.hoy || '';
    $('#hoyTxt').textContent = C.fdate(C.hoy(S)) + (S.hoy ? ' (fecha simulada)' : '');
    $('#convTxt').value = C.textoConvocatoria(S, location.href.split('#')[0]);
    const rem = C.recordatorios(S); $('#remNote').textContent = 'Se arma la lista de quien no ha pagado 24 horas antes del cierre del pago (' + C.fdate(rem.fecha) + '). Pendientes ahora: ' + rem.pendientes.length + '.';
    drawTable(); drawExc(); drawAvisos();
  }
  function drawTable() {
    const f = C.filtrar(S, { q: $('#buscar').value, estatus: $('#fEst').value, carrera: $('#fCar').value, grupo: $('#fGru').value });
    $('#cuenta').textContent = f.length + ' de ' + S.regs.length;
    const rows = f.slice(0, 200).map(x => `<tr><td class="num">${esc(x.c)}</td><td>${esc(x.n)}${x.asistido ? ' <span class="note">(asistido)</span>' : ''}</td><td>${esc(x.ca)}</td><td>${esc(x.g)}</td><td>${pill(x)}</td><td>${esc(x.pub ? x.niv : '—')}</td></tr>`).join('');
    $('#tb').innerHTML = (rows || '<tr><td colspan="6">Ningún aspirante coincide con la búsqueda.</td></tr>') + (f.length > 200 ? `<tr><td colspan="6" class="note">Se muestran los primeros 200. Usa la búsqueda para acotar.</td></tr>` : '');
  }
  function drawExc() {
    const pend = S.regs.filter(x => x.st !== 'Pagado');
    $('#exc').innerHTML = S.exc.length ? S.exc.map(e => `<div class="card"><b>${esc(e.tipo)}</b><div class="note">${esc(e.detalle)}</div>${e.kind === 'pago' ? `<div class="row" style="margin-top:8px"><select data-sel="${e.id}" aria-label="Aspirante a asociar"><option value="">Elige aspirante</option>${pend.slice(0, 300).map(x => `<option value="${esc(x.c)}">${esc(x.c)} · ${esc(x.n)}</option>`).join('')}</select><button class="btn sm" data-as="${e.id}" type="button">Asociar pago</button></div>` : ''}</div>`).join('') : '<p class="note">Sin excepciones por ahora.</p>';
    $$('[data-as]').forEach(b => b.onclick = () => { const id = +b.dataset.as, r = C.asociarExcepcion(S, id, $(`[data-sel="${id}"]`).value); if (!r.ok) { toast(r.error); return; } save(); toast('Pago asociado. El aspirante ahora aparece como pagado.'); drawPanel(); });
  }
  function drawAvisos() {
    $('#avisos').innerHTML = S.avisos.slice(0, 8).map(a => `<li><b>${esc(a.tipo === 'recordatorio' ? 'Recordatorio' : a.tipo === 'pago' ? 'Confirmación de pago' : 'Confirmación de registro')}</b> · para ${esc(a.para)} · ${esc(a.fecha)}<br>${esc(a.texto)}</li>`).join('') || '<li>Sin avisos todavía.</li>';
  }
  ['buscar', 'fEst', 'fCar', 'fGru'].forEach(i => $('#' + i).oninput = drawTable);
  $('#saveD').onclick = () => {
    const v = { cierre: $('#d1').value, payFrom: $('#d2').value, payTo: $('#d3').value, exam: $('#d4').value };
    if (!v.cierre || !v.payFrom || !v.payTo || !v.exam) { msg('#dMsg', 'Completa las cuatro fechas.', 'bad'); return; }
    if (v.payFrom > v.payTo) { msg('#dMsg', 'El pago no puede empezar después de que termina.', 'bad'); return; }
    if (v.exam < v.payTo) { msg('#dMsg', 'El examen debe ser después del cierre de pagos.', 'bad'); return; }
    S.conv = v; S.hoy = $('#d0').value; save(); msg('#dMsg', 'Fechas guardadas. Se usan en validaciones, avisos y listas.', 'good'); drawPanel();
  };
  $('#copyConv').onclick = () => { const t = $('#convTxt').value; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Texto copiado.')).catch(() => { $('#convTxt').select(); toast('Selecciona y copia el texto.'); }); };
  function cruzar(text) {
    const r = C.importarPagos(S, text);
    if (!r.ok) { msg('#payMsg', r.error, 'bad'); return; }
    save(); msg('#payMsg', `Reporte de ${r.total} pagos: ${r.identificados} quedaron «pagado» sin intervención y ${r.excepciones} pasaron a excepciones.`, 'good'); drawPanel();
  }
  $('#loadPay').onclick = () => { if (!readFile($('#filePay'), cruzar)) msg('#payMsg', 'Elige primero un archivo CSV, o usa el reporte de ejemplo.', 'bad'); };
  $('#ejPay').onclick = () => { const t = C.pagosEjemploCSV(S, 60, true); if (!S.regs.some(r => r.st !== 'Pagado')) { msg('#payMsg', 'No hay aspirantes pendientes de pago. Reinicia con datos de prueba.', 'bad'); return; } cruzar(t); };
  function revisar(text) {
    const r = C.previsualizarResultados(S, text);
    if (!r.ok) { prev = null; $('#pubRes').hidden = true; msg('#resMsg', r.error, 'bad'); return; }
    prev = r; $('#pubRes').hidden = r.asociados.length === 0;
    msg('#resMsg', `Archivo de ${r.total} resultados: ${r.asociados.length} se asociarán a su aspirante y ${r.exc.length} irán a excepciones. Si es correcto, confirma.`, r.exc.length ? '' : 'good');
  }
  $('#prevRes').onclick = () => { if (!readFile($('#fileRes'), revisar)) msg('#resMsg', 'Elige primero un archivo CSV, o usa el resultado de ejemplo.', 'bad'); };
  $('#ejRes').onclick = () => revisar(C.resultadosEjemploCSV(S, 7));
  $('#pubRes').onclick = () => { if (!prev) return; const r = C.publicarResultados(S, prev); prev = null; save(); $('#pubRes').hidden = true; msg('#resMsg', `Niveles publicados: ${r.publicados}. Excepciones: ${r.excepciones}. Cada aspirante ya ve su nivel al consultar su estatus.`, 'good'); drawPanel(); };
  $('#remind').onclick = () => { const r = C.enviarRecordatorio(S); save(); msg('#remMsg', `Lista de ${r.pendientes.length} aspirantes sin pago enviada a la Coordinación (simulado).${r.vencido ? '' : ' Aún falta para la fecha del recordatorio; se envió de todos modos para la prueba.'}`, 'good'); drawAvisos(); };
  $('#exRem').onclick = () => download('pendientes_de_pago.csv', C.toCSV([['control', 'Control'], ['nombre', 'Nombre'], ['referencia', 'Referencia'], ['concepto', 'Concepto']], C.recordatorios(S).pendientes));
  $('#exPag').onclick = () => download('lista_examen_pagados.csv', C.toCSV(C.COLS.pagados, C.listaPagados(S)));
  $('#exNiv').onclick = () => download('lista_por_nivel.csv', C.toCSV(C.COLS.nivel, C.listaNivel(S)));
  function reiniciar(n) { S = C.nuevoConDatos(n); prev = null; save(); $('#pubRes').hidden = true; ['#payMsg', '#resMsg', '#remMsg', '#dMsg', '#perfMsg'].forEach(i => msg(i, '')); drawPanel(); toast('Datos de prueba reiniciados: ' + n + ' aspirantes.'); }
  $('#seed60').onclick = () => reiniciar(60); $('#seed600').onclick = () => reiniciar(600); $('#seed0').onclick = () => reiniciar(0);
  $('#perf').onclick = () => {
    const t = () => performance.now(); let a = t();
    const tmp = JSON.parse(JSON.stringify(S)); if (tmp.regs.length < 600) C.sembrar(tmp, 600 - tmp.regs.length, 99);
    const reg = (() => { const s0 = t(); C.registrar(tmp, { control: '29990001', nombre: 'Prueba Tiempo Medido', carrera: C.CARRERAS[0], grupo: 'A' }); return t() - s0; })();
    const bus = (() => { const s0 = t(); C.filtrar(tmp, { q: '29990001' }); return t() - s0; })();
    const fil = (() => { const s0 = t(); C.filtrar(tmp, { q: '2624', carrera: C.CARRERAS[0], grupo: 'A', estatus: 'Registrado' }); return t() - s0; })();
    msg('#perfMsg', `Con ${tmp.regs.length} registros (copia, no cambia tus datos): registrar ${reg.toFixed(1)} ms · buscar por control ${bus.toFixed(1)} ms · filtrar combinado ${fil.toFixed(1)} ms. La meta es menos de 3000 ms.`, Math.max(reg, bus, fil) < 3000 ? 'good' : 'bad');
  };

  /* caja */
  function drawCaja() {
    kpi($('#kpis2'));
    const rows = C.reporteCaja(S); $('#tc').innerHTML = rows.slice(0, 300).map(r => `<tr><td class="num">${esc(r.referencia)}</td><td>${esc(r.concepto)}</td><td class="num">${esc(r.control)}</td><td>${esc(r.nombre)}</td><td class="num">$${r.monto}.00</td><td><span class="pill ${r.estatus === 'Pagado' ? 'p-pag' : 'p-reg'}">${esc(r.estatus)}</span></td></tr>`).join('') + (rows.length > 300 ? `<tr><td colspan="6" class="note">Se muestran 300 de ${rows.length}. El archivo descargable trae todos.</td></tr>` : '') || '<tr><td colspan="6">No hay registros.</td></tr>';
  }
  $('#exp').onclick = () => download('reporte_para_caja.csv', C.toCSV(C.COLS.caja, C.reporteCaja(S)));

  $('#wireBtn').onclick = () => { const on = document.documentElement.classList.toggle('wire'); $('#wireBtn').setAttribute('aria-pressed', on); $('#wireBtn').textContent = on ? 'Ver con diseño' : 'Ver como wireframe'; };
  const h = (location.hash || '#registro').slice(1).replace(/[^a-z]/g, '');
  go(['registro', 'consulta', 'panel', 'caja'].includes(h) ? h : 'registro');
})();
