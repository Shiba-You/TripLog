import { render } from '@testing-library/react-native';
import type { FeatureCollection } from 'geojson';

import { VisitedRegionFillLayer } from '../VisitedRegionFillLayer';

const nonEmptyGeojson: FeatureCollection = {
  type: 'FeatureCollection',
  features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[139, 35], [140, 35], [140, 36], [139, 35]]] }, properties: {} }],
};

const emptyGeojson: FeatureCollection = { type: 'FeatureCollection', features: [] };

describe('VisitedRegionFillLayer', () => {
  it('AC-8: geojsonが非空かつvisible=trueのときGeoJSONSource/Layerを描画する', async () => {
    const result = await render(<VisitedRegionFillLayer geojson={nonEmptyGeojson} visible />);
    expect(result.toJSON()).not.toBeNull();
  });

  it('AC-9: geojsonが空のとき何も描画しない', async () => {
    const result = await render(<VisitedRegionFillLayer geojson={emptyGeojson} visible />);
    expect(result.toJSON()).toBeNull();
  });

  it('geojsonがundefinedのとき何も描画しない', async () => {
    const result = await render(<VisitedRegionFillLayer geojson={undefined} visible />);
    expect(result.toJSON()).toBeNull();
  });

  it('AC-31: visible=falseのとき何も描画しない（レイヤートグルOFF）', async () => {
    const result = await render(<VisitedRegionFillLayer geojson={nonEmptyGeojson} visible={false} />);
    expect(result.toJSON()).toBeNull();
  });
});
