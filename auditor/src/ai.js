const MODEL = process.env.AUDIT_MODEL || 'claude-sonnet-5-5';

/**
 * Resume el informe con IA. La IA solo recibe los hallazgos ya medidos
 * y no puede añadir datos nuevos. Si no hay API key, devuelve null.
 */
export async function summarize(report, { key = process.env.ANTHROPIC_API_KEY } = {}) {
  if (!key) return null;
  const facts = report.findings
    .filter((f) => f.status !== 'pass')
    .map((f) => ({ id: f.id, estado: f.status, titulo: f.title, evidencia: f.evidence }));
  const prompt = `Eres consultor de marketing digital de una agencia en Colombia. Con base SOLO en estos hallazgos medidos de ${report.url}, escribe en español:
1) "resumen": 2 o 3 frases para el dueño del negocio, sin tecnicismos.
2) "prioridades": máximo 5 acciones ordenadas por impacto en ventas, cada una con "accion" y "motivo", citando el id del hallazgo en "ref".
No inventes datos de tráfico, ranking ni métricas que no estén en la lista. Responde solo JSON: {"resumen": string, "prioridades": [{"ref": string, "accion": string, "motivo": string}]}.

Hallazgos: ${JSON.stringify(facts)}
Puntaje global: ${report.score.total}/100.`;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: AbortSignal.timeout(45000),
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: 1200, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const text = j.content?.find((c) => c.type === 'text')?.text || '';
    const parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
    const known = new Set(report.findings.map((f) => f.id));
    return {
      resumen: String(parsed.resumen || ''),
      prioridades: (parsed.prioridades || []).filter((p) => known.has(p.ref)).slice(0, 5),
    };
  } catch {
    return null;
  }
}
