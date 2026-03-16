import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { useEffect, useState } from "react";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

function HeaderLogo() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("https://www.poisonrana.com/api/v1/config")
      .then((r) => r.json())
      .then((j) => setLogoUrl(j.data?.logoUrl ?? null))
      .catch(() => {});
  }, []);

  if (!logoUrl) return null;

  return (
    <View style={{ marginLeft: 16, marginRight: 10 }}>
      <Image
        source={{ uri: logoUrl }}
        style={{ width: 32, height: 32 }}
        contentFit="contain"
      />
    </View>
  );
}

export default function TabsLayout() {
  const router = useRouter();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#0B1120" },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: { fontWeight: "900", fontSize: 18, letterSpacing: 0.3 },
        headerLeft: () => <HeaderLogo />,
        tabBarStyle: {
          backgroundColor: "#111827",
          borderTopColor: "#1F2937",
          height: 80,
          paddingBottom: 16,
        },
        tabBarActiveTintColor: "#F5C518",
        tabBarInactiveTintColor: "#6B7280",
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Events",
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push("/search")} style={{ marginRight: 16 }}>
              <Ionicons name="search-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          ),
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "calendar" : "calendar-outline" as IoniconName} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="rankings"
        options={{
          title: "Rankings",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "trophy" : "trophy-outline" as IoniconName} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="predictions"
        options={{
          title: "Predictions",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "podium" : "podium-outline" as IoniconName} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "person-circle" : "person-circle-outline" as IoniconName} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
