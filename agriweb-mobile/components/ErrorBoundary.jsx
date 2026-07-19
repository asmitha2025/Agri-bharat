import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('App Error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>⚠️ App Error</Text>
          <Text style={styles.subtitle}>Something went wrong. Please report this:</Text>
          <ScrollView style={styles.scroll}>
            <Text style={styles.error}>
              {this.state.error?.toString?.() || 'Unknown error'}
            </Text>
            <Text style={styles.stack}>
              {this.state.error?.stack || ''}
            </Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20, paddingTop: 60 },
  title: { color: '#f87171', fontSize: 22, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: '#94a3b8', fontSize: 14, marginBottom: 16 },
  scroll: { flex: 1 },
  error: { color: '#fbbf24', fontSize: 13, fontWeight: '700', marginBottom: 12 },
  stack: { color: '#64748b', fontSize: 11, lineHeight: 18 },
});
