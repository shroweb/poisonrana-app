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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "@/lib/api";
import { Event, Match, ApiResponse, Review } from "@/lib/types";
import { useAuth } from "@/store/auth";
import StarRating from "@/components/StarRating";
import Button from "@/components/Button";

const { width } = Dimensions.get("window");
const POSTER_HEIGHT = width * 0.75;

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

function MatchCard({ match, onRate, disabled }: { match: Match; onRate: (id: string) => void; disabled?: boolean }) {
  const hasResults = match.participants.some((p) => p.isWinner);

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
          <Text className="text-yellow text-sm font-bold">
            ★ {match.rating > 0 ? match.rating.toFixed(2) : "—"}
          </Text>
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

      {!disabled && (
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
  const { token, user } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"card" | "reviews" | "predictions">("card");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Review modal
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Match rate modal
  const [rateMatchId, setRateMatchId] = useState<string | null>(null);
  const [matchRating, setMatchRating] = useState(0);
  const [submittingMatchRating, setSubmittingMatchRating] = useState(false);

  // Watchlist
  const [inWatchlist, setInWatchlist] = useState(false);
  const [togglingWatchlist, setTogglingWatchlist] = useState(false);

  // Predictions: matchId -> chosen participantId
  const [predictions, setPredictions] = useState<Record<string, string>>({});
  const [submittingPrediction, setSubmittingPrediction] = useState<string | null>(null);

  useEffect(() => {
    const eventSlug = Array.isArray(slug) ? slug[0] : slug;
    api
      .get<ApiResponse<Event>>(`/events/${eventSlug}`)
      .then((res) => {
        const ev = res.data ?? null;
        setEvent(ev);
        // Pre-load watchlist state if user is logged in
        if (ev && token) {
          api
            .get<ApiResponse<{ event: { id: string } }[]>>("/me/watchlist", { limit: 200 })
            .then((wRes) => {
              const items = wRes.data ?? [];
              setInWatchlist(items.some((item) => item.event.id === ev.id));
            })
            .catch(() => {});
        }
      })
      .catch((err) => console.error("Event fetch error:", err))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (activeTab === "reviews") {
      setReviewsLoading(true);
      api
        .get<ApiResponse<Review[]>>(`/events/${slug}/reviews`)
        .then((res) => setReviews(res.data ?? []))
        .finally(() => setReviewsLoading(false));
    }
  }, [activeTab]);

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
      setReviewModalVisible(false);
      setReviewRating(0);
      setReviewComment("");
      // Refresh event to get updated average
      const res = await api.get<ApiResponse<Event>>(`/events/${slug}`);
      setEvent(res.data);
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
    setTogglingWatchlist(true);
    try {
      if (inWatchlist) {
        await api.delete("/me/watchlist", { eventId: event.id });
        setInWatchlist(false);
      } else {
        await api.post("/me/watchlist", { eventId: event.id });
        setInWatchlist(true);
      }
    } catch {
      Alert.alert("Error", "Failed to update watchlist.");
    } finally {
      setTogglingWatchlist(false);
    }
  }

  async function submitPrediction(matchId: string, participantId: string) {
    if (!token) { router.push("/(auth)/login"); return; }
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
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color="#F5C518" size="large" />
      </View>
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
          <LinearGradient
            colors={["transparent", "rgba(11,17,32,0.7)", "#0B1120"]}
            style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: POSTER_HEIGHT * 0.75 }}
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

          {/* Watchlist button */}
          <TouchableOpacity
            onPress={toggleWatchlist}
            disabled={togglingWatchlist}
            className={`flex-row items-center justify-center border rounded-xl py-3 mb-4 ${
              inWatchlist ? "border-yellow bg-yellow/10" : "border-border"
            }`}
          >
            {togglingWatchlist ? (
              <ActivityIndicator size="small" color="#F5C518" />
            ) : (
              <Text className={`text-sm font-bold uppercase tracking-wide ${inWatchlist ? "text-yellow" : "text-muted"}`}>
                {inWatchlist ? "★ In Watchlist" : "+ Add to Watchlist"}
              </Text>
            )}
          </TouchableOpacity>

          {/* Review button */}
          {hasEnded && (
            <View className="mb-4">
              <Button
                label={token ? "Write a Review" : "Sign In to Review"}
                onPress={() => {
                  if (!token) {
                    router.push("/(auth)/login");
                  } else {
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
              ...(isUpcoming && event.enablePredictions ? [{ key: "predictions", label: "Predictions" }] : []),
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
              {event.matches?.map((match) => {
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
                        const participantId = team[0].id;
                        const isChosen = chosen === participantId;
                        const isLoading = submittingPrediction === match.id;
                        return (
                          <TouchableOpacity
                            key={i}
                            onPress={() => submitPrediction(match.id, participantId)}
                            disabled={isLoading}
                            className={`flex-row items-center p-3 rounded-xl border ${
                              isChosen
                                ? "bg-yellow/10 border-yellow"
                                : "bg-subtle border-border"
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
              })}
            </View>
          ) : activeTab === "card" ? (
            <View className="pb-8">
              {event.matches?.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  disabled={isUpcoming}
                  onRate={(id) => {
                    setRateMatchId(id);
                    setMatchRating(0);
                  }}
                />
              ))}
            </View>
          ) : (
            <View className="pb-8">
              {reviewsLoading ? (
                <ActivityIndicator color="#F5C518" className="mt-8" />
              ) : reviews.length === 0 ? (
                <View className="items-center mt-10">
                  <Text className="text-muted">No reviews yet. Be first!</Text>
                </View>
              ) : (
                reviews.map((review) => (
                  <View
                    key={review.id}
                    className="bg-surface border border-border rounded-xl p-4 mb-3"
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-white font-bold text-sm">
                        {review.user.name}
                      </Text>
                      <Text className="text-yellow text-sm font-bold">
                        ★ {review.rating.toFixed(1)}
                      </Text>
                    </View>
                    {review.comment && (
                      <Text className="text-muted text-sm leading-relaxed">
                        {review.comment}
                      </Text>
                    )}
                  </View>
                ))
              )}
            </View>
          )}
        </View>
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
              RATE THIS EVENT
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
                label="Submit Review"
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
    </>
  );
}
