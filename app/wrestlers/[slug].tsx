import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image } from "expo-image";
import { api } from "@/lib/api";
import { Wrestler, ApiResponse } from "@/lib/types";

const { width } = Dimensions.get("window");

interface WrestlerWithMatches extends Wrestler {
  matches: Array<{
    id: string;
    team: number;
    isWinner: boolean;
    match: {
      id: string;
      title: string;
      type: string;
      rating: number;
      duration?: number;
      event: {
        id: string;
        title: string;
        slug: string;
        date: string;
        promotion: string;
      };
    };
  }>;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function WrestlerDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [wrestler, setWrestler] = useState<WrestlerWithMatches | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const wrestlerSlug = Array.isArray(slug) ? slug[0] : slug;
    api
      .get<ApiResponse<WrestlerWithMatches>>(`/wrestlers/${wrestlerSlug}`)
      .then((res) => setWrestler(res.data ?? null))
      .catch((err) => console.error("Wrestler fetch error:", err))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color="#F5C518" size="large" />
      </View>
    );
  }

  if (!wrestler) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Text className="text-muted">Wrestler not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background" showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View className="items-center pt-20 pb-6 px-4">
        {wrestler.imageUrl ? (
          <Image
            source={{ uri: wrestler.imageUrl }}
            style={{ width: 120, height: 120, borderRadius: 60 }}
            contentFit="cover"
          />
        ) : (
          <View className="w-28 h-28 rounded-full bg-surface border border-border items-center justify-center">
            <Text className="text-4xl">🥊</Text>
          </View>
        )}
        <Text className="text-white text-2xl font-black italic mt-4 text-center">
          {wrestler.name.toUpperCase()}
        </Text>
        {wrestler.bio && (
          <Text className="text-muted text-sm text-center mt-2 italic">
            {wrestler.bio}
          </Text>
        )}
        <View className="mt-3 bg-surface border border-border rounded-xl px-6 py-2">
          <Text className="text-yellow font-bold text-center">
            {wrestler.matchCount ?? wrestler.matches?.length ?? 0} Matches
          </Text>
        </View>
      </View>

      {/* Match History */}
      <View className="px-4 pb-8">
        <Text className="text-white text-lg font-black italic mb-3">
          MATCH HISTORY
        </Text>
        {wrestler.matches?.map((entry) => (
          <TouchableOpacity
            key={entry.id}
            onPress={() => router.push(`/events/${entry.match.event.slug}`)}
            className="bg-surface border border-border rounded-xl p-3 mb-3 flex-row items-start"
            activeOpacity={0.75}
          >
            <View
              className={`w-6 h-6 rounded-full items-center justify-center mr-3 mt-0.5 ${
                entry.isWinner ? "bg-yellow/20 border border-yellow/40" : "bg-subtle"
              }`}
            >
              <Text className="text-[10px] font-bold text-yellow">
                {entry.isWinner ? "W" : "L"}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold text-xs leading-snug">
                {entry.match.title}
              </Text>
              <Text className="text-muted text-[10px] mt-0.5">
                {entry.match.event.title}
              </Text>
              <Text className="text-muted text-[10px]">
                {entry.match.event.promotion} · {formatDate(entry.match.event.date)}
              </Text>
            </View>
            {entry.match.rating > 0 && (
              <Text className="text-yellow text-xs font-bold ml-2">
                ★ {entry.match.rating.toFixed(2)}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}
