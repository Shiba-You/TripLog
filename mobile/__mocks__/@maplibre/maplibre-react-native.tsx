// @maplibre/maplibre-react-native の手動モック（Jest実行時のみ使用）。
//
// `@maplibre/maplibre-react-native` はExpo Go非対応・ネイティブモジュール必須のため、
// Jest環境では実際のネイティブ描画は行わずコンポーネントロジック（GeoJSON/スタイル生成、
// props分岐、イベントハンドラ呼び出し）だけを検証する方針（S-001 plan.md / tasks.md 前提）。
// Dev Build環境が整い次第、実機/シミュレータで本物のライブラリによる描画確認を行う。
import React from 'react';
import { View } from 'react-native';

export const Map = React.forwardRef((props: any, ref: any) => (
  <View testID="mock-maplibre-map" ref={ref} {...props}>
    {props.children}
  </View>
));

export const Camera = React.forwardRef((props: any, ref: any) => {
  React.useImperativeHandle(ref, () => ({
    fitBounds: jest.fn(),
    setCamera: jest.fn(),
    flyTo: jest.fn(),
  }));
  return <View testID="mock-maplibre-camera" {...props} />;
});

export const GeoJSONSource = React.forwardRef((props: any, ref: any) => {
  React.useImperativeHandle(ref, () => ({
    getData: jest.fn(),
    getClusterExpansionZoom: jest.fn().mockResolvedValue(10),
    getClusterLeaves: jest.fn(),
    getClusterChildren: jest.fn(),
  }));
  return (
    <View testID={`mock-maplibre-geojson-source-${props.id ?? 'default'}`} {...props}>
      {props.children}
    </View>
  );
});

export const Layer = (props: any) => (
  <View testID={`mock-maplibre-layer-${props.id ?? props.type ?? 'default'}`} {...props} />
);

export const Marker = (props: any) => (
  <View testID={`mock-maplibre-marker-${props.id ?? 'default'}`} {...props}>
    {props.children}
  </View>
);

export const UserLocation = (props: any) => (
  <View testID="mock-maplibre-user-location" {...props} />
);

export const useCurrentPosition = () => null;
