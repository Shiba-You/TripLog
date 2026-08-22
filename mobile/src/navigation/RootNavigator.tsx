// S-001 AC-15, AC-24, AC-32, AC-34, AC-35: ルートナビゲーション構成。
// 下部タブ（マップ/旅行/家計簿/設定、AC-34,35）+ 各placeholder画面（S-002/S-003/S-005/S-006/S-009）
// への遷移を扱うStack Navigatorの組み合わせ。
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import MapScreen from '../screens/map/MapScreen';
import TrackingScreenPlaceholder from '../screens/placeholder/TrackingScreenPlaceholder';
import TripListScreenPlaceholder from '../screens/placeholder/TripListScreenPlaceholder';
import PhotoDetailScreenPlaceholder from '../screens/placeholder/PhotoDetailScreenPlaceholder';
import ExpensesScreenPlaceholder from '../screens/placeholder/ExpensesScreenPlaceholder';
import SettingsScreenPlaceholder from '../screens/placeholder/SettingsScreenPlaceholder';

export type MainTabParamList = {
  Map: undefined;
  TripList: { openCreateModal?: boolean } | undefined;
  Expenses: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  /** AC-33: トラック開始成功後の遷移先（S-002、placeholder） */
  Tracking: { trackId: string };
  /** AC-15: 写真ピンタップ時の遷移先（S-005、placeholder） */
  PhotoDetail: { photoId: string };
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function MainTabs() {
  return (
    <Tab.Navigator initialRouteName="Map" screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Map" component={MapScreen} options={{ tabBarLabel: 'マップ' }} />
      <Tab.Screen name="TripList" component={TripListScreenPlaceholder} options={{ tabBarLabel: '旅行' }} />
      <Tab.Screen name="Expenses" component={ExpensesScreenPlaceholder} options={{ tabBarLabel: '家計簿' }} />
      <Tab.Screen name="Settings" component={SettingsScreenPlaceholder} options={{ tabBarLabel: '設定' }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen
          name="Tracking"
          component={TrackingScreenPlaceholder}
          options={{ headerShown: true, title: 'トラッキング', presentation: 'modal' }}
        />
        <Stack.Screen
          name="PhotoDetail"
          component={PhotoDetailScreenPlaceholder}
          options={{ headerShown: true, title: '写真詳細' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
