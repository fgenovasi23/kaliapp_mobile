import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View, Alert } from 'react-native';
import { apiFetch, getApiUrl, saveApiUrl } from '../api';
import type { Profile } from '../types';
import showError from '../utils/showError';
import styles from './ProfilePage.styles';

export default function ProfilePage({ onLogout }: { onLogout: () => Promise<void> | void }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [apiUrl, setApiUrl] = useState('');

  useEffect(() => {
    apiFetch<Profile>('/api/mobile/me').then(setProfile).catch(showError);
    getApiUrl().then(setApiUrl);
  }, []);

  return <ScrollView contentContainerStyle={styles.content}>
    {profile && <View style={styles.profileCard}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{profile.first_name[0]}{profile.last_name[0]}</Text></View>
      <Text style={styles.profileName}>{profile.first_name} {profile.last_name}</Text>
      <Text style={styles.muted}>{profile.email}</Text>
      {Boolean(profile.phone) && <Text style={styles.muted}>{profile.phone}</Text>}
    </View>}
    <View style={styles.serverBox}>
      <Text style={styles.fieldLabel}>INDIRIZZO BACKEND</Text>
      <TextInput style={styles.input} value={apiUrl} onChangeText={setApiUrl} autoCapitalize="none" />
      <Pressable style={styles.textButton} onPress={() => saveApiUrl(apiUrl).then(() => Alert.alert('Salvato', 'Il nuovo server sarÃ  usato per le prossime richieste.'))}>
        <Text style={styles.textButtonLabel}>Aggiorna server</Text>
      </Pressable>
    </View>
    <Pressable style={styles.logoutButton} onPress={() => { void onLogout(); }}>
      <Text style={styles.logoutText}>Esci dall'account</Text>
    </Pressable>
  </ScrollView>;
}