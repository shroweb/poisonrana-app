import { TextInput, View, Text, TextInputProps } from "react-native";

interface Props extends TextInputProps {
  label?: string;
  error?: string;
}

export default function Input({ label, error, ...props }: Props) {
  return (
    <View className="mb-4">
      {label && (
        <Text className="text-muted text-xs uppercase tracking-wider mb-1.5 font-semibold">
          {label}
        </Text>
      )}
      <TextInput
        {...props}
        placeholderTextColor="#6B7280"
        className={`
          bg-surface border rounded-xl px-4 py-3.5 text-white text-sm
          ${error ? "border-red-500" : "border-border"}
        `}
      />
      {error && (
        <Text className="text-red-500 text-xs mt-1">{error}</Text>
      )}
    </View>
  );
}
