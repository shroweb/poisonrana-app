import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { api } from "@/lib/api";
import { RankedEvent, ApiResponse } from "@/lib/types";

const PROMOTIONS = ["All", "WWE", "AEW", "NJPW", "TNA", "ROH"];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function RankingsScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<RankedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [promotion, setPromotion] = useState("All");

  async function fetchRankings() {
    const params: Record<string, string | number> = { limit: 100 };
    if (promotion !== "All") params.promotion = promotion;
    const res = await api.get<ApiResponse<RankedEvent[]>>(
      "/rankings/events",
      params
    );
    setEvents(res.data ?? []);
  }

  useEffect(() => {
    setLoading(true);
    fetchRankings().finally(() => setLoading(false));
  }, [promotion]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRankings();
    setRefreshing(false);
  }, [promotion]);

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="px-4 pt-4 pb-4">
        <Text className="text-muted text-xs mb-4">
          Bayesian weighted community rating
        </Text>

        {/* Promotion filter */}
        <FlatList
          data={PROMOTIONS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setPromotion(item)}
              className={`mr-2 px-4 py-1.5 rounded-full border ${
                promotion === item
                  ? "bg-yellow border-yellow"
                  : "bg-transparent border-border"
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  promotion === item ? "text-black" : "text-muted"
                }`}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#F5C518" size="large" />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 pb-8"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#F5C518"
            />
          }
          renderItem={({ item, index }) => (
            <TouchableOpacity
              onPress={() => router.push(`/events/${item.slug}`)}
              activeOpacity={0.75}
              className="flex-row items-center mb-3 bg-surface rounded-xl p-3 border border-border"
            >
              {/* Rank number */}
              <View className="w-9 items-center mr-3">
                <Text
                  className={`font-black text-base ${
                    index === 0
                      ? "text-yellow"
                      : index < 3
                      ? "text-white"
                      : "text-muted"
                  }`}
                >
                  #{index + 1}
                </Text>
              </View>

              {/* Poster */}
              {item.posterUrl ? (
                <Image
                  source={{ uri: item.posterUrl }}
                  style={{ width: 44, height: 60, borderRadius: 6 }}
                  contentFit="cover"
                />
              ) : (
                <View
                  style={{ width: 44, height: 60, borderRadius: 6 }}
                  className="bg-subtle"
                />
              )}

              {/* Info */}
              <View className="flex-1 ml-3">
                <Text
                  className="text-white font-bold text-sm leading-tight"
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
                <Text className="text-muted text-xs mt-0.5">
                  {item.promotion} · {formatDate(item.date)}
                </Text>
                <View className="flex-row items-center mt-1.5 gap-3">
                  <Text className="text-yellow text-xs font-bold">
                    ★ {item.bayesianScore?.toFixed(3) ?? item.averageRating?.toFixed(2)}
                  </Text>
                  <Text className="text-muted text-xs">
                    {item.reviewCount} reviews
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View className="items-center mt-20">
              <Text className="text-muted">No ranked events yet.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
