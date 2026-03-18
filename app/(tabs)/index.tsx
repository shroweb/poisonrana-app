import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Dimensions,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "@/lib/api";
import { Event, ApiResponse } from "@/lib/types";
import EventCard from "@/components/EventCard";

const { width } = Dimensions.get("window");
const CARD_W = width - 32;
const CAROUSEL_H = 240;

function FeaturedCarousel({ events }: { events: Event[] }) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  if (events.length === 0) return null;
  return (
    <View style={{ marginBottom: 4 }}>
      <ScrollView
        horizontal
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_W + 12}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 16 }}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / (CARD_W + 12));
          setActiveIndex(Math.min(i, events.length - 1));
        }}
      >
        {events.map((event) => (
          <TouchableOpacity
            key={event.id}
            onPress={() => router.push(`/events/${event.slug}`)}
            activeOpacity={0.9}
            style={{ width: CARD_W, height: CAROUSEL_H, marginRight: 12, borderRadius: 16, overflow: "hidden" }}
          >
            <Image
              source={{ uri: event.posterUrl! }}
              style={{ width: CARD_W, height: CAROUSEL_H }}
              contentFit="cover"
            />
            {/* Multi-stop gradient for depth */}
            <LinearGradient
              colors={["transparent", "transparent", "rgba(11,17,32,0.5)", "rgba(11,17,32,0.97)"]}
              locations={[0, 0.3, 0.65, 1]}
              style={{ position: "absolute", inset: 0 }}
            />
            {/* Rating badge top-right */}
            {event.averageRating > 0 && (
              <View style={{ position: "absolute", top: 12, right: 12, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: "rgba(245,197,24,0.4)", flexDirection: "row", alignItems: "center", gap: 3 }}>
                <Text style={{ color: "#F5C518", fontSize: 12, fontWeight: "800" }}>★ {event.averageRating.toFixed(2)}</Text>
              </View>
            )}
            {/* Content bottom */}
            <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <View style={{ backgroundColor: "rgba(34,211,238,0.2)", borderColor: "rgba(34,211,238,0.5)", borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ color: "#22d3ee", fontSize: 9, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8 }}>{event.promotion}</Text>
                </View>
              </View>
              <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 18, fontStyle: "italic", lineHeight: 22, letterSpacing: 0.3 }} numberOfLines={2}>
                {event.title.toUpperCase()}
              </Text>
              <Text style={{ color: "#9CA3AF", fontSize: 11, marginTop: 4 }}>
                {new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {/* Dot indicators */}
      {events.length > 1 && (
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 5, marginTop: 10 }}>
          {events.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === activeIndex ? 20 : 5,
                height: 4,
                borderRadius: 2,
                backgroundColor: i === activeIndex ? "#F5C518" : "#1F2937",
                borderWidth: i !== activeIndex ? 1 : 0,
                borderColor: "#374151",
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}

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
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);

  useEffect(() => {
    api.get<ApiResponse<{ shortName: string }[]>>("/promotions")
      .then((res) => {
        const names = (res.data ?? []).map((p) => p.shortName);
        setPromotions(["All", ...names]);
      })
      .catch(() => {});
    api.get<ApiResponse<Event[]>>("/events", { limit: 8, upcoming: "false", sort: "date_desc" })
      .then((res) => {
        const withPosters = (res.data ?? []).filter((e) => !!e.posterUrl).slice(0, 5);
        setFeaturedEvents(withPosters);
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
        {/* Upcoming / Past toggle — pill style */}
        <View style={{ flexDirection: "row", backgroundColor: "#111827", borderRadius: 50, padding: 3, marginBottom: 12, borderWidth: 1, borderColor: "#1F2937" }}>
          {(["past", "upcoming"] as const).map((v) => (
            <TouchableOpacity
              key={v}
              onPress={() => { setView(v); setPage(1); }}
              style={{
                flex: 1, paddingVertical: 9, borderRadius: 50, alignItems: "center",
                backgroundColor: view === v ? "#F5C518" : "transparent",
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8, color: view === v ? "#000" : "#6B7280" }}>
                {v === "past" ? "Past Events" : "Upcoming"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search */}
        <View className="bg-surface border border-border rounded-2xl px-4 py-3 flex-row items-center mb-3">
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
          ListHeaderComponent={
            view === "past" && featuredEvents.length > 0 ? (
              <View style={{ paddingTop: 4, paddingBottom: 8 }}>
                <Text style={{ color: "#6B7280", fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 10 }}>
                  Featured
                </Text>
                <View style={{ marginHorizontal: -16 }}>
                  <FeaturedCarousel events={featuredEvents} />
                </View>
                <Text style={{ color: "#6B7280", fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1.2, marginTop: 16, marginBottom: 4 }}>
                  All Events
                </Text>
              </View>
            ) : null
          }
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
