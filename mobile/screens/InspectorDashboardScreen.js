import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  RefreshControl, ActivityIndicator,
} from "react-native";
import { colors, severityColor } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { inspectionApi } from "../services/api";

export default function InspectorDashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      const res = await inspectionApi.history();
      setRecent(res.data.inspections.slice(0, 5));
    } catch (e) {
      // silent fail on dashboard preview
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
    const unsub = navigation.addListener("focus", loadHistory);
    return unsub;
  }, [navigation, loadHistory]);

  const totalToday = recent.filter(
    (r) => r.created_at?.slice(0, 10) === new Date().toISOString().slice(0, 10)
  ).length;
  const defectiveToday = recent.filter(
    (r) => !r.defect_free && r.created_at?.slice(0, 10) === new Date().toISOString().slice(0, 10)
  ).length;

  const handleLogout = async () => {
    await logout();
    navigation.replace("Login");
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadHistory(); }} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name?.split(" ")[0] || "Inspector"}</Text>
          <Text style={styles.role}>Quality Inspector</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logout}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{totalToday}</Text>
          <Text style={styles.statLabel}>Inspected Today</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: colors.danger }]}>{defectiveToday}</Text>
          <Text style={styles.statLabel}>Defects Today</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.primaryAction} onPress={() => navigation.navigate("CameraUpload")}>
        <Text style={styles.primaryActionIcon}>📷</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.primaryActionTitle}>New Fabric Inspection</Text>
          <Text style={styles.primaryActionDesc}>Capture or upload an image for AI analysis</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryAction} onPress={() => navigation.navigate("History")}>
        <Text style={styles.secondaryActionText}>View Inspection History</Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Recent Inspections</Text>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
      ) : recent.length === 0 ? (
        <Text style={styles.empty}>No inspections yet. Start your first scan above.</Text>
      ) : (
        recent.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.recentCard}
            onPress={() => navigation.navigate("Result", { inspection: item })}
          >
            <View style={[styles.severityDot, { backgroundColor: severityColor(item.overall_severity) }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.recentTitle}>
                {item.defect_free ? "No defects found" : `${item.defects.length} defect(s) detected`}
              </Text>
              <Text style={styles.recentDate}>{new Date(item.created_at).toLocaleString()}</Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgLight, padding: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, marginBottom: 20 },
  greeting: { fontSize: 20, fontWeight: "800", color: colors.textPrimary },
  role: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  logout: { color: colors.danger, fontWeight: "600", fontSize: 13 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border },
  statValue: { fontSize: 26, fontWeight: "800", color: colors.textPrimary },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4, fontWeight: "600" },
  primaryAction: {
    backgroundColor: colors.primary, borderRadius: 16, padding: 18,
    flexDirection: "row", alignItems: "center", marginBottom: 12,
  },
  primaryActionIcon: { fontSize: 28, marginRight: 14 },
  primaryActionTitle: { color: "#fff", fontWeight: "800", fontSize: 16 },
  primaryActionDesc: { color: "#DBEAFE", fontSize: 12, marginTop: 2 },
  chevron: { color: "#fff", fontSize: 24, fontWeight: "300" },
  secondaryAction: {
    backgroundColor: "#fff", borderRadius: 14, padding: 16, flexDirection: "row",
    alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: colors.border, marginBottom: 24,
  },
  secondaryActionText: { fontWeight: "700", color: colors.textPrimary, fontSize: 14 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: colors.textPrimary, marginBottom: 12 },
  empty: { color: colors.textSecondary, fontSize: 13, marginBottom: 30 },
  recentCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12,
    padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border,
  },
  severityDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  recentTitle: { fontWeight: "700", fontSize: 13, color: colors.textPrimary },
  recentDate: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
});
