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
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { RankedEvent, ApiResponse } from "@/lib/types";
import EventCard from "@/components/EventCard";

function SkeletonCard() {
  return (
    <View style={{ width: "48%" }} className="bg-surface border border-border rounded-xl overflow-hidden mb-4">
      <View style={{ height: 130 }} className="bg-subtle" />
      <View className="p-2">
        <View className="h-2 bg-subtle rounded w-1/2 mb-2" />
        <View className="h-3 bg-subtle rounded w-full mb-1.5" />
        <View className="h-3 bg-subtle rounded w-4/5" />
      </View>
    </View>
  );
}

export default function RankingsScreen() {
  const [events, setEvents] = useState<RankedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [promotion, setPromotion] = useState("All");
  const [promotions, setPromotions] = useState<string[]>(["All"]);

  async function fetchRankings() {
    const params: Record<string, string | number> = { limit: 100 };
    if (promotion !== "All") params.promotion = promotion;

    let ranked: RankedEvent[] = [];
    try {
      const res = await api.get<ApiResponse<RankedEvent[]>>("/rankings/events", params);
      ranked = res.data ?? [];
    } catch {}

    if (ranked.length === 0) {
      try {
        const res = await api.get<ApiResponse<RankedEvent[]>>("/events", {
          ...params,
          upcoming: "false",
          sort: "rating_desc",
        });
        ranked = (res.data ?? []).filter((e) => e.averageRating > 0);
      } catch {}
    }

    setEvents(ranked);
  }

  useEffect(() => {
    api.get<ApiResponse<{ shortName: string }[]>>("/promotions")
      .then((res) => setPromotions(["All", ...(res.data ?? []).map((p) => p.shortName)]))
      .catch(() => {});
  }, []);

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
      {loading ? (
        <View className="flex-row flex-wrap px-4 pt-4 justify-between">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={events}
          numColumns={2}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          columnWrapperStyle={{ justifyContent: "space-between" }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F5C518" />}
          ListHeaderComponent={
            <View style={{ paddingTop: 20, paddingBottom: 8 }}>
              {/* Community Voted badge */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(245,197,24,0.12)", borderWidth: 1, borderColor: "rgba(245,197,24,0.3)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Ionicons name="trending-up" size={11} color="#F5C518" />
                  <Text style={{ color: "#F5C518", fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1 }}>Community Voted</Text>
                </View>
              </View>

              {/* Title */}
              <Text style={{ color: "#FFFFFF", fontSize: 32, fontWeight: "900", fontStyle: "italic", lineHeight: 36, marginBottom: 8 }}>
                {"EVENT\nRANKINGS"}
              </Text>
              <Text style={{ color: "#6B7280", fontSize: 13, lineHeight: 18, marginBottom: 20 }}>
                The definitive community-driven ranking of the greatest professional wrestling events, ordered by Bayesian weighted score.
              </Text>

              {/* Promotion filter */}
              <FlatList
                data={promotions}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item}
                style={{ marginHorizontal: -16, marginBottom: 16 }}
                contentContainerStyle={{ paddingHorizontal: 16 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => setPromotion(item)}
                    style={{
                      marginRight: 8, paddingHorizontal: 16, paddingVertical: 7, borderRadius: 50,
                      backgroundColor: promotion === item ? "#F5C518" : "transparent",
                      borderWidth: 1, borderColor: promotion === item ? "#F5C518" : "#1F2937",
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "700", color: promotion === item ? "#000" : "#6B7280" }}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          }
          renderItem={({ item, index }) => (
            <EventCard event={item} rank={index + 1} />
          )}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 40 }}>
              <Text style={{ color: "#6B7280" }}>No ranked events yet.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
