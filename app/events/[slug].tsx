import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { useEffect, useRef, useState } from "react";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
// react-native-image-colors requires a dev client build — graceful no-op in Expo Go
let getImageColors: ((url: string, opts: object) => Promise<any>) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  getImageColors = require("react-native-image-colors").default?.getColors ?? require("react-native-image-colors").getColors ?? null;
} catch {
  getImageColors = null;
}
import { api } from "@/lib/api";
import { Event, Match, ApiResponse, Review } from "@/lib/types";
import { useAuth } from "@/store/auth";
import StarRating from "@/components/StarRating";
import Button from "@/components/Button";

const { width } = Dimensions.get("window");
const POSTER_HEIGHT = width * 0.75;

/** Blends a hex color 50/50 with the dark background (#0B1120) then applies alpha */
function posterTint(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return `rgba(11,17,32,${alpha})`;
  const ri = parseInt(m[1], 16);
  const gi = parseInt(m[2], 16);
  const bi = parseInt(m[3], 16);
  const r = Math.round(ri * 0.5 + 11 * 0.5);
  const g = Math.round(gi * 0.5 + 17 * 0.5);
  const b = Math.round(bi * 0.5 + 32 * 0.5);
  return `rgba(${r},${g},${b},${alpha})`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDuration(seconds?: number) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function MatchCard({ match, onRate, isUpcoming, spoilersRevealed }: { match: Match; onRate: (id: string) => void; isUpcoming?: boolean; spoilersRevealed?: boolean }) {
  const rawHasResults = match.participants.some((p) => p.isWinner);
  const hasResults = rawHasResults && (spoilersRevealed ?? true);

  // Group participants by team number
  const teamMap = match.participants.reduce((acc, p) => {
    const key = p.team ?? 0;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {} as Record<number, typeof match.participants>);
  const teams = Object.values(teamMap);

  return (
    <View className="bg-surface border border-border rounded-xl p-4 mb-3">
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1 mr-2">
          <Text className="text-cyan text-[10px] font-bold uppercase tracking-wider mb-1">
            {match.type}
          </Text>
          <Text className="text-white font-bold text-sm leading-snug">
            {match.title}
          </Text>
        </View>
        <View className="items-end">
          {!isUpcoming && match.rating > 0 && (
            <Text className="text-yellow text-sm font-bold">
              ★ {match.rating.toFixed(2)}
            </Text>
          )}
          <Text className="text-muted text-[10px]">
            {formatDuration(match.duration)}
          </Text>
        </View>
      </View>

      {/* Participants — team vs team */}
      <View className="mb-3">
        {teams.length >= 2 ? (
          teams.map((team, i) => {
            const teamWon = hasResults && team.some((p) => p.isWinner);
            const teamLost = hasResults && !teamWon;
            return (
              <View key={i}>
                <View className="flex-row flex-wrap gap-1">
                  {team.map((p) => (
                    <View
                      key={p.id}
                      className={`rounded-md px-2 py-0.5 ${teamWon ? "bg-yellow/10 border border-yellow/30" : "bg-subtle"}`}
                    >
                      <Text className={`text-[11px] font-semibold ${teamWon ? "text-yellow" : teamLost ? "text-muted" : "text-white"}`}>
                        {p.wrestler.name}
                      </Text>
                    </View>
                  ))}
                </View>
                {i < teams.length - 1 && (
                  <Text className="text-muted text-[10px] font-bold uppercase tracking-widest my-1.5 ml-0.5">
                    vs
                  </Text>
                )}
              </View>
            );
          })
        ) : (
          // Single team / no team data — flat list
          <View className="flex-row flex-wrap gap-1">
            {match.participants.map((p) => (
              <View key={p.id} className="bg-subtle rounded-md px-2 py-0.5">
                <Text className="text-white text-[11px] font-semibold">{p.wrestler.name}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {!isUpcoming && (
        <TouchableOpacity
          onPress={() => onRate(match.id)}
          className="border border-border rounded-lg py-2 items-center"
        >
          <Text className="text-muted text-xs font-semibold uppercase tracking-wide">
            Rate Match
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function EventDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { token, user } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"card" | "reviews" | "predictions">("card");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewSort, setReviewSort] = useState<"newest" | "highest">("newest");
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  // Review modal
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [myReview, setMyReview] = useState<{ rating: number; comment: string } | null>(null);

  // Match rate modal
  const [rateMatchId, setRateMatchId] = useState<string | null>(null);
  const [matchRating, setMatchRating] = useState(0);
  const [submittingMatchRating, setSubmittingMatchRating] = useState(false);

  // Watchlist
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchStatus, setWatchStatus] = useState<"none" | "watched" | "attended">("none");
  const [togglingWatchlist, setTogglingWatchlist] = useState(false);

  // Share
  const shareRef = useRef<ViewShot>(null);

  // Predictions: matchId -> chosen participantId (local + fetched)
  const [predictions, setPredictions] = useState<Record<string, string>>({});
  const [submittingPrediction, setSubmittingPrediction] = useState<string | null>(null);
  const [predictionsLoading, setPredictionsLoading] = useState(false);

  // Spoiler toggle
  const [spoilersRevealed, setSpoilersRevealed] = useState(false);

  // Related events
  const [relatedEvents, setRelatedEvents] = useState<Event[]>([]);

  // Poster dominant color for gradient tint
  const [posterColor, setPosterColor] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const eventSlug = Array.isArray(slug) ? slug[0] : slug;
    api
      .get<ApiResponse<Event>>(`/events/${eventSlug}`)
      .then((res) => {
        if (cancelled) return;
        const ev = res.data ?? null;
        setEvent(ev);
        if (ev) {
          api.get<ApiResponse<Event[]>>("/events", { limit: 10, promotion: ev.promotion, upcoming: "false", sort: "date_desc" })
            .then((r) => setRelatedEvents((r.data ?? []).filter((e) => e.id !== ev.id).slice(0, 8)))
            .catch(() => {});
          if (ev.posterUrl && getImageColors) {
            getImageColors(ev.posterUrl, { fallback: "#1a2540", cache: true, key: ev.id })
              .then((colors: any) => {
                if (cancelled) return;
                const c =
                  colors.platform === "ios" ? colors.background :
                  colors.platform === "android" ? (colors.dominant ?? colors.vibrant) :
                  colors.hex;
                if (c) setPosterColor(c);
              })
              .catch(() => {});
          }
        }
        if (ev && token) {
          api
            .get<ApiResponse<{ event: { id: string }; watched?: boolean; attended?: boolean }[]>>("/me/watchlist", { limit: 200 })
            .then((wRes) => {
              if (cancelled) return;
              const items = wRes.data ?? [];
              const found = items.find((item) => item.event.id === ev.id);
              setInWatchlist(!!found);
              if (found) {
                setWatchStatus(found.attended ? "attended" : found.watched ? "watched" : "none");
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  async function handleShare() {
    try {
      const uri = await (shareRef.current as any).capture();
      await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share Event" });
    } catch {
      Alert.alert("Error", "Could not generate share image.");
    }
  }

  useEffect(() => {
    if (!event) return;
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={handleShare}
          style={{ marginRight: 8, width: 34, height: 34, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="share-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      ),
    });
  }, [event]);

  useEffect(() => {
    if (activeTab === "reviews") {
      setReviewsLoading(true);
      api
        .get<ApiResponse<Review[]>>(`/events/${slug}/reviews`)
        .then((res) => {
          const fetched = res.data ?? [];
          setReviews(fetched);
          // Detect user's existing review
          if (user) {
            const mine = fetched.find((r) => r.user.id === user.id);
            if (mine) setMyReview({ rating: mine.rating, comment: mine.comment ?? "" });
          }
        })
        .finally(() => setReviewsLoading(false));
    }
    if (activeTab === "predictions" && token && event) {
      setPredictionsLoading(true);
      api
        .get<ApiResponse<{ matchId: string; predictedWinnerId: string }[]>>(
          "/predictions/me",
          { eventId: event.id }
        )
        .then((res) => {
          const saved = res.data ?? [];
          if (saved.length > 0) {
            const map: Record<string, string> = {};
            saved.forEach((p) => { map[p.matchId] = p.predictedWinnerId; });
            setPredictions(map);
          }
        })
        .catch(() => {})
        .finally(() => setPredictionsLoading(false));
    }
  }, [activeTab, event?.id, token]);

  async function submitReview() {
    if (!token) {
      router.push("/(auth)/login");
      return;
    }
    if (reviewRating === 0) {
      Alert.alert("Rating required", "Please select a star rating.");
      return;
    }
    setSubmittingReview(true);
    try {
      await api.post(`/events/${slug}/reviews`, {
        rating: reviewRating,
        comment: reviewComment || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Save as user's review so reopening the modal pre-populates it
      setMyReview({ rating: reviewRating, comment: reviewComment });
      setReviewModalVisible(false);
      // Refresh event to get updated average, and refresh reviews list if open
      const res = await api.get<ApiResponse<Event>>(`/events/${slug}`);
      setEvent(res.data);
      if (activeTab === "reviews") {
        const rRes = await api.get<ApiResponse<Review[]>>(`/events/${slug}/reviews`);
        setReviews(rRes.data ?? []);
      }
    } catch {
      Alert.alert("Error", "Failed to submit review.");
    } finally {
      setSubmittingReview(false);
    }
  }

  async function submitMatchRating() {
    if (!token) {
      router.push("/(auth)/login");
      return;
    }
    if (!rateMatchId || matchRating === 0) return;
    setSubmittingMatchRating(true);
    try {
      await api.post(`/matches/${rateMatchId}/rate`, { rating: matchRating });
      setRateMatchId(null);
      setMatchRating(0);
      // Refresh event
      const res = await api.get<ApiResponse<Event>>(`/events/${slug}`);
      setEvent(res.data);
    } catch {
      Alert.alert("Error", "Failed to submit rating.");
    } finally {
      setSubmittingMatchRating(false);
    }
  }

  async function toggleWatchlist() {
    if (!token) { router.push("/(auth)/login"); return; }
    if (!event) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTogglingWatchlist(true);
    try {
      if (inWatchlist) {
        await api.delete("/me/watchlist", { eventId: event.id });
        setInWatchlist(false);
        setWatchStatus("none");
        setToast("Removed from watchlist");
      } else {
        await api.post("/me/watchlist", { eventId: event.id });
        setInWatchlist(true);
        setToast("Added to watchlist");
      }
      setTimeout(() => setToast(null), 2000);
    } catch {
      Alert.alert("Error", "Failed to update watchlist.");
    } finally {
      setTogglingWatchlist(false);
    }
  }

  async function updateWatchStatus(status: "watched" | "attended") {
    if (!event) return;
    if (!token) { router.push("/(auth)/login"); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      // Auto-add to watchlist if not already in it
      if (!inWatchlist) {
        await api.post("/me/watchlist", { eventId: event.id });
        setInWatchlist(true);
      }
      const isToggleOff = watchStatus === status;
      if (isToggleOff) {
        if (status === "attended") {
          await api.patch("/me/watchlist", { eventId: event.id, attended: false });
          setWatchStatus("watched");
        } else {
          await api.patch("/me/watchlist", { eventId: event.id, watched: false });
          setWatchStatus("none");
        }
      } else {
        await api.patch("/me/watchlist", {
          eventId: event.id,
          watched: true,
          ...(status === "attended" ? { attended: true } : { attended: false }),
        });
        setWatchStatus(status);
        setToast(status === "attended" ? "Marked as attended!" : "Marked as watched!");
        setTimeout(() => setToast(null), 2000);
      }
    } catch {
      Alert.alert("Error", "Failed to update status.");
    }
  }

  async function submitPrediction(matchId: string, participantId: string) {
    if (!token) { router.push("/(auth)/login"); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubmittingPrediction(matchId);
    try {
      await api.post("/predictions", { matchId, predictedWinnerId: participantId });
      setPredictions((prev) => ({ ...prev, [matchId]: participantId }));
    } catch {
      Alert.alert("Error", "Failed to save prediction.");
    } finally {
      setSubmittingPrediction(null);
    }
  }

  const now = new Date();
  const isUpcoming = event ? new Date(event.date) >= new Date(new Date().toDateString()) : false;
  const hasEnded = event
    ? event.endTime
      ? now > new Date(event.endTime)
      : now > new Date(new Date(event.date).getTime() + 24 * 60 * 60 * 1000)
    : false;

  if (loading) {
    return (
      <ScrollView className="flex-1 bg-background" showsVerticalScrollIndicator={false}>
        <View style={{ height: POSTER_HEIGHT }} className="bg-subtle" />
        <View className="px-4 mt-4">
          <View className="h-3 w-16 bg-subtle rounded mb-2" />
          <View className="h-7 w-3/4 bg-subtle rounded-lg mb-1" />
          <View className="h-7 w-1/2 bg-subtle rounded-lg mb-3" />
          <View className="h-3 w-40 bg-subtle rounded mb-4" />
          <View className="flex-row bg-surface border border-border rounded-xl overflow-hidden mb-4">
            {[0,1,2].map((i) => (
              <View key={i} className={`flex-1 items-center py-3 ${i < 2 ? "border-r border-border" : ""}`}>
                <View className="h-5 w-10 bg-subtle rounded mb-1" />
                <View className="h-2 w-12 bg-subtle rounded" />
              </View>
            ))}
          </View>
          <View className="h-10 w-full bg-subtle rounded-xl mb-3" />
          <View className="flex-row border-b border-border mb-4 gap-2">
            {[0,1].map((i) => <View key={i} className="h-8 w-20 bg-subtle rounded-t" />)}
          </View>
          {[0,1,2].map((i) => (
            <View key={i} className="bg-surface border border-border rounded-xl p-4 mb-3">
              <View className="h-3 w-3/4 bg-subtle rounded mb-2" />
              <View className="h-3 w-1/2 bg-subtle rounded" />
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  if (!event) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Text className="text-muted">Event not found.</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView className="flex-1 bg-background" showsVerticalScrollIndicator={false}>
        {/* Hero poster */}
        <View style={{ height: POSTER_HEIGHT }}>
          {event.posterUrl ? (
            <Image
              source={{ uri: event.posterUrl }}
              style={{ width, height: POSTER_HEIGHT }}
              contentFit="cover"
            />
          ) : (
            <View style={{ width, height: POSTER_HEIGHT }} className="bg-surface" />
          )}
          {/* Top fade — blends into transparent nav header */}
          <LinearGradient
            colors={[posterColor ? posterTint(posterColor, 0.85) : "rgba(11,17,32,0.55)", "transparent"]}
            style={{ position: "absolute", top: 0, left: 0, right: 0, height: 120 }}
          />
          {/* Bottom fade — transitions into content */}
          <LinearGradient
            colors={[
              "transparent",
              posterColor ? posterTint(posterColor, 0.6) : "rgba(11,17,32,0.55)",
              posterColor ? posterTint(posterColor, 0.95) : "rgba(11,17,32,0.92)",
              "#0B1120",
            ]}
            locations={[0, 0.4, 0.72, 1]}
            style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: POSTER_HEIGHT * 0.85 }}
          />
        </View>

        <View className="px-4 -mt-6 relative z-10">
          {/* Promotion badge */}
          <View className="flex-row items-center mb-2">
            <View className="bg-cyan/20 border border-cyan/40 rounded-md px-2 py-0.5">
              <Text className="text-cyan text-[10px] font-bold uppercase tracking-wider">
                {event.promotion}
              </Text>
            </View>
            {event.type && (
              <View className="bg-yellow/10 border border-yellow/30 rounded-md px-2 py-0.5 ml-2">
                <Text className="text-yellow text-[10px] font-bold uppercase tracking-wider">
                  {event.type}
                </Text>
              </View>
            )}
          </View>

          {/* Title */}
          <Text className="text-white text-3xl font-black italic leading-tight mb-1">
            {event.title.toUpperCase()}
          </Text>

          {/* Meta */}
          <View className="flex-row flex-wrap gap-x-4 gap-y-1 mb-4">
            <Text className="text-muted text-xs">{formatDate(event.date)}</Text>
            {event.venue && (
              <Text className="text-muted text-xs">{event.venue}</Text>
            )}
          </View>

          {/* Stats row */}
          <View className="flex-row bg-surface border border-border rounded-xl overflow-hidden mb-4">
            {[
              { label: "Matches", value: String(event.matchCount ?? 0) },
              {
                label: "Rating",
                value: event.averageRating > 0 ? `★ ${event.averageRating.toFixed(2)}` : "—",
              },
              { label: "Reviews", value: String(event.reviewCount) },
            ].map((stat, i, arr) => (
              <View
                key={stat.label}
                className={`flex-1 items-center py-3 ${
                  i < arr.length - 1 ? "border-r border-border" : ""
                }`}
              >
                <Text className="text-white font-black text-base">{stat.value}</Text>
                <Text className="text-muted text-[10px] uppercase tracking-wider mt-0.5">
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>

          {event.description && (
            <Text className="text-muted text-sm leading-relaxed mb-4 italic">
              {event.description}
            </Text>
          )}

          {/* Watchlist / Watched / Attended — 3 peer icon buttons */}
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            <TouchableOpacity
              onPress={toggleWatchlist}
              disabled={togglingWatchlist}
              style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderWidth: 1, borderRadius: 10, paddingVertical: 10, borderColor: inWatchlist ? "#F5C518" : "#1F2937", backgroundColor: inWatchlist ? "rgba(245,197,24,0.1)" : "transparent" }}
            >
              {togglingWatchlist ? (
                <ActivityIndicator size="small" color="#F5C518" />
              ) : (
                <>
                  <Ionicons name={inWatchlist ? "bookmark" : "bookmark-outline"} size={14} color={inWatchlist ? "#F5C518" : "#6B7280"} />
                  <Text style={{ fontSize: 11, fontWeight: "700", color: inWatchlist ? "#F5C518" : "#6B7280" }}>List</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => updateWatchStatus("watched")}
              style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderWidth: 1, borderRadius: 10, paddingVertical: 10, borderColor: (watchStatus === "watched" || watchStatus === "attended") ? "#22c55e" : "#1F2937", backgroundColor: (watchStatus === "watched" || watchStatus === "attended") ? "rgba(34,197,94,0.1)" : "transparent" }}
            >
              <Ionicons name={(watchStatus === "watched" || watchStatus === "attended") ? "eye" : "eye-outline"} size={14} color={(watchStatus === "watched" || watchStatus === "attended") ? "#22c55e" : "#6B7280"} />
              <Text style={{ fontSize: 11, fontWeight: "700", color: (watchStatus === "watched" || watchStatus === "attended") ? "#22c55e" : "#6B7280" }}>Watched</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => updateWatchStatus("attended")}
              style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderWidth: 1, borderRadius: 10, paddingVertical: 10, borderColor: watchStatus === "attended" ? "#22d3ee" : "#1F2937", backgroundColor: watchStatus === "attended" ? "rgba(34,211,238,0.1)" : "transparent" }}
            >
              <Ionicons name={watchStatus === "attended" ? "location" : "location-outline"} size={14} color={watchStatus === "attended" ? "#22d3ee" : "#6B7280"} />
              <Text style={{ fontSize: 11, fontWeight: "700", color: watchStatus === "attended" ? "#22d3ee" : "#6B7280" }}>Attended</Text>
            </TouchableOpacity>
          </View>

          {/* Review button */}
          {hasEnded && (
            <View className="mb-4">
              <Button
                label={token ? (myReview ? "Update Review" : "Write a Review") : "Sign In to Review"}
                onPress={() => {
                  if (!token) {
                    router.push("/(auth)/login");
                  } else {
                    // Pre-populate with existing review if present
                    setReviewRating(myReview?.rating ?? 0);
                    setReviewComment(myReview?.comment ?? "");
                    setReviewModalVisible(true);
                  }
                }}
                variant="yellow"
                fullWidth
              />
            </View>
          )}

          {/* Tabs */}
          <View className="flex-row border-b border-border mb-4">
            {([
              { key: "card", label: `Card (${event.matchCount ?? 0})` },
              ...(event.enablePredictions ? [{ key: "predictions", label: "Predictions" }] : []),
              ...(hasEnded ? [{ key: "reviews", label: `Reviews (${event.reviewCount})` }] : []),
            ] as { key: "card" | "reviews" | "predictions"; label: string }[]).map((tab) => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                className={`px-4 py-3 mr-1 ${activeTab === tab.key ? "border-b-2 border-yellow" : ""}`}
              >
                <Text className={`text-xs font-bold uppercase tracking-wider ${activeTab === tab.key ? "text-yellow" : "text-muted"}`}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab content */}
          {activeTab === "predictions" ? (
            <View className="pb-8">
              {predictionsLoading ? (
                <ActivityIndicator color="#F5C518" className="mt-8" />
              ) : hasEnded ? (
                // Resolved predictions view
                (() => {
                  const matches = event.matches ?? [];
                  const scored = matches.filter((m) => {
                    const chosen = predictions[m.id];
                    if (!chosen) return false;
                    const hasResults = m.participants.some((p) => p.isWinner);
                    return hasResults;
                  });
                  const correct = scored.filter((m) => {
                    const chosen = predictions[m.id];
                    const teams = Object.values(
                      m.participants.reduce<Record<number, typeof m.participants>>((acc, p) => {
                        (acc[p.team] = acc[p.team] || []).push(p); return acc;
                      }, {})
                    );
                    const chosenTeam = teams.find((t) => t.some((p) => p.wrestler.id === chosen));
                    return chosenTeam?.some((p) => p.isWinner) ?? false;
                  });
                  return (
                    <>
                      {scored.length > 0 && (
                        <View className="bg-surface border border-border rounded-xl p-4 mb-4 flex-row items-center justify-between">
                          <View>
                            <Text className="text-muted text-[10px] uppercase tracking-wider font-bold mb-0.5">Your Score</Text>
                            <Text className="text-white font-black text-xl">
                              {Math.round((correct.length / scored.length) * 100)}%{" "}
                              <Text className="text-muted text-sm font-normal">({correct.length}/{scored.length} correct)</Text>
                            </Text>
                          </View>
                          <View className="w-12 h-12 rounded-full bg-yellow/20 border border-yellow/40 items-center justify-center">
                            <Text className="text-yellow font-black text-base">{correct.length}/{scored.length}</Text>
                          </View>
                        </View>
                      )}
                      {matches.map((match) => {
                  const teams = match.participants.reduce<Record<number, typeof match.participants>>((acc, p) => {
                    (acc[p.team] = acc[p.team] || []).push(p);
                    return acc;
                  }, {});
                  const teamList = Object.values(teams);
                  const hasResults = match.participants.some((p) => p.isWinner);
                  const chosen = predictions[match.id];
                  // predictedWinnerId is wrestler.id, match against that
                  const chosenTeam = teamList.find((t) => t.some((p) => p.wrestler.id === chosen));
                  const chosenWon = chosenTeam ? chosenTeam.some((p) => p.isWinner) : null;
                  return (
                    <View key={match.id} className="bg-surface border border-border rounded-xl p-4 mb-3">
                      <View className="flex-row justify-between items-start mb-2">
                        <View className="flex-1 mr-2">
                          <Text className="text-cyan text-[10px] font-bold uppercase tracking-wider mb-0.5">{match.type}</Text>
                          <Text className="text-white font-bold text-sm">{match.title}</Text>
                        </View>
                        {chosen && hasResults && chosenWon !== null && (
                          <View className={`rounded-lg px-2 py-1 border ${chosenWon ? "bg-green-500/20 border-green-500/40" : "bg-red-500/20 border-red-500/40"}`}>
                            <Text className={`text-[10px] font-bold uppercase ${chosenWon ? "text-green-400" : "text-red-400"}`}>
                              {chosenWon ? "Called it!" : "Wrong pick"}
                            </Text>
                          </View>
                        )}
                      </View>

                      {hasResults && (
                        <View className="flex-row flex-wrap gap-1 mt-1">
                          {match.participants.filter((p) => p.isWinner).map((p) => {
                            const wasMyPick = chosenTeam?.some((cp) => cp.id === p.id);
                            const color = !chosen
                              ? "yellow"
                              : chosenWon
                              ? "green"
                              : "red";
                            return (
                              <View
                                key={p.id}
                                className={`flex-row items-center rounded-md px-2 py-0.5 border ${
                                  color === "green"
                                    ? "bg-green-500/10 border-green-500/30"
                                    : color === "red"
                                    ? "bg-red-500/10 border-red-500/30"
                                    : "bg-yellow/10 border-yellow/30"
                                }`}
                              >
                                <Text className={`text-[11px] font-semibold ${
                                  color === "green" ? "text-green-400" : color === "red" ? "text-red-400" : "text-yellow"
                                }`}>
                                  {p.wrestler.name}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      )}

                      {!chosen && token && !hasResults && (
                        <Text className="text-muted text-xs italic mt-1">No prediction made</Text>
                      )}
                    </View>
                  );
                })}
                    </>
                  );
                })()
              ) : (
                // Upcoming — pick UI
                event.matches?.map((match) => {
                  const teams = match.participants.reduce<Record<number, typeof match.participants>>((acc, p) => {
                    (acc[p.team] = acc[p.team] || []).push(p);
                    return acc;
                  }, {});
                  const teamList = Object.values(teams);
                  const chosen = predictions[match.id];
                  return (
                    <View key={match.id} className="bg-surface border border-border rounded-xl p-4 mb-3">
                      <Text className="text-cyan text-[10px] font-bold uppercase tracking-wider mb-1">{match.type}</Text>
                      <Text className="text-white font-bold text-sm mb-3">{match.title}</Text>
                      <Text className="text-muted text-[10px] uppercase tracking-wider mb-2 font-semibold">Pick your winner</Text>
                      <View className="gap-2">
                        {teamList.map((team, i) => {
                          // Send wrestler.id — that's what the server stores as predictedWinnerId
                          const participantId = team[0].wrestler.id;
                          // Match by wrestler.id
                          const isChosen = team.some((p) => p.wrestler.id === chosen);
                          const isLoading = submittingPrediction === match.id;
                          return (
                            <TouchableOpacity
                              key={i}
                              onPress={() => submitPrediction(match.id, participantId)}
                              disabled={isLoading}
                              className={`flex-row items-center p-3 rounded-xl border ${
                                isChosen ? "bg-yellow/10 border-yellow" : "bg-subtle border-border"
                              }`}
                            >
                              <View className={`w-4 h-4 rounded-full border mr-3 items-center justify-center ${isChosen ? "border-yellow bg-yellow" : "border-muted"}`}>
                                {isChosen && <View className="w-2 h-2 rounded-full bg-background" />}
                              </View>
                              <Text className={`text-sm font-semibold flex-1 ${isChosen ? "text-yellow" : "text-white"}`}>
                                {team.map((p) => p.wrestler.name).join(" & ")}
                              </Text>
                              {isLoading && <ActivityIndicator size="small" color="#F5C518" />}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          ) : activeTab === "card" ? (
            <View className="pb-8">
              {/* Spoiler toggle — shown for past events with results */}
              {!isUpcoming && !spoilersRevealed && (event.matches ?? []).some((m) => m.participants.some((p) => p.isWinner)) && (
                <TouchableOpacity
                  onPress={() => setSpoilersRevealed(true)}
                  className="bg-surface border border-border rounded-xl p-4 mb-4 flex-row items-center justify-between"
                >
                  <View className="flex-1">
                    <Text className="text-white font-black text-sm">Results Hidden</Text>
                    <Text className="text-muted text-xs mt-0.5">Tap to reveal match winners</Text>
                  </View>
                  <View className="bg-yellow/10 border border-yellow/30 rounded-lg px-3 py-1.5">
                    <Text className="text-yellow text-xs font-black uppercase tracking-wide">Reveal</Text>
                  </View>
                </TouchableOpacity>
              )}
              {event.matches?.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  isUpcoming={isUpcoming}
                  spoilersRevealed={spoilersRevealed}
                  onRate={(id) => {
                    setRateMatchId(id);
                    setMatchRating(0);
                  }}
                />
              ))}
            </View>
          ) : (
            <View className="pb-8">
              {!reviewsLoading && reviews.length >= 1 && (() => {
                const counts = [5, 4, 3, 2, 1].map((star) => ({
                  star,
                  count: reviews.filter((r) => Math.round(r.rating) === star).length,
                }));
                const maxCount = Math.max(...counts.map((c) => c.count), 1);
                return (
                  <View className="bg-surface border border-border rounded-xl p-4 mb-4">
                    <Text className="text-white text-xs font-bold uppercase tracking-wider mb-3">Rating Distribution</Text>
                    {counts.map(({ star, count }) => (
                      <View key={star} className="flex-row items-center mb-1.5">
                        <Text className="text-yellow text-[10px] w-6 mr-2">★{star}</Text>
                        <View className="flex-1 h-2 bg-subtle rounded-full overflow-hidden">
                          <View
                            style={{ width: `${(count / maxCount) * 100}%`, height: "100%" }}
                            className="bg-yellow rounded-full"
                          />
                        </View>
                        <Text className="text-muted text-[10px] ml-2 w-4 text-right">{count}</Text>
                      </View>
                    ))}
                  </View>
                );
              })()}
              {!reviewsLoading && reviews.length > 1 && (
                <View className="flex-row bg-surface border border-border rounded-xl p-1 mb-4">
                  {(["newest", "highest"] as const).map((s) => (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setReviewSort(s)}
                      className={`flex-1 py-1.5 rounded-lg items-center ${reviewSort === s ? "bg-yellow" : ""}`}
                    >
                      <Text className={`text-xs font-bold uppercase tracking-wide ${reviewSort === s ? "text-black" : "text-muted"}`}>
                        {s === "newest" ? "Newest" : "Top Rated"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {reviewsLoading ? (
                <ActivityIndicator color="#F5C518" className="mt-8" />
              ) : reviews.length === 0 ? (
                <View className="items-center mt-10">
                  <Text className="text-muted">No reviews yet. Be first!</Text>
                </View>
              ) : (
                [...reviews]
                  .sort((a, b) =>
                    reviewSort === "highest"
                      ? b.rating - a.rating
                      : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                  )
                  .map((review) => (
                  <View
                    key={review.id}
                    className="bg-surface border border-border rounded-xl p-4 mb-3"
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center flex-1 mr-2">
                        {review.user.avatarUrl ? (
                          <Image
                            source={{ uri: review.user.avatarUrl }}
                            style={{ width: 28, height: 28, borderRadius: 14 }}
                            contentFit="cover"
                          />
                        ) : (
                          <View className="w-7 h-7 rounded-full bg-yellow items-center justify-center">
                            <Text className="text-black text-[10px] font-black">
                              {(review.user.name ?? "?")[0].toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <View className="ml-2 flex-1">
                          <Text className="text-white font-bold text-sm" numberOfLines={1}>
                            {review.user.name}
                          </Text>
                          <Text className="text-muted text-[10px]">{timeAgo(review.createdAt)}</Text>
                        </View>
                      </View>
                      <View className="flex-row items-center gap-2">
                        {token && user && review.user.id !== user.id && (
                          <TouchableOpacity
                            onPress={async () => {
                              const res = await api.post<ApiResponse<{ followed: boolean }>>(
                                "/follow",
                                { targetUserId: review.user.id }
                              ).catch(() => null);
                              if (res?.data) {
                                setFollowing((prev) => {
                                  const next = new Set(prev);
                                  res.data.followed ? next.add(review.user.id) : next.delete(review.user.id);
                                  return next;
                                });
                              }
                            }}
                            className={`px-2 py-0.5 rounded-md border ${following.has(review.user.id) ? "border-yellow bg-yellow/10" : "border-border"}`}
                          >
                            <Text className={`text-[10px] font-bold ${following.has(review.user.id) ? "text-yellow" : "text-muted"}`}>
                              {following.has(review.user.id) ? "Following" : "Follow"}
                            </Text>
                          </TouchableOpacity>
                        )}
                        <Text className="text-yellow text-sm font-bold">
                          ★ {review.rating.toFixed(1)}
                        </Text>
                      </View>
                    </View>
                    {review.comment && (
                      <Text className="text-muted text-sm leading-relaxed mb-2">
                        {review.comment}
                      </Text>
                    )}
                    <TouchableOpacity
                      onPress={async () => {
                        if (!token) { router.push("/(auth)/login"); return; }
                        const res = await api.post<ApiResponse<{ liked: boolean; likeCount: number }>>(
                          `/reviews/${review.id}/vote`, {}
                        ).catch(() => null);
                        if (res?.data) {
                          setReviews((prev) => prev.map((r) =>
                            r.id === review.id
                              ? { ...r, likedByMe: res.data.liked, likeCount: res.data.likeCount }
                              : r
                          ));
                        }
                      }}
                      className="flex-row items-center self-start gap-1"
                    >
                      <Text className={`text-sm ${review.likedByMe ? "text-yellow" : "text-muted"}`}>
                        {review.likedByMe ? "♥" : "♡"}
                      </Text>
                      {(review.likeCount ?? 0) > 0 && (
                        <Text className="text-muted text-[10px]">{review.likeCount}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          )}
        </View>

        {/* More from [Promotion] */}
        {relatedEvents.length > 0 && (
          <View style={{ paddingBottom: 32 }}>
            <Text style={{ color: "#6B7280", fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1.2, paddingHorizontal: 16, marginBottom: 12 }}>
              More from {event.promotion}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
              {relatedEvents.map((e) => (
                <TouchableOpacity
                  key={e.id}
                  onPress={() => router.push(`/events/${e.slug}`)}
                  activeOpacity={0.85}
                  style={{ width: 130, marginRight: 12, borderRadius: 10, overflow: "hidden" }}
                >
                  {e.posterUrl ? (
                    <Image source={{ uri: e.posterUrl }} style={{ width: 130, height: 185 }} contentFit="cover" />
                  ) : (
                    <View style={{ width: 130, height: 185, backgroundColor: "#1F2937", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ color: "#6B7280", fontSize: 10, textAlign: "center", padding: 8 }}>{e.title}</Text>
                    </View>
                  )}
                  <LinearGradient
                    colors={["transparent", "rgba(11,17,32,0.95)"]}
                    style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 90 }}
                  />
                  <View style={{ position: "absolute", bottom: 8, left: 8, right: 8 }}>
                    {e.averageRating > 0 && (
                      <Text style={{ color: "#F5C518", fontSize: 9, fontWeight: "700", marginBottom: 2 }}>★ {e.averageRating.toFixed(1)}</Text>
                    )}
                    <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 10, lineHeight: 13 }} numberOfLines={2}>
                      {e.title}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Review Modal */}
      <Modal
        visible={reviewModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReviewModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1 justify-end"
        >
          <View className="bg-surface border-t border-border rounded-t-3xl px-6 pt-6 pb-10">
            <View className="w-12 h-1 bg-border rounded-full self-center mb-6" />
            <Text className="text-white text-xl font-black italic mb-1">
              {myReview ? "UPDATE REVIEW" : "RATE THIS EVENT"}
            </Text>
            <Text className="text-muted text-sm mb-6">{event.title}</Text>

            <Text className="text-muted text-xs uppercase tracking-wider mb-2 font-semibold">
              Your Rating
            </Text>
            <View className="mb-6">
              <StarRating
                value={reviewRating}
                onChange={setReviewRating}
                size="lg"
              />
            </View>

            <Text className="text-muted text-xs uppercase tracking-wider mb-2 font-semibold">
              Review (optional)
            </Text>
            <TextInput
              multiline
              numberOfLines={4}
              placeholder="Share your thoughts..."
              placeholderTextColor="#6B7280"
              value={reviewComment}
              onChangeText={setReviewComment}
              className="bg-background border border-border rounded-xl px-4 py-3 text-white text-sm mb-6"
              style={{ textAlignVertical: "top", minHeight: 80 }}
            />

            <View className="gap-3">
              <Button
                label={myReview ? "Update Review" : "Submit Review"}
                onPress={submitReview}
                loading={submittingReview}
                fullWidth
              />
              <Button
                label="Cancel"
                onPress={() => setReviewModalVisible(false)}
                variant="ghost"
                fullWidth
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Match Rate Modal */}
      <Modal
        visible={!!rateMatchId}
        transparent
        animationType="slide"
        onRequestClose={() => setRateMatchId(null)}
      >
        <View className="flex-1 justify-end">
          <View className="bg-surface border-t border-border rounded-t-3xl px-6 pt-6 pb-10">
            <View className="w-12 h-1 bg-border rounded-full self-center mb-6" />
            <Text className="text-white text-xl font-black italic mb-6">
              RATE THIS MATCH
            </Text>
            <View className="mb-6">
              <StarRating
                value={matchRating}
                onChange={setMatchRating}
                size="lg"
              />
            </View>
            <View className="gap-3">
              <Button
                label="Submit Rating"
                onPress={submitMatchRating}
                loading={submittingMatchRating}
                fullWidth
              />
              <Button
                label="Cancel"
                onPress={() => setRateMatchId(null)}
                variant="ghost"
                fullWidth
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Hidden share card for image capture */}
      <ViewShot ref={shareRef} options={{ format: "png", quality: 1 }} style={{ position: "absolute", left: -1000, top: -1000 }}>
        <View style={{ width: 320, height: 480, borderRadius: 20, overflow: "hidden" }}>
          {event.posterUrl ? (
            <Image source={{ uri: event.posterUrl }} style={{ position: "absolute", width: 320, height: 480 }} contentFit="cover" />
          ) : (
            <LinearGradient colors={["#0d1b4b", "#0B1120"]} style={{ position: "absolute", width: 320, height: 480 }} />
          )}
          <LinearGradient
            colors={["rgba(11,17,32,0.2)", "rgba(11,17,32,0.65)", "rgba(11,17,32,0.97)"]}
            locations={[0, 0.5, 1]}
            style={{ position: "absolute", width: 320, height: 480 }}
          />
          <View style={{ flex: 1, padding: 28, justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ backgroundColor: "rgba(34,211,238,0.15)", borderWidth: 1, borderColor: "rgba(34,211,238,0.4)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ color: "#22d3ee", fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 }}>
                  {event.promotion}
                </Text>
              </View>
            </View>
            <View>
              <Text style={{ color: "#FFFFFF", fontSize: 26, fontWeight: "900", fontStyle: "italic", lineHeight: 30, marginBottom: 8 }}>
                {event.title.toUpperCase()}
              </Text>
              <Text style={{ color: "#9CA3AF", fontSize: 12 }}>{formatDate(event.date)}</Text>
              {event.averageRating > 0 && (
                <Text style={{ color: "#F5C518", fontSize: 14, fontWeight: "700", marginTop: 6 }}>
                  ★ {event.averageRating.toFixed(2)}
                </Text>
              )}
            </View>
            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <Text style={{ color: "#6B7280", fontSize: 11 }}>poisonrana.com</Text>
            </View>
          </View>
        </View>
      </ViewShot>

      {/* Watchlist toast */}
      {toast && (
        <View
          style={{ position: "absolute", bottom: 32, left: 24, right: 24, zIndex: 100 }}
          className="bg-surface border border-border rounded-xl px-4 py-3 items-center shadow-lg"
        >
          <Text className="text-white text-sm font-semibold">{toast}</Text>
        </View>
      )}
    </>
  );
}
