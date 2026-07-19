import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SHADOW } from '../../constants/theme';

const MOCK_WEATHER = {
  city: 'Pune',
  temp: 28,
  feelsLike: 31,
  humidity: 65,
  windSpeed: 14,
  condition: 'Partly Cloudy',
  icon: 'partly-sunny',
  forecast: [
    { day: 'Mon', icon: 'sunny', high: 30, low: 22 },
    { day: 'Tue', icon: 'rainy', high: 26, low: 20 },
    { day: 'Wed', icon: 'cloudy', high: 24, low: 19 },
    { day: 'Thu', icon: 'sunny', high: 31, low: 23 },
    { day: 'Fri', icon: 'thunderstorm', high: 25, low: 18 },
  ],
};

const WeatherIcon = ({ icon, size = 32, color = COLORS.primary }) => (
  <Ionicons name={icon + '-outline'} size={size} color={color} />
);

export default function WeatherCenter() {
  const [city, setCity] = useState('Pune');
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState(MOCK_WEATHER);

  const fetchWeather = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setWeather({ ...MOCK_WEATHER, city });
      setLoading(false);
    }, 1000);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <LinearGradient colors={['#0f172a', '#1e3a5f', '#0c4a6e']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Search */}
          <View style={styles.searchRow}>
            <View style={styles.searchWrap}>
              <Ionicons name="location-outline" size={18} color="rgba(255,255,255,0.6)" style={{ paddingLeft: 12 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Enter city..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={city}
                onChangeText={setCity}
                onSubmitEditing={fetchWeather}
              />
            </View>
            <TouchableOpacity style={styles.searchBtn} onPress={fetchWeather}>
              <Ionicons name="search" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color="#fff" style={{ marginTop: 60 }} size="large" />
          ) : (
            <>
              {/* Main card */}
              <View style={styles.mainCard}>
                <Text style={styles.cityName}>{weather.city}</Text>
                <Ionicons name={weather.icon + '-outline'} size={80} color="#fbbf24" style={{ marginVertical: 8 }} />
                <Text style={styles.temp}>{weather.temp}°C</Text>
                <Text style={styles.condition}>{weather.condition}</Text>

                <View style={styles.detailsRow}>
                  <WeatherDetail icon="water-outline" label="Humidity" value={`${weather.humidity}%`} />
                  <WeatherDetail icon="thermometer-outline" label="Feels Like" value={`${weather.feelsLike}°C`} />
                  <WeatherDetail icon="speedometer-outline" label="Wind" value={`${weather.windSpeed} km/h`} />
                </View>
              </View>

              {/* Forecast */}
              <Text style={styles.forecastTitle}>5-Day Forecast</Text>
              <View style={styles.forecastRow}>
                {weather.forecast.map((f, i) => (
                  <View key={i} style={styles.forecastCard}>
                    <Text style={styles.forecastDay}>{f.day}</Text>
                    <Ionicons name={f.icon + '-outline'} size={22} color="#fbbf24" style={{ marginVertical: 6 }} />
                    <Text style={styles.forecastHigh}>{f.high}°</Text>
                    <Text style={styles.forecastLow}>{f.low}°</Text>
                  </View>
                ))}
              </View>

              {/* Agri tip */}
              <View style={styles.tipCard}>
                <Ionicons name="leaf-outline" size={20} color="#4ade80" />
                <Text style={styles.tipText}>
                  Humidity at {weather.humidity}% — ideal conditions for irrigation. Consider watering in the evening to minimize evaporation.
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

function WeatherDetail({ icon, label, value }) {
  return (
    <View style={styles.detail}>
      <Ionicons name={icon} size={18} color="rgba(255,255,255,0.6)" />
      <Text style={styles.detailValue}>{value}</Text>
      <Text style={styles.detailLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 40 },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  searchWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  searchInput: { flex: 1, padding: 12, color: '#fff', fontSize: 14 },
  searchBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    width: 48, alignItems: 'center', justifyContent: 'center',
  },
  mainCard: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    padding: 24, alignItems: 'center', marginBottom: 24,
  },
  cityName: { color: 'rgba(255,255,255,0.7)', fontSize: 18, fontWeight: '600' },
  temp: { color: '#fff', fontSize: 64, fontWeight: '800', letterSpacing: -2 },
  condition: { color: 'rgba(255,255,255,0.6)', fontSize: 16, marginBottom: 20 },
  detailsRow: { flexDirection: 'row', gap: 20, marginTop: 8 },
  detail: { alignItems: 'center', gap: 4 },
  detailValue: { color: '#fff', fontSize: 15, fontWeight: '700' },
  detailLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
  forecastTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  forecastRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  forecastCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: RADIUS.md,
    padding: 10, alignItems: 'center',
  },
  forecastDay: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600' },
  forecastHigh: { color: '#fff', fontSize: 14, fontWeight: '700' },
  forecastLow: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  tipCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: 'rgba(74,222,128,0.1)', borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: 'rgba(74,222,128,0.2)', padding: 14,
  },
  tipText: { flex: 1, color: 'rgba(255,255,255,0.8)', fontSize: 13, lineHeight: 20 },
});
