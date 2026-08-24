import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { colors, severityColor } from "../theme/colors";
import { inspectionApi } from "../services/api";

export default function HistoryScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await inspectionApi.history();
      setItems(res.data.inspections);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 20 }}
      data={items}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      ListHeaderComponent={<Text style={styles.heading}>Inspection History</Text>}
      ListEmptyComponent={<Text style={styles.empty}>No inspections recorded yet.</Text>}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate("Result", { inspection: item })}
        >
          <View style={[styles.dot, { backgroundColor: severityColor(item.overall_severity) }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>
              {item.defect_free ? "No defects" : `${item.defects.length} defect(s) · ${item.overall_severity.toUpperCase()}`}
            </Text>
            <Text style={styles.date}>{new Date(item.created_at).toLocaleString()}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgLight },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bgLight },
  heading: { fontSize: 22, fontWeight: "800", color: colors.textPrimary, marginBottom: 16 },
  empty: { color: colors.textSecondary, fontSize: 13, textAlign: "center", marginTop: 40 },
  card: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12,
    padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  title: { fontWeight: "700", fontSize: 13, color: colors.textPrimary },
  date: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  chevron: { fontSize: 22, color: colors.textSecondary, fontWeight: "300" },
});
