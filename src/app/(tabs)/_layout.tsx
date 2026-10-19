import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePreferences } from "../../theme/preferences";
import { GlassSurface } from "../../theme/GlassSurface";
import { navigationLayout } from "../../theme/navigation-layout";
import { AppIcon, type IconName } from "../../components/AppIcon";

const destinations = [
  {
    name: "index",
    label: "explore",
    icon: "compass-outline",
    active: "compass",
  },
  { name: "plants", label: "plants", icon: "leaf-outline", active: "leaf" },
  { name: "scan", label: "scan", icon: "camera-outline", active: "camera" },
  {
    name: "settings",
    label: "settings",
    icon: "settings-outline",
    active: "settings",
  },
  {
    name: "ask",
    label: "ask",
    icon: "chatbubbles-outline",
    active: "chatbubbles",
  },
] as const;
export default function TabsLayout() {
  const { t, colors } = usePreferences();
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const layout = navigationLayout(width, fontScale, insets.left, insets.right);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.secondary,
        tabBarHideOnKeyboard: true,
        tabBarLabelPosition: layout.horizontal ? "beside-icon" : "below-icon",
        tabBarAllowFontScaling: true,
        tabBarStyle: {
          position: "absolute",
          width: layout.width,
          left: layout.left,
          right: undefined,
          bottom: Math.max(insets.bottom, 10),
          height: layout.height,
          paddingTop: 8,
          paddingBottom: 8,
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarBackground: () => <GlassSurface style={nav.background} />,
        tabBarLabelStyle: {
          fontSize: layout.labelSize,
          lineHeight: layout.lineHeight,
          fontWeight: "600",
          marginTop: 3,
        },
        tabBarItemStyle: {
          minHeight: layout.horizontal ? 56 : 72,
          borderRadius: 22,
          paddingHorizontal: 2,
        },
      }}
    >
      {destinations.map((item) => (
        <Tabs.Screen
          key={item.name}
          name={item.name}
          options={{
            title: t(item.label),
            tabBarAccessibilityLabel: t(item.label),
            tabBarLabel: ({ color, focused }) => (
              <Text
                style={{
                  color,
                  fontSize: layout.labelSize,
                  lineHeight: layout.lineHeight,
                  fontWeight: focused ? "700" : "600",
                  textAlign: "center",
                  marginTop: layout.horizontal ? 0 : 4,
                  marginLeft: layout.horizontal ? 8 : 0,
                  flexShrink: 1,
                }}
              >
                {t(item.label)}
              </Text>
            ),
            tabBarIcon: ({ focused, color }) => (
              <View
                style={[
                  nav.icon,
                  { width: layout.horizontal ? 36 : 48 },
                  { backgroundColor: focused ? colors.muted : "transparent" },
                ]}
              >
                <AppIcon
                  name={(focused ? item.active : item.icon) as IconName}
                  size={layout.iconSize}
                  color={color}
                />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
const nav = StyleSheet.create({
  background: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 30,
    padding: 0,
  },
  icon: {
    width: 48,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
