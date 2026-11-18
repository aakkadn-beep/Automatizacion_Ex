/* EduNex Systems · núcleo del prototipo E4 (lógica sin pantalla, para poder probarla).
   Los datos son simulados. Funciona en el navegador (window.EduCore) y en Node (require). */
(function (root) {
  'use strict';
  const CARRERAS = ['Ing. en Sistemas Computacionales', 'Ing. Industrial', 'Ing. en Gestión Empresarial', 'Ing. Civil', 'Ing. Electromecánica'];
  const GRUPOS = ['A', 'B', 'C'];
  const NIVELES = ['A1', 'A2', 'B1', 'B2', 'C1'];
  const CUOTA = 500;
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const USUARIOS = { coordinador: { clave: 'edunex2026', rol: 'coordinador' }, caja: { clave: 'caja2026', rol: 'caja' } };

  const dv = c => { let s = 0; [...c].forEach((d, i) => s += (+d) * (i % 2 ? 1 : 3)); return (10 - s % 10) % 10; };
  const refOf = c => c + dv(c);
  const conceptOf = n => 'CLE' + n.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase();
  const rng = seed => { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const ALF = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const genCode = r => { let s = ''; for (let i = 0; i < 4; i++) s += ALF[Math.floor(r() * ALF.length)]; return s; };
  const pad = n => String(n).padStart(2, '0');
  const isoToday = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const fdate = iso => { const [y, m, d] = iso.split('-').map(Number); return d + ' de ' + MESES[m - 1]; };
  const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };

  function newState() {
    return { v: 1, conv: { cierre: '2026-11-27', payFrom: '2026-11-30', payTo: '2026-12-02', exam: '2026-12-04' }, hoy: '', regs: [], exc: [], avisos: [], nextId: 1 };
  }
  const hoy = st => st.hoy || isoToday();
  const aviso = (st, tipo, para, texto) => { st.avisos.unshift({ id: st.nextId++, tipo, para, texto, fecha: hoy(st) }); if (st.avisos.length > 200) st.avisos.length = 200; };

  /* ---------- Registro (RF-01 a RF-06, RF-12, RN-02, RN-04, RN-08) ---------- */
  function validarRegistro(st, d) {
    const e = {};
    const c = (d.control || '').trim(), n = (d.nombre || '').trim().replace(/\s+/g, ' ');
    if (!c) e.control = 'Escribe tu número de control.';
    else if (!/^\d{8}$/.test(c)) e.control = 'El número de control tiene 8 dígitos y solo números. Revisa que no falte ninguno.';
    else if (st.regs.some(x => x.c === c)) e.control = 'Este número de control ya está registrado. Consulta tu estatus con tu código.';
    if (n.split(' ').filter(Boolean).length < 2) e.nombre = 'Escribe tu nombre completo, con apellidos.';
    if (!CARRERAS.includes(d.carrera)) e.carrera = 'Elige tu carrera de la lista.';
    if (!GRUPOS.includes(d.grupo)) e.grupo = 'Elige tu grupo de la lista.';
    if (hoy(st) > st.conv.cierre) e.general = 'El registro cerró el ' + fdate(st.conv.cierre) + '. Ya no se aceptan más registros.';
    return { ok: Object.keys(e).length === 0, errores: e };
  }
  function nuevoReg(st, c, n, ca, g, code, asistido) {
    return { c, n, ca, g, st: 'Registrado', niv: '', pub: false, code, ref: refOf(c), con: conceptOf(n), asistido: !!asistido, fReg: hoy(st), fPago: '' };
  }
  function registrar(st, d, opc) {
    opc = opc || {};
    const v = validarRegistro(st, d);
    if (!v.ok) return { ok: false, errores: v.errores };
    const r = opc.rng || Math.random;
    const rec = nuevoReg(st, d.control.trim(), d.nombre.trim().replace(/\s+/g, ' '), d.carrera, d.grupo, genCode(r), opc.asistido);
    st.regs.push(rec);
    aviso(st, 'registro', rec.c, 'Registro confirmado. Referencia ' + rec.ref + ', concepto ' + rec.con + ', monto $' + CUOTA + '.');
    return { ok: true, rec };
  }

  /* ---------- Consulta (RF-13, RF-17, RNF-05, RNF-06) ---------- */
  const estatusDe = r => r.pub ? 'Nivel disponible' : r.st;
  function consultar(st, control, codigo) {
    const r = st.regs.find(x => x.c === (control || '').trim() && x.code === (codigo || '').trim().toUpperCase());
    if (!r) return null;
    return { estatus: estatusDe(r), nivel: r.pub ? r.niv : '' }; // solo estatus y nivel, nada más
  }

  /* ---------- CSV ---------- */
  const norm = s => s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  function parseCSV(text) {
    text = String(text).replace(/^﻿/, '');
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
    if (!lines.length) return { headers: [], rows: [] };
    const sep = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
    const cut = l => { const out = []; let cur = '', q = false; for (let i = 0; i < l.length; i++) { const ch = l[i]; if (q) { if (ch === '"' && l[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; } else if (ch === '"') q = true; else if (ch === sep) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out.map(x => x.trim()); };
    const headers = cut(lines[0]).map(norm);
    const rows = lines.slice(1).map(l => { const c = cut(l), o = {}; headers.forEach((h, i) => o[h] = c[i] === undefined ? '' : c[i]); return o; });
    return { headers, rows };
  }
  const csvCell = v => { v = v == null ? '' : String(v); return /[",;\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const toCSV = (cols, rows) => [cols.map(c => csvCell(c[1])).join(',')].concat(rows.map(r => cols.map(c => csvCell(r[c[0]])).join(','))).join('\r\n') + '\r\n';

  /* ---------- Cruce de pagos (RF-07, RF-08, RF-12, RN-03, RN-05) ---------- */
  function importarPagos(st, text) {
    const p = parseCSV(text);
    if (!['referencia', 'monto', 'fecha'].every(h => p.headers.includes(h)))
      return { ok: false, error: 'El archivo no tiene el formato esperado. Debe traer las columnas referencia, monto y fecha.' };
    const vistos = new Set(); let ok = 0, exc = 0;
    p.rows.forEach(f => {
      const ref = f.referencia, monto = parseFloat(String(f.monto).replace(/[$,\s]/g, ''));
      const base = { id: st.nextId++, kind: 'pago', ref: ref, monto: isNaN(monto) ? f.monto : monto, fecha: f.fecha };
      let tipo = '', det = '';
      const r = st.regs.find(x => x.ref === ref);
      if (!ref) { tipo = 'Pago sin referencia'; det = 'El pago no trae referencia.'; }
      else if (!r) { tipo = 'Referencia sin registro'; det = 'La referencia ' + ref + ' no coincide con ningún aspirante.'; }
      else if (vistos.has(ref) || r.st === 'Pagado') { tipo = 'Pago duplicado'; det = 'La referencia ' + ref + ' ya tiene un pago aplicado.'; }
      else if (monto !== CUOTA) { tipo = 'Monto distinto'; det = 'Referencia ' + ref + ': pagó $' + (isNaN(monto) ? f.monto : monto) + ' y la cuota es $' + CUOTA + '.'; }
      else if (f.fecha < st.conv.payFrom || f.fecha > st.conv.payTo) { tipo = 'Pago fuera de la ventana'; det = 'Referencia ' + ref + ': pagó el ' + f.fecha + ' y la ventana es del ' + st.conv.payFrom + ' al ' + st.conv.payTo + '.'; }
      if (ref) vistos.add(ref);
      if (tipo) { st.exc.push(Object.assign(base, { tipo, detalle: det })); exc++; }
      else { r.st = 'Pagado'; r.fPago = f.fecha; ok++; aviso(st, 'pago', r.c, 'Pago confirmado. Ya estás en la lista del examen.'); }
    });
    return { ok: true, total: p.rows.length, identificados: ok, excepciones: exc };
  }
  function asociarExcepcion(st, id, control) {
    const i = st.exc.findIndex(e => e.id === id && e.kind === 'pago');
    if (i < 0) return { ok: false, error: 'No se encontró esa excepción.' };
    const r = st.regs.find(x => x.c === control);
    if (!r) return { ok: false, error: 'Elige a qué aspirante corresponde el pago.' };
    if (r.st === 'Pagado') return { ok: false, error: 'Ese aspirante ya tiene un pago aplicado.' };
    r.st = 'Pagado'; r.fPago = st.exc[i].fecha || ''; st.exc.splice(i, 1);
    aviso(st, 'pago', r.c, 'Pago confirmado. Ya estás en la lista del examen.');
    return { ok: true, rec: r };
  }

  /* ---------- Resultados (RF-16, RF-17, RN-07, RN-10) ---------- */
  function previsualizarResultados(st, text) {
    const p = parseCSV(text);
    if (!['control', 'nivel'].every(h => p.headers.includes(h)))
      return { ok: false, error: 'El archivo no tiene el formato esperado. Debe traer las columnas control y nivel. No se cambió nada.' };
    const asociados = [], exc = [];
    p.rows.forEach(f => {
      const c = f.control, n = (f.nivel || '').toUpperCase(), r = st.regs.find(x => x.c === c);
      if (!r) exc.push({ control: c, tipo: 'Número de control sin coincidencia', detalle: 'El número ' + c + ' no está en el registro.' });
      else if (r.st !== 'Pagado') exc.push({ control: c, tipo: 'Aspirante sin pago confirmado', detalle: 'El aspirante ' + c + ' no tiene pago confirmado.' });
      else if (!NIVELES.includes(n)) exc.push({ control: c, tipo: 'Nivel no válido', detalle: 'El nivel «' + f.nivel + '» no existe.' });
      else asociados.push({ c, niv: n });
    });
    return { ok: true, total: p.rows.length, asociados, exc };
  }
  function publicarResultados(st, prev) {
    prev.asociados.forEach(a => { const r = st.regs.find(x => x.c === a.c); r.niv = a.niv; r.pub = true; });
    prev.exc.forEach(e => st.exc.push({ id: st.nextId++, kind: 'resultado', tipo: e.tipo, detalle: e.detalle }));
    return { publicados: prev.asociados.length, excepciones: prev.exc.length };
  }

  /* ---------- Tablero, búsqueda, listas (RF-14, RF-15, RF-18, RF-19, RF-20) ---------- */
  function estadisticas(st) {
    const niveles = {}; st.regs.filter(r => r.pub).forEach(r => niveles[r.niv] = (niveles[r.niv] || 0) + 1);
    const pag = st.regs.filter(r => r.st === 'Pagado').length;
    return { registrados: st.regs.length, pagados: pag, pendientes: st.regs.length - pag, asistentes: st.regs.filter(r => r.pub).length, niveles, excepciones: st.exc.length };
  }
  function filtrar(st, f) {
    f = f || {}; const q = (f.q || '').trim().toLowerCase();
    return st.regs.filter(r => (!q || r.c.includes(q) || r.n.toLowerCase().includes(q)) && (!f.estatus || estatusDe(r) === f.estatus || r.st === f.estatus) && (!f.carrera || r.ca === f.carrera) && (!f.grupo || r.g === f.grupo));
  }
  const listaPagados = st => st.regs.filter(r => r.st === 'Pagado').map(r => ({ control: r.c, nombre: r.n, carrera: r.ca, grupo: r.g }));
  const listaNivel = st => st.regs.filter(r => r.pub).map(r => ({ control: r.c, nombre: r.n, carrera: r.ca, grupo: r.g, nivel: r.niv }));
  const reporteCaja = st => st.regs.map(r => ({ referencia: r.ref, concepto: r.con, control: r.c, nombre: r.n, monto: CUOTA, estatus: r.st }));
  const COLS = {
    pagados: [['control', 'Control'], ['nombre', 'Nombre'], ['carrera', 'Carrera'], ['grupo', 'Grupo']],
    nivel: [['control', 'Control'], ['nombre', 'Nombre'], ['carrera', 'Carrera'], ['grupo', 'Grupo'], ['nivel', 'Nivel']],
    caja: [['referencia', 'Referencia'], ['concepto', 'Concepto'], ['control', 'Control'], ['nombre', 'Nombre'], ['monto', 'Monto'], ['estatus', 'Estatus de pago']]
  };

  /* ---------- Convocatoria y recordatorios (RF-09, RF-10, RF-11, RF-21) ---------- */
  function textoConvocatoria(st, url) {
    const c = st.conv;
    return 'Examen de ubicación de lengua extranjera (enero–junio 2027). Registro hasta el ' + fdate(c.cierre) + '. Pago de $' + CUOTA + ' del ' + fdate(c.payFrom) + ' al ' + fdate(c.payTo) + '. Examen el ' + fdate(c.exam) + '. Regístrate aquí: ' + url;
  }
  const fechaRecordatorio = st => addDays(st.conv.payTo, -1);
  function recordatorios(st) {
    const pend = st.regs.filter(r => r.st !== 'Pagado');
    const fecha = fechaRecordatorio(st);
    return { fecha, pendientes: pend.map(r => ({ control: r.c, nombre: r.n, referencia: r.ref, concepto: r.con })), vencido: hoy(st) >= fecha };
  }
  function enviarRecordatorio(st) {
    const r = recordatorios(st);
    aviso(st, 'recordatorio', 'Coordinación', 'Lista de ' + r.pendientes.length + ' aspirantes sin pago. La ventana cierra el ' + fdate(st.conv.payTo) + '.');
    return r;
  }

  /* ---------- Acceso por rol (RNF-06) ---------- */
  const VISTAS = { inicio: null, ayuda: null, acceso: null, registro: null, consulta: null, panel: ['coordinador'], caja: ['coordinador', 'caja'] };
  function puedeVer(rol, vista) { const need = VISTAS[vista]; return need === null || (!!rol && need.includes(rol)); }
  function iniciarSesion(usuario, clave) { const u = USUARIOS[(usuario || '').trim().toLowerCase()]; return u && u.clave === clave ? u.rol : null; }

  /* ---------- Datos simulados ---------- */
  const NOM = ['Ana', 'Luis', 'Marta', 'Diego', 'Sofía', 'Iván', 'Camila', 'Jorge', 'Valeria', 'Pablo', 'Renata', 'Mateo', 'Daniela', 'Andrés', 'Paola', 'Hugo', 'Lucía', 'Emilio', 'Regina', 'Bruno'];
  const APE = ['Torres', 'Mena', 'Pérez', 'Cano', 'Lara', 'Soto', 'Rivas', 'Ortiz', 'Vela', 'Ruiz', 'Díaz', 'Gil', 'Luna', 'Salas', 'Mora', 'Ibarra', 'Reyes', 'Campos', 'Zúñiga', 'Aguilar'];
  function sembrar(st, n, seed) {
    const r = rng(seed || 2026); let c = 26240101; if (st.regs.length) c = Math.max(...st.regs.map(x => +x.c)) + 1; const out = [];
    for (let i = 0; i < n; i++, c++) {
      const nom = NOM[Math.floor(r() * NOM.length)] + ' ' + APE[Math.floor(r() * APE.length)] + ' ' + APE[Math.floor(r() * APE.length)];
      const rec = nuevoReg(st, String(c), nom, CARRERAS[Math.floor(r() * CARRERAS.length)], GRUPOS[Math.floor(r() * GRUPOS.length)], genCode(r), false);
      st.regs.push(rec); out.push(rec);
    }
    return out;
  }
  function nuevoConDatos(n) { const st = newState(); sembrar(st, n == null ? 60 : n); return st; }
  /* Reporte de pagos de ejemplo: n pagos, de los cuales 3 no coinciden (referencia mal escrita, monto distinto y fuera de ventana). */
  function pagosEjemploCSV(st, n, conErrores) {
    const pend = st.regs.filter(r => r.st !== 'Pagado').slice(0, n || 60);
    const dias = [st.conv.payFrom, addDays(st.conv.payFrom, 1), st.conv.payTo];
    const filas = pend.map((r, i) => ({ referencia: r.ref, monto: CUOTA, fecha: dias[i % 3] }));
    if (conErrores !== false && filas.length >= 40) {
      filas[9].referencia = filas[9].referencia.slice(0, -1) + String((+filas[9].referencia.slice(-1) + 1) % 10);
      filas[24].monto = 300;
      filas[39].fecha = addDays(st.conv.payTo, 3);
    }
    return toCSV([['referencia', 'referencia'], ['monto', 'monto'], ['fecha', 'fecha']], filas);
  }
  function resultadosEjemploCSV(st, seed) {
    const r = rng(seed || 7);
    return toCSV([['control', 'control'], ['nivel', 'nivel']], st.regs.map(x => ({ control: x.c, nivel: NIVELES[Math.floor(r() * 4)] })));
  }

  root.EduCore = { CARRERAS, GRUPOS, NIVELES, CUOTA, USUARIOS, dv, refOf, conceptOf, rng, genCode, fdate, addDays, isoToday, newState, hoy, validarRegistro, registrar, consultar, estatusDe, parseCSV, toCSV, importarPagos, asociarExcepcion, previsualizarResultados, publicarResultados, estadisticas, filtrar, listaPagados, listaNivel, reporteCaja, COLS, textoConvocatoria, fechaRecordatorio, recordatorios, enviarRecordatorio, puedeVer, iniciarSesion, sembrar, nuevoConDatos, pagosEjemploCSV, resultadosEjemploCSV };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.EduCore;
})(typeof window !== 'undefined' ? window : globalThis);
