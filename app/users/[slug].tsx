import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { useEffect, useState } from "react";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "@/lib/api";
import { ApiResponse } from "@/lib/types";
import { useAuth } from "@/store/auth";

type PublicProfile = {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  favoritePromotion?: string;
  reviewCount: number;
  watchlistCount: number;
  followersCount: number;
  followingCount: number;
  reviews: {
    id: string;
    rating: number;
    comment?: string;
    createdAt: string;
    event: {
      id: string;
      title: string;
      slug: string;
      date: string;
      promotion: string;
      posterUrl?: string;
    };
  }[];
};

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

export default function UserProfileScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { token, user: me } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    const s = Array.isArray(slug) ? slug[0] : slug;
    if (!s || s === "null" || s === "undefined") {
      setLoading(false);
      return;
    }
    api
      .get<ApiResponse<PublicProfile>>(`/users/${s}`)
      .then((res) => {
        setProfile(res.data ?? null);
        if (res.data?.name) navigation.setOptions({ title: res.data.name });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  async function toggleFollow() {
    if (!token || !profile) {
      router.push("/(auth)/login");
      return;
    }
    setFollowLoading(true);
    const res = await api
      .post<ApiResponse<{ followed: boolean }>>("/follow", { targetUserId: profile.id })
      .catch(() => null);
    if (res?.data) setFollowing(res.data.followed);
    setFollowLoading(false);
  }

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color="#F5C518" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Text className="text-muted">User not found.</Text>
      </View>
    );
  }

  const isMe = me?.id === profile.id;

  return (
    <ScrollView className="flex-1 bg-background" showsVerticalScrollIndicator={false}>
      {/* Hero header */}
      <View style={{ paddingBottom: 24 }}>
        <LinearGradient
          colors={["#1a2540", "#0B1120"]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View className="items-center pt-10 pb-2 px-4">
          {/* Avatar */}
          <View style={{ width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: "#F5C518", overflow: "hidden", marginBottom: 12 }}>
            {profile.avatarUrl ? (
              <Image
                source={{ uri: profile.avatarUrl }}
                style={{ width: 90, height: 90 }}
                contentFit="cover"
              />
            ) : (
              <View style={{ width: 90, height: 90, backgroundColor: "#F5C518", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#000", fontSize: 36, fontWeight: "900" }}>
                  {(profile.name ?? "?")[0].toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <Text className="text-white text-2xl font-black">{profile.name}</Text>
          <Text className="text-muted text-sm mt-0.5">@{profile.slug}</Text>

          {profile.favoritePromotion && (
            <View className="mt-2 bg-cyan/20 border border-cyan/40 rounded-full px-4 py-1">
              <Text className="text-cyan text-xs font-bold uppercase tracking-wide">{profile.favoritePromotion}</Text>
            </View>
          )}

          {/* Follow button */}
          {!isMe && (
            <TouchableOpacity
              onPress={toggleFollow}
              disabled={followLoading}
              style={{ marginTop: 14, minWidth: 140 }}
              className={`py-2.5 rounded-xl border items-center ${
                following ? "border-yellow bg-yellow/10" : "bg-yellow border-yellow"
              }`}
            >
              {followLoading ? (
                <ActivityIndicator size="small" color={following ? "#F5C518" : "#000"} />
              ) : (
                <Text className={`text-sm font-black uppercase tracking-wide ${following ? "text-yellow" : "text-black"}`}>
                  {following ? "Following" : "Follow"}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Stats row */}
      <View className="flex-row mx-4 mb-5 bg-surface border border-border rounded-xl overflow-hidden" style={{ marginTop: -8 }}>
        <View className="flex-1 items-center py-3.5 border-r border-border">
          <Text className="text-white font-black text-lg">{profile.reviewCount}</Text>
          <Text className="text-muted text-[10px] uppercase tracking-wide">Reviews</Text>
        </View>
        <View className="flex-1 items-center py-3.5 border-r border-border">
          <Text className="text-white font-black text-lg">{profile.followersCount}</Text>
          <Text className="text-muted text-[10px] uppercase tracking-wide">Followers</Text>
        </View>
        <View className="flex-1 items-center py-3.5">
          <Text className="text-white font-black text-lg">{profile.followingCount}</Text>
          <Text className="text-muted text-[10px] uppercase tracking-wide">Following</Text>
        </View>
      </View>

      {/* Reviews */}
      <View className="px-4 pb-10">
        <Text className="text-muted text-xs uppercase tracking-wider font-bold mb-3">Reviews</Text>
        {profile.reviews.length === 0 ? (
          <Text className="text-muted text-sm">No reviews yet.</Text>
        ) : (
          profile.reviews.map((review) => (
            <TouchableOpacity
              key={review.id}
              onPress={() => router.push(`/events/${review.event.slug}`)}
              className="bg-surface border border-border rounded-xl p-4 mb-3"
            >
              <View className="flex-row items-center mb-2">
                {review.event.posterUrl ? (
                  <Image
                    source={{ uri: review.event.posterUrl }}
                    style={{ width: 44, height: 60, borderRadius: 6 }}
                    contentFit="cover"
                  />
                ) : (
                  <View className="w-11 rounded-md bg-subtle" style={{ height: 60 }} />
                )}
                <View className="flex-1 ml-3">
                  <View className="bg-cyan/20 border border-cyan/30 rounded px-1.5 py-0.5 self-start mb-1">
                    <Text className="text-cyan text-[9px] font-bold uppercase">
                      {review.event.promotion}
                    </Text>
                  </View>
                  <Text className="text-white font-bold text-sm leading-snug" numberOfLines={2}>
                    {review.event.title}
                  </Text>
                  <View className="flex-row items-center mt-1 gap-2">
                    <Text className="text-yellow text-xs font-bold">★ {review.rating.toFixed(1)}</Text>
                    <Text className="text-muted text-[10px]">{timeAgo(review.createdAt)}</Text>
                  </View>
                </View>
              </View>
              {review.comment && (
                <Text className="text-muted text-sm leading-relaxed" numberOfLines={3}>
                  "{review.comment}"
                </Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}
