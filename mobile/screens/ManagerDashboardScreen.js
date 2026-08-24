import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Dimensions, Alert,
} from "react-native";
import { BarChart, LineChart } from "react-native-chart-kit";
import { colors } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { dashboardApi, inspectionApi } from "../services/api";
import StatCard from "../components/StatCard";

const screenWidth = Dimensions.get("window").width - 40;

const chartConfig = {
  backgroundGradientFrom: "#fff",
  backgroundGradientTo: "#fff",
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
  propsForDots: { r: "3" },
  barPercentage: 0.6,
};

export default function ManagerDashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [workflowStatus, setWorkflowStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    try {
      const [statsRes, workflowRes] = await Promise.all([
        dashboardApi.statistics(),
        dashboardApi.workflowStatus(),
      ]);
      setStats(statsRes.data);
      setWorkflowStatus(workflowRes.data);
      setLoadError("");
    } catch (e) {
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail || e?.message || "Unknown dashboard error";
      setLoadError(detail);

      if (status === 401 || status === 403) {
        Alert.alert(
          "Session expired",
          "Your session is no longer valid. Please sign in again.",
          [{ text: "OK", onPress: async () => { await logout(); navigation.replace("Login"); } }]
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [logout, navigation]);

  useEffect(() => {
    load();
    const unsub = navigation.addListener("focus", load);
    return unsub;
  }, [navigation, load]);

  const handleLogout = async () => {
    await logout();
    navigation.replace("Login");
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  if (!stats) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Could not load dashboard data.</Text>
        {loadError ? (
          <Text style={{ color: colors.red || "#ef4444", textAlign: "center", paddingHorizontal: 24 }}>
            {loadError}
          </Text>
        ) : null}
      </View>
    );
  }

  const trendLabels = stats.trend_last_7_days.map((t) => t.date.slice(5));
  const trendDefects = stats.trend_last_7_days.map((t) => t.defects);
  const breakdownEntries = Object.entries(stats.defect_breakdown || {});
  const pendingCount = workflowStatus?.summary?.pending_manager_review || 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name?.split(" ")[0] || "Manager"}</Text>
          <Text style={styles.role}>Production Manager</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logout}>Logout</Text>
        </TouchableOpacity>
      </View>

      {stats.alerts?.length > 0 && (
        <View style={styles.alertsBox}>
          {stats.alerts.map((a, idx) => (
            <Text key={idx} style={styles.alertText}>⚠ {a}</Text>
          ))}
        </View>
      )}

      {/* Workflow Status Section */}
      {workflowStatus && (
        <TouchableOpacity
          style={styles.workflowCard}
          onPress={() => navigation.navigate("ManagerPending")}
        >
          <View style={styles.workflowHeader}>
            <Text style={styles.workflowTitle}>Pending Reviews</Text>
            {pendingCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingCount}</Text>
              </View>
            )}
          </View>
          <Text style={styles.workflowSubtitle}>
            {pendingCount === 0
              ? "No pending inspections"
              : `${pendingCount} inspection${pendingCount > 1 ? "s" : ""} awaiting your decision`}
          </Text>
          <View style={styles.workflowStats}>
            {workflowStatus.summary && (
              <>
                <View style={styles.workflowStat}>
                  <Text style={styles.workflowStatLabel}>Rework</Text>
                  <Text style={styles.workflowStatValue}>{workflowStatus.summary.rework_required}</Text>
                </View>
                <View style={styles.workflowStat}>
                  <Text style={styles.workflowStatLabel}>Approved</Text>
                  <Text style={styles.workflowStatValue}>{workflowStatus.summary.approved_for_production}</Text>
                </View>
                <View style={styles.workflowStat}>
                  <Text style={styles.workflowStatLabel}>Rejected</Text>
                  <Text style={styles.workflowStatValue}>{workflowStatus.summary.rejected}</Text>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.statsGrid}>
        <StatCard label="Total Inspected" value={stats.total_inspected} />
        <StatCard label="Total Defects" value={stats.total_defects} accentColor={colors.danger} />
        <StatCard label="Defect Rate" value={`${stats.defect_percentage}%`} accentColor={colors.warning} />
        <StatCard label="Efficiency" value={`${stats.production_efficiency}%`} accentColor={colors.success} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Estimated Waste</Text>
        <Text style={styles.wasteValue}>{stats.estimated_waste_percentage}%</Text>
        <Text style={styles.wasteHelper}>of total production, based on defect severity weighting</Text>
      </View>

      {trendDefects.some((v) => v > 0) && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Defect Trend (Last 7 Days)</Text>
          <LineChart
            data={{ labels: trendLabels, datasets: [{ data: trendDefects }] }}
            width={screenWidth}
            height={180}
            chartConfig={chartConfig}
            bezier
            style={{ borderRadius: 12, marginTop: 8 }}
          />
        </View>
      )}

      {breakdownEntries.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Defect Breakdown</Text>
          <BarChart
            data={{
              labels: breakdownEntries.map(([k]) => k.replace("_", " ").slice(0, 8)),
              datasets: [{ data: breakdownEntries.map(([, v]) => v) }],
            }}
            width={screenWidth}
            height={200}
            chartConfig={chartConfig}
            style={{ borderRadius: 12, marginTop: 8 }}
            fromZero
            yAxisLabel=""
            yAxisSuffix=""
          />
        </View>
      )}

      <TouchableOpacity style={styles.reportButton} onPress={() => dashboardApi.generateReport()}>
        <Text style={styles.reportButtonText}>Generate Report Snapshot</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgLight, padding: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bgLight },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, marginBottom: 16 },
  greeting: { fontSize: 20, fontWeight: "800", color: colors.textPrimary },
  role: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  logout: { color: colors.danger, fontWeight: "600", fontSize: 13 },
  alertsBox: { backgroundColor: "#FEF3C7", borderRadius: 12, padding: 14, marginBottom: 16 },
  alertText: { color: "#92400E", fontSize: 12, fontWeight: "600", marginBottom: 4 },
  workflowCard: { backgroundColor: colors.primary, borderRadius: 14, padding: 16, marginBottom: 16, overflow: "hidden" },
  workflowHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  workflowTitle: { fontSize: 16, fontWeight: "700", color: "#fff" },
  badge: { backgroundColor: "rgba(255, 255, 255, 0.3)", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  workflowSubtitle: { color: "rgba(255, 255, 255, 0.9)", fontSize: 13, marginBottom: 12 },
  workflowStats: { flexDirection: "row", gap: 12 },
  workflowStat: { flex: 1, backgroundColor: "rgba(255, 255, 255, 0.15)", borderRadius: 8, padding: 8, alignItems: "center" },
  workflowStatLabel: { color: "rgba(255, 255, 255, 0.8)", fontSize: 11, marginBottom: 4 },
  workflowStatValue: { color: "#fff", fontSize: 16, fontWeight: "700" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 16 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 14, fontWeight: "800", color: colors.textPrimary },
  wasteValue: { fontSize: 32, fontWeight: "800", color: colors.warning, marginTop: 8 },
  wasteHelper: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  reportButton: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 15, alignItems: "center", marginBottom: 30 },
  reportButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
