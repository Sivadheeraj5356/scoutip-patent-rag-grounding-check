(function () {
  const $ = (id) => document.getElementById(id);
  function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function run() {
    const chunks = [];
    const skipped = [];
    $('chunks').value.split('\n').forEach((raw, i) => {
      const p = raw.split('|').map((s) => s.trim());
      if (p.length >= 3 && p[0]) chunks.push({ id: p[0], tenant: p[1], text: p.slice(2).join(' | ') });
      else if (raw.trim()) skipped.push(i + 1);
    });
    const citations = {};
    const answerLines = [];
    $('answer').value.split('\n').forEach((raw) => {
      const line = raw.trim();
      if (!line) return;
      const m = line.match(/^(.*?)\s*\[([^\]]+)\]\s*$/);
      if (m) { citations[String(answerLines.length)] = m[2]; answerLines.push(m[1]); }
      else answerLines.push(line);
    });
    const { claims, findings } = PatentGroundingCheck.check({
      chunks, tenant: $('tenant').value.trim() || undefined,
      answer: answerLines.join(' '), citations,
    });
    if (skipped.length) findings.unshift({ level: 'warn', code: 'UNPARSED', text: `Chunk line(s) ${skipped.join(', ')} skipped - expected id | tenant | text.` });
    if (!findings.length) findings.push({ level: 'ok', code: 'GROUNDED', text: 'Every claim is cited, grounded and tenant-clean.' });
    $('findings').innerHTML = findings.map((f) =>
      `<li class="${f.level}"><span class="code">${esc(f.code)}</span><br>${esc(f.text)}</li>`).join('');
    $('claims').innerHTML = claims.map((c, i) =>
      `<li>${esc(c)} <span class="code">${citations[String(i)] ? '[' + esc(citations[String(i)]) + ']' : '[no citation]'}</span></li>`).join('');
    $('results').classList.remove('hidden');
  }
  $('run').addEventListener('click', run);
})();
