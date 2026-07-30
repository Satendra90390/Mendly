import { Platform } from "react-native";
import Constants from "expo-constants";

const DEV_API = Platform.OS === "android"
  ? "http://10.0.2.2:8002/api"
  : "http://localhost:8002/api";

const PROD_API = "https://mendly-backend-0vyg.onrender.com/api";

export const API_BASE = __DEV__ ? DEV_API : PROD_API;

export const IS_WEB = Platform.OS === "web";
