/** Converte "Cidade - UF" ↔ partes para o seletor. */
export function parseCityField(value) {
  const v = String(value ?? '').trim();
  if (!v) {
    return { city: '', uf: '' };
  }
  const match = v.match(/^(.+?)\s*-\s*([A-Za-z]{2})\s*$/);
  if (match) {
    return { city: match[1].trim(), uf: match[2].toUpperCase() };
  }
  return { city: v, uf: '' };
}

export function formatCityField(city, uf) {
  const c = String(city ?? '').trim();
  const u = String(uf ?? '')
    .trim()
    .toUpperCase();
  if (!c) {
    return '';
  }
  return u ? `${c} - ${u}` : c;
}

/** Valida antes de rodar o scraping. */
export function validateCityField(value) {
  const v = String(value ?? '').trim();
  if (!v) {
    return { ok: true, message: '' };
  }
  const { city, uf } = parseCityField(v);
  if (!city || city.length < 2) {
    return { ok: false, message: 'Informe o nome da cidade (mínimo 2 letras).' };
  }
  if (!uf) {
    return {
      ok: false,
      message: 'Selecione o estado (UF) e escolha a cidade na lista de sugestões (ex.: Campinas - SP).',
    };
  }
  if (city.length > 60 || /\b(brasil|ltda|s\.?a\.?|agco)\b/i.test(city)) {
    return {
      ok: false,
      message: 'Local inválido. Use apenas município + UF da lista, não nome de empresa.',
    };
  }
  return { ok: true, message: '' };
}

export function optionFromParts(city, uf) {
  const c = String(city ?? '').trim();
  const u = String(uf ?? '')
    .trim()
    .toUpperCase();
  if (!c) {
    return null;
  }
  const label = u ? `${c} - ${u}` : c;
  return {
    id: `custom-${label}`,
    label,
    city: c,
    uf: u,
    custom: true,
  };
}
