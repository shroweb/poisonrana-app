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
import { Image } from "expo-image";
import { api } from "@/lib/api";
import { LeaderboardUser, ApiResponse } from "@/lib/types";
import { useAuth } from "@/store/auth";

function SkeletonRow() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#1F2937" }}>
      <View style={{ width: 28, alignItems: "center", marginRight: 12 }}>
        <View style={{ width: 20, height: 14, backgroundColor: "#1F2937", borderRadius: 4 }} />
      </View>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#1F2937", marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <View style={{ height: 12, backgroundColor: "#1F2937", borderRadius: 3, width: "60%", marginBottom: 5 }} />
        <View style={{ height: 10, backgroundColor: "#1F2937", borderRadius: 3, width: "40%" }} />
      </View>
      <View style={{ width: 32, height: 20, backgroundColor: "#1F2937", borderRadius: 4 }} />
    </View>
  );
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const { user: me } = useAuth();
  const [users, setUsers] = useState<(LeaderboardUser & { isMe?: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchLeaderboard() {
    try {
      const res = await api.get<ApiResponse<(LeaderboardUser & { isMe?: boolean })[]>>("/leaderboard/users", { limit: 100 });
      setUsers(res.data ?? []);
    } catch {}
  }

  useEffect(() => {
    setLoading(true);
    fetchLeaderboard().finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLeaderboard();
    setRefreshing(false);
  }, []);

  const myRank = users.findIndex((u) => u.isMe) + 1;

  return (
    <View style={{ flex: 1, backgroundColor: "#0B1120" }}>
      <FlatList
        data={loading ? [] : users}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F5C518" />}
        ListHeaderComponent={
          <View style={{ paddingTop: 20, paddingHorizontal: 16, paddingBottom: 4 }}>
            {/* Badge */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(245,197,24,0.12)", borderWidth: 1, borderColor: "rgba(245,197,24,0.3)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start", marginBottom: 10 }}>
              <Ionicons name="trophy" size={11} color="#F5C518" />
              <Text style={{ color: "#F5C518", fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1 }}>Community Rankings</Text>
            </View>

            <Text style={{ color: "#FFFFFF", fontSize: 32, fontWeight: "900", fontStyle: "italic", lineHeight: 36, marginBottom: 8 }}>
              {"LEADER\nBOARD"}
            </Text>
            <Text style={{ color: "#6B7280", fontSize: 13, lineHeight: 18, marginBottom: 4 }}>
              Score = reviews ×3 + predictions + match ratings
            </Text>

            {/* My rank card */}
            {me && myRank > 0 && (
              <View style={{ backgroundColor: "rgba(245,197,24,0.08)", borderWidth: 1, borderColor: "rgba(245,197,24,0.25)", borderRadius: 12, padding: 14, marginTop: 16, marginBottom: 8, flexDirection: "row", alignItems: "center" }}>
                <Text style={{ color: "#F5C518", fontWeight: "900", fontSize: 22, width: 50, textAlign: "center" }}>#{myRank}</Text>
                <Text style={{ color: "#F5C518", fontSize: 13, fontWeight: "700", flex: 1 }}>Your rank</Text>
                <Text style={{ color: "#6B7280", fontSize: 11 }}>{users[myRank - 1]?.score ?? 0} pts</Text>
              </View>
            )}

            {/* Column headers */}
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 0, paddingVertical: 10, marginTop: 8, borderBottomWidth: 1, borderBottomColor: "#1F2937" }}>
              <Text style={{ color: "#6B7280", fontSize: 10, fontWeight: "700", textTransform: "uppercase", width: 40, textAlign: "center" }}>#</Text>
              <Text style={{ color: "#6B7280", fontSize: 10, fontWeight: "700", textTransform: "uppercase", flex: 1, marginLeft: 52 }}>User</Text>
              <Text style={{ color: "#6B7280", fontSize: 10, fontWeight: "700", textTransform: "uppercase" }}>Score</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View>
              {Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)}
            </View>
          ) : (
            <View style={{ alignItems: "center", marginTop: 40 }}>
              <Text style={{ color: "#6B7280" }}>No rankings yet.</Text>
            </View>
          )
        }
        renderItem={({ item, index }) => {
          const rank = index + 1;
          const isTop3 = rank <= 3;
          const isMe = item.isMe;
          const medalColors = ["#F5C518", "#C0C0C0", "#CD7F32"];

          return (
            <TouchableOpacity
              onPress={() => item.slug && router.push(`/users/${item.slug}`)}
              activeOpacity={0.8}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: "#1F2937",
                backgroundColor: isMe ? "rgba(245,197,24,0.06)" : "transparent",
              }}
            >
              {/* Rank */}
              <View style={{ width: 40, alignItems: "center" }}>
                {isTop3 ? (
                  <Ionicons name="trophy" size={16} color={medalColors[rank - 1]} />
                ) : (
                  <Text style={{ color: "#6B7280", fontWeight: "700", fontSize: 13 }}>{rank}</Text>
                )}
              </View>

              {/* Avatar */}
              <View style={{ width: 40, height: 40, borderRadius: 20, overflow: "hidden", marginRight: 12, backgroundColor: "#1F2937", borderWidth: isMe ? 2 : 0, borderColor: "#F5C518" }}>
                {item.avatarUrl ? (
                  <Image source={{ uri: item.avatarUrl }} style={{ width: 40, height: 40 }} contentFit="cover" />
                ) : (
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F5C518" }}>
                    <Text style={{ color: "#000", fontWeight: "900", fontSize: 14 }}>
                      {(item.name ?? "").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              {/* Name + stats */}
              <View style={{ flex: 1 }}>
                <Text style={{ color: isMe ? "#F5C518" : "#FFFFFF", fontWeight: "700", fontSize: 14 }} numberOfLines={1}>
                  {item.name}
                  {isMe ? " (you)" : ""}
                </Text>
                <Text style={{ color: "#6B7280", fontSize: 11, marginTop: 1 }}>
                  {item.reviewCount}r · {item.ratingCount}m · {item.predictionScore}p
                </Text>
              </View>

              {/* Score */}
              <Text style={{ color: isTop3 ? medalColors[rank - 1] : "#9CA3AF", fontWeight: "900", fontSize: 16 }}>
                {item.score}
              </Text>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={{ paddingBottom: 32 }}
      />
    </View>
  );
}
