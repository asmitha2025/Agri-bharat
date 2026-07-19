import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ErrorBoundary from '../components/ErrorBoundary';

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }} />
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
