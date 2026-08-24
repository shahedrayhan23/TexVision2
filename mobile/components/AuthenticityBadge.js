import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

const CONFIG = {
  original: { label: "✓ Original Image", color: colors.success },
  ai_generated: { label: "⚠ AI-Generated Image", color: colors.danger },
  edited: { label: "⚠ Edited Image", color: colors.warning },
};

export default function AuthenticityBadge({ status }) {
  const cfg = CONFIG[status] || CONFIG.original;
  return (
    <View style={[styles.badge, { borderColor: cfg.color, backgroundColor: cfg.color + "15" }]}>
      <View style={[styles.dot, { backgroundColor: cfg.color }]} />
      <Text style={[styles.text, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  text: { fontWeight: "700", fontSize: 13 },
});