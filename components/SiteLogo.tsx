import { View, Text } from "react-native";
import { Image } from "expo-image";
import { useEffect, useState } from "react";

export default function SiteLogo({ tagline }: { tagline?: string }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("https://www.poisonrana.com/api/v1/config")
      .then((r) => r.json())
      .then((j) => setLogoUrl(j.data?.logoUrl ?? null))
      .catch(() => {});
  }, []);

  return (
    <View className="items-center mb-10">
      {logoUrl ? (
        <Image
          source={{ uri: logoUrl }}
          style={{ width: 120, height: 120 }}
          contentFit="contain"
        />
      ) : (
        <Text className="text-yellow text-4xl font-black italic tracking-tight">
          POISON RANA
        </Text>
      )}
      {tagline && (
        <Text className="text-muted text-sm mt-1">{tagline}</Text>
      )}
    </View>
  );
}
