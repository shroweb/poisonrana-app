import { TouchableOpacity, Text, ActivityIndicator } from "react-native";

interface Props {
  label: string;
  onPress: () => void;
  variant?: "yellow" | "cyan" | "outline" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

const variants = {
  yellow: "bg-yellow",
  cyan: "bg-cyan",
  outline: "border border-border bg-transparent",
  ghost: "bg-transparent",
};

const textVariants = {
  yellow: "text-black font-bold",
  cyan: "text-black font-bold",
  outline: "text-white font-semibold",
  ghost: "text-muted font-semibold",
};

export default function Button({
  label,
  onPress,
  variant = "yellow",
  loading = false,
  disabled = false,
  fullWidth = false,
}: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      className={`
        ${variants[variant]}
        ${fullWidth ? "w-full" : ""}
        px-5 py-3.5 rounded-xl items-center justify-center flex-row
        ${disabled || loading ? "opacity-50" : ""}
      `}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "yellow" || variant === "cyan" ? "#000" : "#fff"}
        />
      ) : (
        <Text className={`${textVariants[variant]} text-sm uppercase tracking-wider`}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}
