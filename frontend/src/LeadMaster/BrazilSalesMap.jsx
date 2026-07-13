import { useEffect, useState } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { biStateSalesCount, stateVolumeTier, MAP_COLORS } from './biDashboardData';

const GEO_URL = `${import.meta.env.BASE_URL}geo/brazil-states.geojson`;

export default function BrazilSalesMap() {
  const [geo, setGeo] = useState(null);
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(GEO_URL)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setGeo(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="four-bi-map-wrap">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 620, center: [-54, -15] }}
        width={400}
        height={340}
        style={{ width: '100%', height: 'auto' }}
      >
        <Geographies geography={geo || { type: 'FeatureCollection', features: [] }}>
          {({ geographies }) =>
            geographies.map((g) => {
              const uf = g.properties?.sigla;
              const count = biStateSalesCount[uf] || 0;
              const tier = stateVolumeTier(count);
              const fill = MAP_COLORS[tier];
              const isHovered = hovered === uf;
              return (
                <Geography
                  key={g.rsmKey}
                  geography={g}
                  onMouseEnter={() => setHovered(uf)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    default: { fill, stroke: '#fff', strokeWidth: 0.6, outline: 'none' },
                    hover: { fill: isHovered ? '#1e3a8a' : fill, stroke: '#fff', strokeWidth: 0.8, outline: 'none', cursor: 'pointer' },
                    pressed: { fill: '#1e3a8a', outline: 'none' },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
      {hovered && (
        <div className="four-bi-map-tooltip">
          <strong>{hovered}</strong>
          <span>{biStateSalesCount[hovered] || 0} vendas</span>
        </div>
      )}
    </div>
  );
}
