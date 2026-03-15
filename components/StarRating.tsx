import { View, Text, TouchableOpacity } from "react-native";

interface Props {
  value: number;
  onChange?: (rating: number) => void;
  size?: "sm" | "md" | "lg";
  readonly?: boolean;
}

const sizes = { sm: 16, md: 22, lg: 30 };

export default function StarRating({
  value,
  onChange,
  size = "md",
  readonly = false,
}: Props) {
  const starSize = sizes[size];
  const stars = [1, 2, 3, 4, 5];

  return (
    <View className="flex-row">
      {stars.map((star) => {
        const filled = value >= star;
        const half = !filled && value >= star - 0.5;

        return (
          <TouchableOpacity
            key={star}
            disabled={readonly}
            onPress={() => onChange?.(star)}
            onLongPress={() => onChange?.(star - 0.5)}
            activeOpacity={0.7}
          >
            <Text
              style={{ fontSize: starSize, color: filled || half ? "#F5C518" : "#374151" }}
            >
              {half ? "½" : "★"}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
