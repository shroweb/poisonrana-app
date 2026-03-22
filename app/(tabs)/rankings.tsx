import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "@/lib/api";
import { RankedEvent, ApiResponse } from "@/lib/types";
import EventCard from "@/components/EventCard";

type RankedMatch = {
  id: string;
  title: string;
  type: string;
  rating: number;
  duration?: number;
  ratingCount: number;
  event: { id: string; title: string; slug: string; date: string; promotion: string; posterUrl?: string };
  participants: { id: string; team: number; isWinner: boolean; wrestler: { id: string; name: string; slug: string; imageUrl?: string } }[];
};

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

function MatchRankCard({ match, rank }: { match: RankedMatch; rank: number }) {
  const router = useRouter();
  const wrestlers = match.participants.map((p) => p.wrestler.name).join(" vs ");
  const isTop3 = rank <= 3;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/events/${match.event.slug}`)}
      style={{ borderRadius: 12, overflow: "hidden", marginBottom: 12 }}
      activeOpacity={0.85}
    >
      {/* Poster strip */}
      {match.event.posterUrl ? (
        <View style={{ height: 80, position: "relative" }}>
          <Image source={{ uri: match.event.posterUrl }} style={{ width: "100%", height: 80 }} contentFit="cover" />
          <LinearGradient
            colors={["transparent", "rgba(11,17,32,0.92)"]}
            style={{ position: "absolute", inset: 0 }}
          />
          {/* Rank badge */}
          <View style={{
            position: "absolute", top: 8, left: 8,
            backgroundColor: isTop3 ? "#F5C518" : "rgba(31,41,55,0.9)",
            borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
          }}>
            <Text style={{ color: isTop3 ? "#000" : "#9CA3AF", fontSize: 11, fontWeight: "900" }}>#{rank}</Text>
          </View>
          {/* Rating top-right */}
          <View style={{ position: "absolute", top: 8, right: 8, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }}>
            <Text style={{ color: "#F5C518", fontSize: 11, fontWeight: "800" }}>★ {match.rating.toFixed(2)}</Text>
          </View>
        </View>
      ) : null}

      {/* Content */}
      <View style={{ backgroundColor: "#111827", padding: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <View style={{ backgroundColor: "rgba(34,211,238,0.2)", borderColor: "rgba(34,211,238,0.4)", borderWidth: 1, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ color: "#22d3ee", fontSize: 9, fontWeight: "800", textTransform: "uppercase" }}>{match.event.promotion}</Text>
          </View>
          {match.type && (
            <Text style={{ color: "#6B7280", fontSize: 9, fontWeight: "600", textTransform: "uppercase" }}>{match.type}</Text>
          )}
        </View>
        <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 13, marginBottom: 3 }} numberOfLines={1}>
          {wrestlers || match.title}
        </Text>
        <Text style={{ color: "#9CA3AF", fontSize: 11 }} numberOfLines={1}>
          {match.event.title}
        </Text>
        <Text style={{ color: "#6B7280", fontSize: 10, marginTop: 4 }}>
          {match.ratingCount} rating{match.ratingCount !== 1 ? "s" : ""}
          {match.duration ? ` · ${Math.floor(match.duration / 60)}m ${match.duration % 60}s` : ""}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function RankingsScreen() {
  const [mode, setMode] = useState<"events" | "matches">("events");
  const [events, setEvents] = useState<RankedEvent[]>([]);
  const [matches, setMatches] = useState<RankedMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [promotion, setPromotion] = useState("All");
  const [promotions, setPromotions] = useState<string[]>(["All"]);

  useEffect(() => {
    api.get<ApiResponse<{ shortName: string }[]>>("/promotions")
      .then((res) => setPromotions(["All", ...(res.data ?? []).map((p) => p.shortName)]))
      .catch(() => {});
  }, []);

  async function fetchEvents() {
    const params: Record<string, string | number> = { limit: 100 };
    if (promotion !== "All") params.promotion = promotion;

    let ranked: RankedEvent[] = [];
    try {
      const res = await api.get<ApiResponse<RankedEvent[]>>("/rankings/events", params);
      ranked = res.data ?? [];
    } catch {}

    if (ranked.length === 0) {
      try {
        const res = await api.get<ApiResponse<RankedEvent[]>>("/events", { ...params, upcoming: "false", sort: "rating_desc" });
        ranked = (res.data ?? []).filter((e) => e.averageRating > 0);
      } catch {}
    }
    setEvents(ranked);
  }

  async function fetchMatches() {
    const params: Record<string, string | number> = { limit: 100 };
    if (promotion !== "All") params.promotion = promotion;
    try {
      const res = await api.get<ApiResponse<RankedMatch[]>>("/rankings/matches", params);
      setMatches(res.data ?? []);
    } catch {}
  }

  async function fetchData() {
    if (mode === "events") await fetchEvents();
    else await fetchMatches();
  }

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [promotion, mode]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [promotion, mode]);

  const ListHeader = (
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
        {mode === "events" ? "EVENT\nRANKINGS" : "TOP\nMATCHES"}
      </Text>
      <Text style={{ color: "#6B7280", fontSize: 13, lineHeight: 18, marginBottom: 20 }}>
        {mode === "events"
          ? "The definitive community-driven ranking of the greatest professional wrestling events, ordered by Bayesian weighted score."
          : "The highest-rated individual matches as scored by the community."}
      </Text>

      {/* Events / Matches toggle */}
      <View style={{ flexDirection: "row", backgroundColor: "#111827", borderRadius: 50, padding: 3, marginBottom: 16, borderWidth: 1, borderColor: "#1F2937" }}>
        {(["events", "matches"] as const).map((m) => (
          <TouchableOpacity
            key={m}
            onPress={() => setMode(m)}
            style={{ flex: 1, paddingVertical: 8, borderRadius: 50, alignItems: "center", backgroundColor: mode === m ? "#F5C518" : "transparent" }}
          >
            <Text style={{ fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8, color: mode === m ? "#000" : "#6B7280" }}>
              {m === "events" ? "Events" : "Matches"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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
  );

  if (loading) {
    return (
      <View className="flex-1 bg-background">
        <View className="flex-row flex-wrap px-4 pt-4 justify-between">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </View>
      </View>
    );
  }

  if (mode === "matches") {
    return (
      <ScrollView
        className="flex-1 bg-background"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F5C518" />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
      >
        {ListHeader}
        {matches.length === 0 ? (
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <Text style={{ color: "#6B7280" }}>No rated matches yet.</Text>
          </View>
        ) : (
          matches.map((match, i) => <MatchRankCard key={match.id} match={match} rank={i + 1} />)
        )}
      </ScrollView>
    );
  }

  return (
    <FlatList
      data={events}
      numColumns={2}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
      columnWrapperStyle={{ justifyContent: "space-between" }}
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: "#0B1120" }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F5C518" />}
      ListHeaderComponent={ListHeader}
      renderItem={({ item, index }) => <EventCard event={item} rank={index + 1} />}
      ListEmptyComponent={
        <View style={{ alignItems: "center", marginTop: 40 }}>
          <Text style={{ color: "#6B7280" }}>No ranked events yet.</Text>
        </View>
      }
    />
  );
}
