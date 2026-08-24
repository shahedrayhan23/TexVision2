import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { severityColor } from "../theme/colors";

const LABELS = {
  hole: "Hole",
  stain: "Stain",
  slub: "Slub",
  broken_yarn: "Broken Yarn",
  color_variation: "Color Variation",
};

export default function DefectBadge({ defect }) {
  const color = severityColor(defect.severity);
  return (
    <View style={[styles.badge, { borderColor: color, backgroundColor: color + "15" }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>
        {LABELS[defect.defect_type] || defect.defect_type}
      </Text>
      <Text style={[styles.severity, { color }]}>{defect.severity.toUpperCase()}</Text>
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
    marginBottom: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  text: { flex: 1, fontWeight: "600", fontSize: 13 },
  severity: { fontSize: 11, fontWeight: "800" },
});