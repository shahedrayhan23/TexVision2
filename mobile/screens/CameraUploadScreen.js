import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { colors } from "../theme/colors";
import { inspectionApi } from "../services/api";

export default function CameraUploadScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  const [mode, setMode] = useState("camera");
  const [photoUri, setPhotoUri] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
      });

      if (photo?.uri) {
        setPhotoUri(photo.uri);
        setMode("preview");
      }
    } catch (error) {
      Alert.alert("Camera Error", error?.message || "Could not capture image.");
    }
  };

  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });

      if (!result.canceled && result.assets?.length > 0) {
        setPhotoUri(result.assets[0].uri);
        setMode("preview");
      }
    } catch (error) {
      Alert.alert(
        "Gallery Error",
        error?.message || "Could not select image."
      );
    }
  };

  const analyze = async () => {
  if (!photoUri || analyzing) return;

  setAnalyzing(true);

  try {
    console.log("========== TEXVISION ANALYSIS ==========");
    console.log("PHOTO URI:", photoUri);

    const formData = new FormData();

    if (typeof window !== "undefined" && photoUri.startsWith("blob:")) {
      // Expo Web
      console.log("Platform: WEB");

      const response = await fetch(photoUri);
      const blob = await response.blob();

      console.log("BLOB SIZE:", blob.size);
      console.log("BLOB TYPE:", blob.type);

      formData.append(
        "file",
        blob,
        "fabric.jpg"
      );
    } else {
      // Android / iOS
      console.log("Platform: NATIVE");

      formData.append("file", {
        uri: photoUri,
        name: "fabric.jpg",
        type: "image/jpeg",
      });
    }

    console.log("Sending image to backend...");

    const res =
      await inspectionApi.predictDefect(formData);

    console.log("ANALYSIS SUCCESS:");
    console.log(res.data);

    navigation.replace("Result", {
      prediction: res.data,
    });

  } catch (e) {
    console.log("========== ANALYSIS ERROR ==========");
    console.log("STATUS:", e?.response?.status);
    console.log("RESPONSE:", e?.response?.data);
    console.log("MESSAGE:", e?.message);

    Alert.alert(
      "Analysis failed",
      JSON.stringify(
        e?.response?.data || {
          message: e?.message || "Unknown error",
        },
        null,
        2
      )
    );

  } finally {
    setAnalyzing(false);
  }
};

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>
          Camera access is needed to capture fabric images.
        </Text>

        <TouchableOpacity
          style={styles.permButton}
          onPress={requestPermission}
        >
          <Text style={styles.permButtonText}>
            Grant Camera Permission
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={pickFromGallery}
          style={{ marginTop: 16 }}
        >
          <Text style={styles.link}>
            Or choose from gallery instead
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (mode === "preview" && photoUri) {
    return (
      <View style={styles.previewContainer}>
        <Image
          source={{ uri: photoUri }}
          style={styles.previewImage}
        />

        {analyzing && (
          <View style={styles.analyzingOverlay}>
            <ActivityIndicator color="#fff" size="large" />

            <Text style={styles.analyzingText}>
              Running AI defect analysis...
            </Text>
          </View>
        )}

        <View style={styles.previewActions}>
          <TouchableOpacity
            style={styles.retakeButton}
            disabled={analyzing}
            onPress={() => {
              setPhotoUri(null);
              setMode("camera");
            }}
          >
            <Text style={styles.retakeText}>
              Retake
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.analyzeButton}
            disabled={analyzing}
            onPress={analyze}
          >
            <Text style={styles.analyzeText}>
              {analyzing ? "Analyzing..." : "Analyze Fabric"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <CameraView
        ref={cameraRef}
        style={styles.flex}
        facing="back"
      >
        <View style={styles.frameOverlay}>
          <View style={styles.frameBox} />

          <Text style={styles.frameHint}>
            Align fabric within the frame
          </Text>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.galleryButton}
            onPress={pickFromGallery}
          >
            <Text style={styles.galleryIcon}>
              🖼️
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.captureButton}
            onPress={takePicture}
          >
            <View style={styles.captureInner} />
          </TouchableOpacity>

          <View style={{ width: 52 }} />
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: "#000",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    backgroundColor: colors.bgLight,
  },

  permissionText: {
    textAlign: "center",
    color: colors.textPrimary,
    fontSize: 15,
    marginBottom: 20,
  },

  permButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },

  permButtonText: {
    color: "#fff",
    fontWeight: "700",
  },

  link: {
    color: colors.primary,
    fontWeight: "600",
  },

  frameOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  frameBox: {
    width: "80%",
    height: "50%",
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: 16,
    borderStyle: "dashed",
  },

  frameHint: {
    color: "#fff",
    marginTop: 16,
    fontSize: 13,
    fontWeight: "600",
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },

  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 30,
    paddingBottom: 40,
  },

  galleryButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  galleryIcon: {
    fontSize: 24,
  },

  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },

  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
  },

  previewContainer: {
    flex: 1,
    backgroundColor: "#000",
  },

  previewImage: {
    flex: 1,
    resizeMode: "cover",
  },

  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },

  analyzingText: {
    color: "#fff",
    marginTop: 14,
    fontWeight: "600",
  },

  previewActions: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    backgroundColor: "#000",
  },

  retakeButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fff",
  },

  retakeText: {
    color: "#fff",
    fontWeight: "700",
  },

  analyzeButton: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    backgroundColor: colors.primary,
  },

  analyzeText: {
    color: "#fff",
    fontWeight: "700",
  },
});