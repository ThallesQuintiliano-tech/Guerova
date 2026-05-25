import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Label, Input, FormGroup, Row, Col } from 'reactstrap';
import { Typeahead } from 'react-bootstrap-typeahead';
import 'react-bootstrap-typeahead/css/Typeahead.css';
import { BRAZIL_STATES } from './brazilStates';
import { formatCityField, optionFromParts, parseCityField } from './cityField';

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Estado (UF) + cidade com autocompletar. Permite selecionar sugestões ou digitar livremente.
 */
export default function CityStatePicker({ id = 'scraping-city', value, onChange, disabled = false }) {
  const parsed = useMemo(() => parseCityField(value), [value]);
  const [uf, setUf] = useState(parsed.uf);
  const [selected, setSelected] = useState(() => {
    const opt = optionFromParts(parsed.city, parsed.uf);
    return opt ? [opt] : [];
  });
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const lastEmitted = useRef(value);

  useEffect(() => {
    if (value === lastEmitted.current) {
      return;
    }
    const next = parseCityField(value);
    setUf(next.uf);
    const opt = optionFromParts(next.city, next.uf);
    setSelected(opt ? [opt] : []);
  }, [value]);

  const emitChange = useCallback(
    (city, stateUf) => {
      const formatted = formatCityField(city, stateUf);
      lastEmitted.current = formatted;
      onChange?.(formatted);
    },
    [onChange]
  );

  const fetchLocations = useCallback(async (query, stateUf) => {
    const q = String(query ?? '').trim();
    if (q.length < 2) {
      setOptions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ q });
      if (stateUf) {
        params.set('uf', stateUf);
      }
      const r = await fetch(`/api/scraping/locations?${params}`, {
        headers: { Accept: 'application/json' },
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setOptions([]);
        return;
      }
      setOptions(Array.isArray(j?.items) ? j.items : []);
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedFetch = useMemo(() => debounce(fetchLocations, 280), [fetchLocations]);

  const handleUfChange = (e) => {
    const nextUf = e.target.value;
    setUf(nextUf);
    setOptions([]);
    if (selected.length) {
      const current = selected[0];
      const cityName = current.city ?? String(current.label ?? '').replace(/\s*-\s*[A-Z]{2}$/i, '').trim();
      const updated = optionFromParts(cityName, nextUf);
      if (updated) {
        setSelected([updated]);
        emitChange(updated.city, updated.uf);
      }
      if (cityName.length >= 2) {
        debouncedFetch(cityName, nextUf);
      }
    }
  };

  const handleCityChange = (picked) => {
    if (!picked?.length) {
      setSelected([]);
      emitChange('', uf);
      return;
    }

    const item = picked[0];
    let cityName = '';
    let stateUf = uf;

    if (typeof item === 'string' || typeof item === 'number') {
      cityName = String(item).trim();
    } else if (item.customOption || item.custom || !item.city) {
      const raw = String(item.label ?? item).trim();
      const fromLabel = parseCityField(raw);
      cityName = fromLabel.city || raw;
      stateUf = fromLabel.uf || uf;
    } else {
      cityName = item.city;
      stateUf = item.uf || uf;
    }

    const opt = optionFromParts(cityName, stateUf);
    setSelected(opt ? [opt] : []);
    if (stateUf && stateUf !== uf) {
      setUf(stateUf);
    }
    emitChange(cityName, stateUf);
  };

  return (
    <FormGroup className="lm-city-picker mb-0">
      <Label className="mb-2">Localização</Label>
      <Row className="g-2">
        <Col xs={12} sm={4}>
          <Label for={`${id}-uf`} className="small text-muted mb-1">
            Estado (UF)
          </Label>
          <Input
            id={`${id}-uf`}
            type="select"
            value={uf}
            onChange={handleUfChange}
            disabled={disabled}
            aria-label="Estado"
          >
            <option value="">Todos</option>
            {BRAZIL_STATES.map((s) => (
              <option key={s.uf} value={s.uf}>
                {s.uf} — {s.name}
              </option>
            ))}
          </Input>
        </Col>
        <Col xs={12} sm={8}>
          <Label for={`${id}-city`} className="small text-muted mb-1">
            Cidade
          </Label>
          <div className="lm-city-picker-typeahead">
            <Typeahead
              inputProps={{
                id: `${id}-city`,
                'aria-label': 'Cidade',
                disabled,
              }}
              allowNew={!uf}
              newSelectionPrefix="Usar: "
              minLength={2}
              labelKey="label"
              filterBy={() => true}
              options={options}
              selected={selected}
              isLoading={loading}
              placeholder={uf ? 'Digite 2+ letras e escolha na lista' : 'Primeiro selecione o estado (UF)'}
              highlightFirstResult
              onInputChange={(text) => debouncedFetch(text, uf)}
              onChange={handleCityChange}
              onFocus={() => {
                const text = selected[0]?.city ?? selected[0]?.label ?? '';
                if (String(text).length >= 2) {
                  debouncedFetch(text, uf);
                }
              }}
              disabled={disabled}
            />
          </div>
        </Col>
      </Row>
      <small className="text-muted d-block mt-2">
        Selecione o <strong>estado</strong>, digite a cidade e escolha na lista (IBGE). Sem UF não é possível buscar. Vazio usa{' '}
        <code>SCRAPING_DEFAULT_CITY</code> no backend.
      </small>
    </FormGroup>
  );
}
