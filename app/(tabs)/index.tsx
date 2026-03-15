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
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { Event, ApiResponse } from "@/lib/types";
import EventCard from "@/components/EventCard";

const PROMOTIONS = ["All", "WWE", "AEW", "NJPW", "TNA", "ROH"];

export default function EventsScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [promotion, setPromotion] = useState("All");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  async function fetchEvents(reset = false) {
    const currentPage = reset ? 1 : page;
    try {
      const params: Record<string, string | number> = {
        page: currentPage,
        limit: 20,
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
  }, [search, promotion]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await fetchEvents(true);
    setRefreshing(false);
  }, [search, promotion]);

  async function loadMore() {
    if (loadingMore || events.length >= total) return;
    setLoadingMore(true);
    await fetchEvents(false);
    setLoadingMore(false);
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="px-4 pt-4 pb-4 bg-background">
        {/* Search */}
        <View className="bg-surface border border-border rounded-xl px-4 py-3 flex-row items-center mb-3">
          <Ionicons name="search-outline" size={16} color="#6B7280" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search events..."
            placeholderTextColor="#6B7280"
            className="flex-1 text-white text-sm"
            value={search}
            onChangeText={(t) => {
              setSearch(t);
              setPage(1);
            }}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Text className="text-muted text-lg">×</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Promotion filter */}
        <FlatList
          data={PROMOTIONS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => {
                setPromotion(item);
                setPage(1);
              }}
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

      {/* List */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#F5C518" size="large" />
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
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#F5C518"
            />
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
            loadingMore ? (
              <ActivityIndicator color="#F5C518" className="my-4" />
            ) : null
          }
        />
      )}
    </View>
  );
}
