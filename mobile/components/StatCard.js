import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

export default function StatCard({ label, value, accentColor }) {
  return (
    <View style={styles.card}>
      <Text style={[styles.value, { color: accentColor || colors.primary }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    flex: 1,
    minWidth: "45%",
    borderWidth: 1,
    borderColor: colors.border,
  },
  value: { fontSize: 24, fontWeight: "800" },
  label: { fontSize: 12, color: colors.textSecondary, marginTop: 4, fontWeight: "600" },
});
