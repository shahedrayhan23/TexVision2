import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, SectionList,
} from "react-native";
import { colors, severityColor } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { inspectionApi } from "../services/api";

export default function ManagerPendingScreen({ navigation }) {
  const { user } = useAuth();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPending = useCallback(async () => {
    try {
      const res = await inspectionApi.getPendingForManager();
      setPending(res.data.inspections || []);
    } catch (e) {
      Alert.alert("Error", "Failed to load pending inspections");
      console.error("Error loading pending:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPending();
    const unsub = navigation.addListener("focus", loadPending);
    return unsub;
  }, [navigation, loadPending]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Pending Reviews</Text>
        </View>
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 40 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pending Reviews</Text>
        <Text style={styles.pendingCount}>{pending.length} pending</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPending(); }} />
        }
      >
        {pending.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>✓</Text>
            <Text style={styles.emptyStateTitle}>All caught up!</Text>
            <Text style={styles.emptyStateText}>No pending inspections awaiting your review.</Text>
          </View>
        ) : (
          pending.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.inspectionCard}
              onPress={() => navigation.navigate("ManagerReview", { inspection: item })}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>
                    {item.inspector_name || "Unknown Inspector"}
                  </Text>
                  <Text style={styles.cardId}>ID: {item.id.slice(0, 8)}</Text>
                </View>
                <View style={[styles.severityBadge, { backgroundColor: severityColor(item.overall_severity) }]}>
                  <Text style={styles.severityText}>
                    {item.overall_severity?.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.cardContent}>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Defects:</Text>
                  <Text style={styles.metaValue}>{(item.defects || []).length}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Recommendation:</Text>
                  <Text style={[styles.metaValue, { color: _getRecommendationColor(item.ai_recommendation) }]}>
                    {item.ai_recommendation?.toUpperCase() || "N/A"}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Submitted:</Text>
                  <Text style={styles.metaValue}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={styles.reviewButton}>
                <Text style={styles.reviewButtonText}>Review & Decide</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function _getRecommendationColor(recommendation) {
  switch (recommendation) {
    case "approve":
      return colors.success;
    case "rework":
      return colors.warning;
    case "reject":
      return colors.danger;
    default:
      return colors.textSecondary;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 40,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  pendingCount: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 80,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
  },
  inspectionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  cardId: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  severityBadge: {
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  severityText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  cardContent: {
    padding: 16,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  reviewButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 12,
  },
  reviewButtonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
    fontSize: 14,
  },
});
