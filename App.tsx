import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Pressable, SafeAreaView, Text, View } from 'react-native';
import { apiFetch, clearToken, getToken } from './src/api';
import type { Appointment } from './src/types';
import AppointmentsPage from './src/pages/AppointmentsPage';
import DiscoverPage from './src/pages/DiscoverPage';
import LoginPage from './src/pages/LoginPage';
import ProfilePage from './src/pages/ProfilePage';
import styles from './App.styles';

type Tab = 'discover' | 'appointments' | 'profile';

export default function App() {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  const handleLogout = async () => {
    await clearToken();
    setAuthenticated(false);
  };

  useEffect(() => {
    getToken().then((token) => {
      setAuthenticated(Boolean(token));
      setReady(true);
    });
  }, []);

  if (!ready) {
    return <View style={styles.loader}><ActivityIndicator color="#9f7b64" size="large" /></View>;
  }

  return <>
    {authenticated
      ? <CustomerApp onLogout={handleLogout} />
      : <LoginPage onSuccess={() => setAuthenticated(true)} />}
    <StatusBar style="dark" />
  </>;
}

function CustomerApp({ onLogout }: { onLogout: () => Promise<void> | void }) {
  const [tab, setTab] = useState<Tab>('discover');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const loadAppointments = () => apiFetch<Appointment[]>('/api/mobile/appointments').then(setAppointments).catch(() => undefined);

  useEffect(() => {
    loadAppointments();
  }, []);

  const pageTitle = tab === 'discover'
    ? 'Prenota il tuo momento'
    : tab === 'appointments'
      ? 'I tuoi appuntamenti'
      : 'Il tuo profilo';

  return <SafeAreaView style={styles.screen}>
    <View style={styles.appHeader}>
      <View style={styles.headerTitleWrap}>
        <Text style={styles.headerLogo}>kali</Text>
        <Text style={styles.headerSubtitle}>{pageTitle}</Text>
      </View>
      <Pressable style={styles.headerLogoutButton} onPress={onLogout}>
        <Text style={styles.headerLogoutText}>Esci</Text>
      </Pressable>
    </View>
    <View style={styles.grow}>
      {tab === 'discover' && <DiscoverPage onBooked={() => { loadAppointments(); setTab('appointments'); }} />}
      {tab === 'appointments' && <AppointmentsPage appointments={appointments} reload={loadAppointments} />}
      {tab === 'profile' && <ProfilePage onLogout={onLogout} />}
    </View>
    <View style={styles.tabBar}>
      <TabButton label="Scopri" active={tab === 'discover'} onPress={() => setTab('discover')} />
      <TabButton label="I miei" active={tab === 'appointments'} onPress={() => setTab('appointments')} />
      <TabButton label="Profilo" active={tab === 'profile'} onPress={() => setTab('profile')} />
    </View>
  </SafeAreaView>;
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={styles.tabButton}>
    <View style={[styles.tabDot, active && styles.tabDotActive]} />
    <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
  </Pressable>;
}
