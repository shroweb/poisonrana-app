import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { Event, ApiResponse } from "@/lib/types";
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

export default function EventsScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [promotion, setPromotion] = useState("All");
  const [promotions, setPromotions] = useState<string[]>(["All"]);

  useEffect(() => {
    api.get<ApiResponse<{ shortName: string }[]>>("/promotions")
      .then((res) => {
        const names = (res.data ?? []).map((p) => p.shortName);
        setPromotions(["All", ...names]);
      })
      .catch(() => {});
  }, []);
  const [view, setView] = useState<"upcoming" | "past">("past");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  async function fetchEvents(reset = false) {
    const currentPage = reset ? 1 : page;
    try {
      const params: Record<string, string | number> = {
        page: currentPage,
        limit: 20,
        upcoming: view === "upcoming" ? "true" : "false",
        sort: view === "upcoming" ? "date_asc" : "date_desc",
      };
      if (search) params.q = search;
      if (promotion !== "All") params.promotion = promotion;

      const res = await api.get<ApiResponse<Event[]>>("/events", params);
      const data = res.data ?? [];
      setEvents(reset ? data : (prev) => [...prev, ...data]);
      setTotal(res.meta?.total ?? 0);
      if (!reset) setPage(currentPage + 1);
    } catch (e) {
      // silently fail on list
    }
  }

  useEffect(() => {
    setLoading(true);
    setPage(1);
    fetchEvents(true).finally(() => setLoading(false));
  }, [search, promotion, view]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await fetchEvents(true);
    setRefreshing(false);
  }, [search, promotion, view]);

  async function loadMore() {
    if (loadingMore || events.length >= total) return;
    setLoadingMore(true);
    await fetchEvents(false);
    setLoadingMore(false);
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="px-4 pt-4 pb-2 bg-background">
        {/* Upcoming / Past toggle */}
        <View className="flex-row bg-surface border border-border rounded-xl p-1 mb-3">
          {(["past", "upcoming"] as const).map((v) => (
            <TouchableOpacity
              key={v}
              onPress={() => { setView(v); setPage(1); }}
              className={`flex-1 py-2 rounded-lg items-center ${view === v ? "bg-yellow" : ""}`}
            >
              <Text className={`text-xs font-bold uppercase tracking-wide ${view === v ? "text-black" : "text-muted"}`}>
                {v === "past" ? "Past Events" : "Upcoming"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search */}
        <View className="bg-surface border border-border rounded-xl px-4 py-3 flex-row items-center mb-3">
          <Ionicons name="search-outline" size={16} color="#6B7280" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search events..."
            placeholderTextColor="#6B7280"
            className="flex-1 text-white text-sm"
            value={search}
            onChangeText={(t) => { setSearch(t); setPage(1); }}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Text className="text-muted text-lg">×</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Promotion filter */}
        <FlatList
          data={promotions}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          style={{ marginBottom: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => { setPromotion(item); setPage(1); }}
              className={`mr-2 px-4 py-1.5 rounded-full border ${
                promotion === item ? "bg-yellow border-yellow" : "bg-transparent border-border"
              }`}
            >
              <Text className={`text-xs font-bold ${promotion === item ? "text-black" : "text-muted"}`}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* List */}
      {loading ? (
        <View className="flex-row flex-wrap px-4 justify-between pt-2">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={events}
          numColumns={2}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 pb-8"
          columnWrapperClassName="justify-between"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F5C518" />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          renderItem={({ item }) => <EventCard event={item} />}
          ListEmptyComponent={
            <View className="items-center mt-20">
              <Text className="text-muted text-base">No events found.</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color="#F5C518" className="my-4" /> : null
          }
        />
      )}
    </View>
  );
}
